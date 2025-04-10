import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatedIdsDto {
  @ApiProperty({
    description: 'ID de la aplicación creada',
    example: '123',
    required: false,
  })
  applicationId?: string;

  @ApiProperty({
    description: 'IDs de las categorías creadas',
    example: ['1', '2', '3'],
    type: [String],
    required: false,
  })
  categoryIds?: string[];
}

export class GenerateTemplateDto {
  @ApiProperty({
    description: 'URL del sitio para generar el template',
    example: 'https://ejemplo.com',
  })
  @IsNotEmpty({ message: 'La URL es requerida' })
  @IsUrl({}, { message: 'Debe proporcionar una URL válida' })
  url: string;

  @ApiProperty({
    description: 'Mensaje adicional con instrucciones para la IA',
    example: 'Extraer funcionalidad específica para autenticación',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalMessage?: string;
}

export class ContinueGenerateTemplateDto extends GenerateTemplateDto {
  @ApiProperty({
    description: 'Última línea procesada',
    example: 100,
  })
  @IsNotEmpty({ message: 'La última línea procesada es requerida' })
  lastProcessedLine: number;

  @ApiProperty({
    description: 'IDs de aplicaciones y categorías creadas previamente',
    type: CreatedIdsDto,
    required: false,
  })
  @IsOptional()
  createdIds?: CreatedIdsDto;
}

export class TemplateGenerationResponse {
  @ApiProperty({
    description: 'Estado de la operación',
    example: true,
  })
  ok: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Template generado exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Datos del template generado',
    type: 'object',
  })
  data: {
    template: any;
    categories: any[];
    applications: any[];
    lastProcessedLine?: number;
    createdIds?: CreatedIdsDto;
  };
}
