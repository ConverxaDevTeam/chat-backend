import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRoleType } from '@models/UserOrganization.entity';

export class ChangeUserRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del usuario en la organización',
    enum: OrganizationRoleType,
    example: OrganizationRoleType.ADMIN,
    enumName: 'OrganizationRoleType',
  })
  @IsEnum(OrganizationRoleType, {
    message: 'El rol debe ser uno de los siguientes: admin, hitl, supervisor, user, usr_tecnico, ing_preventa',
  })
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: OrganizationRoleType;
}
