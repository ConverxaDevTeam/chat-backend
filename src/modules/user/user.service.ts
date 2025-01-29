import { In, Repository } from 'typeorm';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@models/User.entity';
import * as bcrypt from 'bcrypt';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { EmailService } from '@modules/email/email.service';
import { UpdateUserDto } from './update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly emailService: EmailService,
  ) {}

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      select: {
        id: true,
        is_super_admin: true,
        userOrganizations: {
          role: true,
        },
      },
      relations: ['userOrganizations'],
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('El usuario no existe.');
    }
    return user;
  }

  async userExistByEmail(email: string): Promise<User | null> {
    const lowercaseEmail = email.toLowerCase();
    const user = await this.userRepository.findOne({ where: { email: lowercaseEmail } });
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    const user = await this.userRepository.createQueryBuilder('user').select('user.password').where('user.email = :email', { email }).getRawOne();

    if (user) return user.user_password;

    return null;
  }

  async updateLastLogin(user: User): Promise<User> {
    user.last_login = new Date();
    return this.userRepository.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUserForEmailOrCreate(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      const newUser = new User();
      newUser.email = email;
      const password = this.generateRandomPassword();
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      newUser.password = hashedPassword;
      await this.userRepository.save(newUser);

      if (newUser.password) {
        await this.emailService.sendUserWellcome(newUser.email, password);
      }
      return { created: true, user: newUser, password };
    }

    return { created: false, user };
  }

  generateRandomPassword(): string {
    const caracteres = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@.';
    let password = '';

    for (let i = 0; i < 14; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      password += caracteres.charAt(indice);
    }

    password += '@.';

    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    return password;
  }

  async AllUserMyOrganization(organizationId: number): Promise<User[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userOrganizations', 'userOrganization')
      .innerJoin('userOrganization.organization', 'organization')
      .where('organization.id = :organizationId', { organizationId })
      .select([
        'user.id',
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.email_verified',
        'user.last_login',
        'userOrganization.role', // Incluye el rol en la selección
      ])
      .getMany();
    return users;
  }

  async getGlobalUsers(user: User): Promise<User[]> {
    const roles: OrganizationRoleType[] = [];
    if (user.is_super_admin) {
      roles.push(OrganizationRoleType.ING_PREVENTA, OrganizationRoleType.USR_TECNICO);
    }
    const users = await this.userRepository.find({
      where: { userOrganizations: { role: In(roles) } },
      relations: ['userOrganizations', 'userOrganizations.organization'],
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        email_verified: true,
        last_login: true,
        userOrganizations: {
          role: true,
          organization: {
            id: true,
            name: true,
          },
        },
      },
    });
    return users;
  }

  async setGlobalRole(user: User, role: OrganizationRoleType, organizationId?: number): Promise<void> {
    const allowedRoles = [OrganizationRoleType.ING_PREVENTA, OrganizationRoleType.USR_TECNICO];
    if (!allowedRoles.includes(role)) {
      throw new Error('Solo se permiten los roles ING_PREVENTA y USR_TECNICO');
    }

    const userOrganization = this.userOrganizationRepository.create({
      user,
      role,
      organization: organizationId ? { id: organizationId } : undefined,
    });
    await this.userOrganizationRepository.save(userOrganization);
  }

  async deleteGlobalUser(userId: number): Promise<void> {
    await this.userRepository.softRemove({ id: userId });
  }
  async getGlobalUser(userId: number): Promise<User> {
    // Busca al usuario por ID
    const user = await this.userRepository.findOne({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        email_verified: true,
        last_login: true,
        userOrganizations: {
          id: true,
          role: true,
          organization: {
            id: true,
            name: true,
          },
        },
      },
      relations: ['userOrganizations', 'userOrganizations.organization'],
      where: { id: userId },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }

  async updateGlobalUser(userId: number, updateUserDto: UpdateUserDto): Promise<User> {
    // Encuentra al usuario y actualiza sus datos
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Actualizamos los campos del usuario
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async deleteRole(roleId: number): Promise<void> {
    await this.userOrganizationRepository.softRemove({ id: roleId });
  }
}
