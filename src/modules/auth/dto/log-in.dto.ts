import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogInDto {
  @ApiProperty({ example: 'leo@pixeldigita.com', description: 'Email' })
  @IsEmail({}, { message: 'Correo electrónico no válido.' })
  @IsNotEmpty({ message: 'Introduce un Correo electrónico.' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Password' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce una Contraseña.' })
  @Length(6, 20, {
    message: 'La contraseña debe tener entre 6 y 20 caracteres.',
  })
  password: string;
}
