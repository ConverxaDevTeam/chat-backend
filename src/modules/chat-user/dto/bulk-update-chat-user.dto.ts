import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsObject, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class StandardFieldsDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Email del usuario' })
  @IsOptional()
  @ValidateIf((obj, value) => value !== '' && value !== null && value !== undefined)
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del usuario' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección del usuario' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'URL del avatar del usuario' })
  @IsOptional()
  @IsString()
  avatar?: string;

  // Campos técnicos no editables (solo lectura):
  // - web: Sitio web del usuario
  // - browser: Navegador del usuario
  // - operating_system: Sistema operativo del usuario
  // - ip: Dirección IP del usuario
  // Estos campos se actualizan automáticamente por el sistema
}

export class BulkUpdateChatUserDto {
  @ApiPropertyOptional({
    description: 'Campos estándar editables del usuario (name, email, phone, address, avatar)',
    type: StandardFieldsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StandardFieldsDto)
  standardFields?: StandardFieldsDto;

  @ApiPropertyOptional({
    description: 'Campos personalizados del usuario (clave-valor)',
    example: { empresa: 'Mi Empresa SA', ciudad: 'Buenos Aires', edad: '30' },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}

export interface BulkUpdateResponse {
  ok: boolean;
  message: string;
  data: {
    standardFields: {
      updated: string[];
      errors: Array<{ field: string; error: string }>;
    };
    customFields: {
      updated: string[];
      errors: Array<{ field: string; error: string }>;
    };
    updatedUser?: any;
  };
}
