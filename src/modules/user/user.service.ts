import { Repository } from 'typeorm';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@models/User.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
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
}
