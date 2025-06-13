import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HitlType } from '@models/HitlType.entity';
import { UserHitlType } from '@models/UserHitlType.entity';
import { User } from '@models/User.entity';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { CreateHitlTypeDto } from './dto/create-hitl-type.dto';
import { UpdateHitlTypeDto } from './dto/update-hitl-type.dto';
import { AssignUsersHitlTypeDto } from './dto/assign-users-hitl-type.dto';
import { HitlEventType, HitlTypeCreatedEvent, HitlTypeUpdatedEvent, HitlTypeDeletedEvent, HitlUserAssignedEvent, HitlUserRemovedEvent } from 'src/interfaces/hitl-events';

@Injectable()
export class HitlTypesService {
  constructor(
    @InjectRepository(HitlType)
    private readonly hitlTypeRepository: Repository<HitlType>,
    @InjectRepository(UserHitlType)
    private readonly userHitlTypeRepository: Repository<UserHitlType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(user: User, organizationId: number, createHitlTypeDto: CreateHitlTypeDto): Promise<HitlType> {
    // Verificar que el usuario es OWNER
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);
    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden crear tipos HITL');
    }

    // Verificar que no existe un tipo con el mismo nombre en la organización
    const existingType = await this.hitlTypeRepository.findOne({
      where: {
        name: createHitlTypeDto.name,
        organization_id: organizationId,
      },
    });

    if (existingType) {
      throw new BadRequestException('Ya existe un tipo HITL con este nombre en la organización');
    }

    const hitlType = this.hitlTypeRepository.create({
      ...createHitlTypeDto,
      organization_id: organizationId,
      created_by: user.id,
    });

    const savedHitlType = await this.hitlTypeRepository.save(hitlType);

    // Emitir evento para actualizar agentes
    const event: HitlTypeCreatedEvent = {
      type: HitlEventType.TYPE_CREATED,
      organizationId,
      hitlTypeId: savedHitlType.id,
      hitlTypeName: savedHitlType.name,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(HitlEventType.TYPE_CREATED, event);

    return savedHitlType;
  }

  async findAll(user: User, organizationId: number): Promise<HitlType[]> {
    // Verificar que el usuario pertenece a la organización
    const belongsToOrg = user.userOrganizations?.some((uo) => uo.organizationId === organizationId);
    if (!belongsToOrg) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    const hitlTypes = await this.hitlTypeRepository.find({
      where: { organization_id: organizationId },
      relations: ['creator', 'userHitlTypes', 'userHitlTypes.user'],
      order: { created_at: 'DESC' },
    });

    return hitlTypes;
  }

  async findOne(user: User, organizationId: number, id: number): Promise<HitlType> {
    const belongsToOrg = user.userOrganizations?.some((uo) => uo.organizationId === organizationId);

    if (!belongsToOrg) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    const hitlType = await this.hitlTypeRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: ['creator', 'userHitlTypes', 'userHitlTypes.user'],
    });

    if (!hitlType) {
      throw new NotFoundException('Tipo HITL no encontrado');
    }

    return hitlType;
  }

  async update(user: User, organizationId: number, id: number, updateHitlTypeDto: UpdateHitlTypeDto): Promise<HitlType> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden actualizar tipos HITL');
    }

    const hitlType = await this.findOne(user, organizationId, id);

    // Verificar unicidad del nombre si se está actualizando
    if (updateHitlTypeDto.name && updateHitlTypeDto.name !== hitlType.name) {
      const existingType = await this.hitlTypeRepository.findOne({
        where: {
          name: updateHitlTypeDto.name,
          organization_id: organizationId,
        },
      });

      if (existingType) {
        throw new BadRequestException('Ya existe un tipo HITL con este nombre en la organización');
      }
    }

    await this.hitlTypeRepository.update(id, updateHitlTypeDto);

    const updatedHitlType = await this.findOne(user, organizationId, id);

    // Emitir evento para actualizar agentes
    const event: HitlTypeUpdatedEvent = {
      type: HitlEventType.TYPE_UPDATED,
      organizationId,
      hitlTypeId: updatedHitlType.id,
      hitlTypeName: updatedHitlType.name,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(HitlEventType.TYPE_UPDATED, event);

    return updatedHitlType;
  }

  async remove(user: User, organizationId: number, id: number): Promise<void> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden eliminar tipos HITL');
    }

    const hitlType = await this.findOne(user, organizationId, id);

    // Eliminar primero las asignaciones de usuarios
    await this.userHitlTypeRepository.delete({ hitl_type_id: id });

    // Eliminar el tipo HITL
    await this.hitlTypeRepository.delete(id);

    // Emitir evento para actualizar agentes
    const event: HitlTypeDeletedEvent = {
      type: HitlEventType.TYPE_DELETED,
      organizationId,
      hitlTypeId: hitlType.id,
      hitlTypeName: hitlType.name,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(HitlEventType.TYPE_DELETED, event);
  }

  async assignUsers(user: User, organizationId: number, hitlTypeId: number, assignUsersDto: AssignUsersHitlTypeDto): Promise<void> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden asignar usuarios a tipos HITL');
    }

    // Verificar que el tipo HITL existe
    await this.findOne(user, organizationId, hitlTypeId);

    // Obtener todos los usuarios de una sola vez para evitar N+1 queries
    const targetUsers = await this.userRepository.find({
      where: { id: In(assignUsersDto.userIds) },
      relations: ['userOrganizations'],
    });

    // Verificar que todos los usuarios existen
    const foundUserIds = targetUsers.map((u) => u.id);
    const missingUserIds = assignUsersDto.userIds.filter((id) => !foundUserIds.includes(id));
    if (missingUserIds.length > 0) {
      throw new BadRequestException(`Usuarios con IDs ${missingUserIds.join(', ')} no encontrados`);
    }

    // Verificar que todos tienen rol HITL
    for (const targetUser of targetUsers) {
      const hasHitlRole = targetUser.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.HITL);

      if (!hasHitlRole) {
        throw new BadRequestException(`El usuario ${targetUser.email} no tiene rol HITL en la organización`);
      }
    }

    // Obtener asignaciones existentes de una sola vez
    const existingAssignments = await this.userHitlTypeRepository.find({
      where: {
        user_id: In(assignUsersDto.userIds),
        hitl_type_id: hitlTypeId,
        organization_id: organizationId,
      },
    });

    const existingUserIds = existingAssignments.map((assignment) => assignment.user_id);
    const newUserIds = assignUsersDto.userIds.filter((userId) => !existingUserIds.includes(userId));

    // Crear nuevas asignaciones en lote
    if (newUserIds.length > 0) {
      const newAssignments = newUserIds.map((userId) =>
        this.userHitlTypeRepository.create({
          user_id: userId,
          hitl_type_id: hitlTypeId,
          organization_id: organizationId,
        }),
      );

      await this.userHitlTypeRepository.save(newAssignments);

      // Emitir evento por cada usuario asignado
      const hitlType = await this.findOne({ userOrganizations: [{ organizationId, role: OrganizationRoleType.OWNER }] } as User, organizationId, hitlTypeId);

      for (const userId of newUserIds) {
        const event: HitlUserAssignedEvent = {
          type: HitlEventType.USER_ASSIGNED,
          organizationId,
          hitlTypeId,
          hitlTypeName: hitlType.name,
          userId,
          timestamp: new Date(),
        };
        this.eventEmitter.emit(HitlEventType.USER_ASSIGNED, event);
      }
    }
  }

  async removeUserAssignment(user: User, organizationId: number, hitlTypeId: number, userId: number): Promise<void> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden remover usuarios de tipos HITL');
    }

    // Verificar que el tipo HITL existe
    await this.findOne(user, organizationId, hitlTypeId);

    const assignment = await this.userHitlTypeRepository.findOne({
      where: {
        user_id: userId,
        hitl_type_id: hitlTypeId,
        organization_id: organizationId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await this.userHitlTypeRepository.delete(assignment.id);

    // Emitir evento para actualizar agentes
    const hitlType = await this.findOne({ userOrganizations: [{ organizationId, role: OrganizationRoleType.OWNER }] } as User, organizationId, hitlTypeId);

    const event: HitlUserRemovedEvent = {
      type: HitlEventType.USER_REMOVED,
      organizationId,
      hitlTypeId,
      hitlTypeName: hitlType.name,
      userId,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(HitlEventType.USER_REMOVED, event);
  }

  async getUsersByHitlType(organizationId: number, hitlTypeName: string): Promise<User[]> {
    const hitlType = await this.hitlTypeRepository.findOne({
      where: {
        name: hitlTypeName,
        organization_id: organizationId,
      },
    });

    if (!hitlType) {
      return [];
    }

    const userHitlTypes = await this.userHitlTypeRepository.find({
      where: {
        hitl_type_id: hitlType.id,
        organization_id: organizationId,
      },
      relations: ['user'],
    });

    const users = userHitlTypes.map((uht) => uht.user);

    return users;
  }
}
