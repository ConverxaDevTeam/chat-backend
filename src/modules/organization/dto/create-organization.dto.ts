import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Los kumpas',
    description: 'Nombre de la organización',
  })
  @IsNotEmpty({ message: 'Introduce un nombre para la organización.' })
  @Length(4, 100, {
    message: 'El nombre de la organización debe tener entre 4 y 100 letras.',
  })
  name_organization: string;

  @ApiProperty({
    example: 'Escuela del valle al lado del rio',
    description: 'Descripcion de organizacion',
  })
  description: string;

  @ApiProperty({ example: 'Primaria', description: 'Nivel Educativo' })
  @IsString({ message: 'Introduce el nivel Educativo' })
  @IsNotEmpty({ message: 'Introduce el nivel Educativo' })
  @Length(4, 100, {
    message: 'Nivel Educativo debe tener entre 4 y 100 letras.',
  })
  educational_level: string;

  @ApiProperty({
    example: 200,
    description: 'Limite de Cuentas',
  })
  @IsNumber({}, { message: 'Introduce el limite de Cuentas' })
  limit_users: number;

  @ApiProperty({ example: 'karlosagreda@hotmail.com', description: 'Email' })
  @IsEmail({}, { message: 'Correo electrónico no válido.' })
  @IsNotEmpty({ message: 'Introduce un Correo electrónico.' })
  email: string;

  @ApiProperty({ example: 'Leonardo', description: 'Nombre' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un Nombre' })
  first_name: string;

  @ApiProperty({ example: 'Agreda', description: 'Apellido' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un Apellido' })
  last_name: string;
}
