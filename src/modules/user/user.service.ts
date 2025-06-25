import { In, Repository } from 'typeorm';
import { Injectable, Logger, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
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

  private async findUserByQuery(whereClause: string, params: any[]): Promise<User | null> {
    const userResult = await this.userRepository.query(`SELECT id, email, is_super_admin FROM "Users" WHERE ${whereClause} AND "deletedAt" IS NULL`, params);

    if (userResult.length === 0) {
      return null;
    }

    const userData = userResult[0];
    const user = new User();
    user.id = userData.id;
    user.email = userData.email;
    user.is_super_admin = userData.is_super_admin;

    return user;
  }

  async findById(userId: number): Promise<User> {
    const user = await this.findUserByQuery('id = $1', [userId]);

    if (!user) {
      throw new NotFoundException('El usuario no existe.');
    }

    // Get userOrganizations relation using native query to maintain exact same functionality
    const orgResult = await this.userRepository.query(
      `SELECT uo.id, uo.role, uo."organizationId", o.name as organizationName
       FROM "UserOrganizations" uo
       LEFT JOIN "Organizations" o ON o.id = uo."organizationId"
       WHERE uo."userId" = $1 AND uo."deletedAt" IS NULL`,
      [userId],
    );

    // Add userOrganizations relation data to maintain same functionality
    user.userOrganizations = orgResult.map((org) => ({
      id: org.id,
      role: org.role,
      organizationId: org.organizationId,
      organization: org.organizationName ? { id: org.organizationId, name: org.organizationName } : null,
    })) as any;

    return user;
  }

  async userExistByEmail(email: string): Promise<User | null> {
    try {
      return await this.findUserByQuery('email = $1', [email]);
    } catch (error) {
      this.logger.error(`Error en userExistByEmail: ${error.message}`);
      throw error;
    }
  }

  async findByEmailWithPassword(email: string): Promise<string | null> {
    // Usar query nativa para obtener la contraseña
    const result = await this.userRepository.query('SELECT password FROM "Users" WHERE email = $1 AND "deletedAt" IS NULL', [email]);

    if (result.length === 0) {
      return null;
    }

    return result[0].password;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'reset_password_code', 'reset_password_expires'],
    });
  }

  /**
   * Busca un usuario por email con campos adicionales para autenticación con Google
   * @param email Email del usuario
   * @returns Usuario con campos adicionales o null si no existe
   */
  async findByEmailComplete(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'first_name', 'last_name', 'google_id', 'picture', 'email_verified'],
    });
  }

  async updateLastLogin(user: User): Promise<User> {
    user.last_login = new Date();
    return this.userRepository.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUserForEmailOrCreate(email: string) {
    const user = await this.findUserByQuery('email = $1', [email]);

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

  /**
   * Obtiene los usuarios de una organización específica para superadministradores
   * @param organizationId ID de la organización
   * @returns Lista de usuarios con sus emails y roles
   */
  async getUsersByOrganizationForSuperAdmin(organizationId: number): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userOrganizations', 'userOrganization')
      .innerJoin('userOrganization.organization', 'organization')
      .where('organization.id = :organizationId', { organizationId })
      .select(['user.id', 'user.email', 'user.first_name', 'user.last_name', 'userOrganization.role'])
      .getMany();
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

  async changePassword(userId: number, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password actual incorrecto');
    }

    return this.updateUserPassword(userId, newPassword);
  }

  async changePasswordAsAdmin(userId: number, newPassword: string) {
    return this.updateUserPassword(userId, newPassword);
  }

  private async updateUserPassword(userId: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await this.userRepository.update(userId, { password: hashedPassword });

    if (result.affected === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return { ok: true, message: 'Password actualizado exitosamente' };
  }

  async findByEmailWithResetCode(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'reset_password_code', 'reset_password_expires'],
    });
  }

  async updateResetPasswordCode(userId: number, code: string, expires: Date): Promise<void> {
    await this.userRepository.update(userId, {
      reset_password_code: code,
      reset_password_expires: expires,
    });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, {
      password: hashedPassword,
      reset_password_code: () => 'NULL',
      reset_password_expires: () => 'NULL',
    });
  }

  /**
   * Crea un nuevo usuario con información de Google
   * @param userData Datos del usuario de Google
   * @returns Usuario creado
   */
  async createUserFromGoogle(userData: { email: string; name?: string; password: string; google_id: string; picture?: string }): Promise<User> {
    const user = new User();
    user.email = userData.email.toLowerCase();
    user.password = userData.password;
    user.google_id = userData.google_id;
    user.email_verified = true; // Consideramos verificado el email si viene de Google

    // Separar nombre completo en nombre y apellido si es posible
    if (userData.name) {
      const nameParts = userData.name.split(' ');
      if (nameParts.length > 1) {
        user.first_name = nameParts[0];
        user.last_name = nameParts.slice(1).join(' ');
      } else {
        user.first_name = userData.name;
      }
    }

    if (userData.picture) {
      user.picture = userData.picture;
    }

    return this.userRepository.save(user);
  }

  /**
   * Actualiza la información de Google de un usuario existente
   * @param userId ID del usuario a actualizar
   * @param data Datos de Google a actualizar
   */
  async updateGoogleInfo(userId: number, data: { google_id: string; picture?: string }): Promise<void> {
    const updateData: Record<string, string> = { google_id: data.google_id };

    if (data.picture) {
      updateData.picture = data.picture;
    }

    await this.userRepository.update(userId, updateData);
  }

  /**
   * Actualiza información completa de Google para un usuario existente
   * @param userId ID del usuario a actualizar
   * @param data Datos completos de Google a actualizar
   */
  async updateUserWithGoogleInfo(userId: number, data: any): Promise<void> {
    this.logger.log(`[UserService] Actualizando usuario ${userId} con datos de Google: ${JSON.stringify(data)}`);
    await this.userRepository.update(userId, data);
  }

  /**
   * Elimina un usuario de una organización y si no tiene más roles, elimina el usuario
   * @param userId ID del usuario a eliminar de la organización
   * @param organizationId ID de la organización
   * @returns Objeto con información de lo que se eliminó
   */
  async removeUserFromOrganization(userId: number, organizationId: number): Promise<{ userDeleted: boolean; roleDeleted: boolean; message: string }> {
    // Buscar el rol del usuario en la organización específica
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: {
        user: { id: userId },
        organization: { id: organizationId },
      },
      relations: ['user', 'organization'],
    });

    if (!userOrganization) {
      throw new NotFoundException('El usuario no tiene un rol en la organización especificada');
    }

    // Si es OWNER, verificar que no sea el último OWNER de la organización
    if (userOrganization.role === OrganizationRoleType.OWNER && userOrganization.organization) {
      const ownersCount = await this.userOrganizationRepository.count({
        where: {
          organization: { id: userOrganization.organization.id },
          role: OrganizationRoleType.OWNER,
        },
        withDeleted: false,
      });

      if (ownersCount <= 1) {
        throw new ConflictException('No se puede eliminar el último propietario de la organización');
      }
    }

    const roleId = userOrganization.id;

    // Eliminar el rol (soft delete)
    await this.userOrganizationRepository.softRemove({ id: roleId });

    // Verificar si el usuario tiene otros roles activos
    const remainingRoles = await this.userOrganizationRepository.find({
      where: { user: { id: userId } },
      withDeleted: false,
    });

    let userDeleted = false;
    let message = 'Usuario removido de la organización';

    // Si no tiene más roles, eliminar el usuario
    if (remainingRoles.length === 0) {
      await this.userRepository.softRemove({ id: userId });
      userDeleted = true;
      message = 'Usuario removido de la organización y eliminado completamente (no tenía más roles)';
    }

    return {
      userDeleted,
      roleDeleted: true,
      message,
    };
  }

  /**
   * Obtiene todos los usuarios de una organización con sus roles
   * @param organizationId ID de la organización
   * @returns Lista de usuarios con sus roles en la organización
   */
  async getUsersByOrganizationId(organizationId: number): Promise<UserOrganization[]> {
    return this.userOrganizationRepository.find({
      where: {
        organization: { id: organizationId },
      },
      relations: ['user'],
      order: {
        role: 'ASC',
        user: { email: 'ASC' },
      },
    });
  }
}
