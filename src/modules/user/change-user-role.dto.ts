import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Enum restringido para roles permitidos en cambio de rol
export enum AllowedChangeRoleType {
  USER = 'user',
  HITL = 'hitl',
}

export class ChangeUserRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del usuario en la organización (solo user o hitl)',
    enum: AllowedChangeRoleType,
    example: AllowedChangeRoleType.HITL,
    enumName: 'AllowedChangeRoleType',
  })
  @IsEnum(AllowedChangeRoleType, {
    message: 'El rol debe ser uno de los siguientes: user, hitl',
  })
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: AllowedChangeRoleType;
}
