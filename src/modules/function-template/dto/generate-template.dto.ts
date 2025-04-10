import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
    description: 'Texto HTML o contenido para generar el template',
    example: '<html><body>Contenido del sitio</body></html>',
  })
  @IsNotEmpty({ message: 'El contenido es requerido' })
  @IsString({ message: 'El contenido debe ser un texto válido' })
  content: string;

  @ApiProperty({
    description: 'Mensaje adicional con instrucciones para la IA',
    example: 'Extraer funcionalidad específica para autenticación',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalMessage?: string;

  @ApiProperty({
    description: 'URL de origen del contenido',
    example: 'https://example.com/api-docs',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceUrl?: string;
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
    description: 'Datos de los templates generados',
    type: 'object',
  })
  data: {
    templates: any[];
    categories: any[];
    applications: any[];
    lastProcessedLine?: number;
    createdIds?: CreatedIdsDto;
  };
}
