import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HitlType } from '@models/HitlType.entity';
import { UserHitlType } from '@models/UserHitlType.entity';
import { User } from '@models/User.entity';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { CreateHitlTypeDto } from './dto/create-hitl-type.dto';
import { UpdateHitlTypeDto } from './dto/update-hitl-type.dto';
import { AssignUsersHitlTypeDto } from './dto/assign-users-hitl-type.dto';

@Injectable()
export class HitlTypesService {
  constructor(
    @InjectRepository(HitlType)
    private readonly hitlTypeRepository: Repository<HitlType>,
    @InjectRepository(UserHitlType)
    private readonly userHitlTypeRepository: Repository<UserHitlType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    return this.hitlTypeRepository.save(hitlType);
  }

  async findAll(user: User, organizationId: number): Promise<HitlType[]> {
    // Verificar que el usuario pertenece a la organización
    const belongsToOrg = user.userOrganizations?.some((uo) => uo.organizationId === organizationId);

    if (!belongsToOrg) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    return this.hitlTypeRepository.find({
      where: { organization_id: organizationId },
      relations: ['creator', 'userHitlTypes', 'userHitlTypes.user'],
      order: { created_at: 'DESC' },
    });
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
    return this.findOne(user, organizationId, id);
  }

  async remove(user: User, organizationId: number, id: number): Promise<void> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden eliminar tipos HITL');
    }

    await this.findOne(user, organizationId, id);

    // Eliminar primero las asignaciones de usuarios
    await this.userHitlTypeRepository.delete({ hitl_type_id: id });

    // Eliminar el tipo HITL
    await this.hitlTypeRepository.delete(id);
  }

  async assignUsers(user: User, organizationId: number, hitlTypeId: number, assignUsersDto: AssignUsersHitlTypeDto): Promise<void> {
    const isOwner = user.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.OWNER);

    if (!isOwner) {
      throw new ForbiddenException('Solo los propietarios pueden asignar usuarios a tipos HITL');
    }

    // Verificar que el tipo HITL existe
    await this.findOne(user, organizationId, hitlTypeId);

    // Verificar que todos los usuarios existen y tienen rol HITL en la organización
    for (const userId of assignUsersDto.userIds) {
      const targetUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['userOrganizations'],
      });

      if (!targetUser) {
        throw new BadRequestException(`Usuario con ID ${userId} no encontrado`);
      }

      const hasHitlRole = targetUser.userOrganizations?.some((uo) => uo.organizationId === organizationId && uo.role === OrganizationRoleType.HITL);

      if (!hasHitlRole) {
        throw new BadRequestException(`El usuario ${targetUser.email} no tiene rol HITL en la organización`);
      }

      // Verificar si ya está asignado
      const existingAssignment = await this.userHitlTypeRepository.findOne({
        where: {
          user_id: userId,
          hitl_type_id: hitlTypeId,
          organization_id: organizationId,
        },
      });

      if (!existingAssignment) {
        // Crear nueva asignación
        const userHitlType = this.userHitlTypeRepository.create({
          user_id: userId,
          hitl_type_id: hitlTypeId,
          organization_id: organizationId,
        });

        await this.userHitlTypeRepository.save(userHitlType);
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

    return userHitlTypes.map((uht) => uht.user);
  }
}
