import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
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
  @IsString({ message: 'El nombre de la organización debe ser un texto.' })
  name: string;

  @ApiProperty({
    example: 'Escuela del valle al lado del rio',
    description: 'Descripcion de organizacion',
  })
  description: string;

  @ApiProperty({ example: 'leo@pixeldigita.com', description: 'Email' })
  @IsEmail({}, { message: 'Correo electrónico no válido.' })
  @IsNotEmpty({ message: 'Introduce un Correo electrónico.' })
  email: string;
}
