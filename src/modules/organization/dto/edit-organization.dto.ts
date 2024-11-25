import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditOrganizationDto {
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

  @ApiProperty({ example: 'Calle falsa 123', description: 'Dirección' })
  @IsString({ message: 'Introduce la dirección' })
  @IsNotEmpty({ message: 'Introduce la dirección' })
  @Length(4, 250, {
    message: 'Dirección debe tener entre 4 y 250 letras.',
  })
  address: string;

  @ApiProperty({
    example: 'karlosagreda@hotmail.com',
    description: 'Email de contacto',
  })
  @IsEmail({}, { message: 'Correo electrónico no válido.' })
  @IsNotEmpty({ message: 'Introduce un Correo electrónico de contacto.' })
  email_contact: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Número de teléfono de contacto',
  })
  @IsString({ message: 'Introduce un número de teléfono de contacto.' })
  @IsNotEmpty({ message: 'Introduce un número de teléfono de contacto.' })
  phone_number: string;
}
