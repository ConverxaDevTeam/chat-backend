import { IsOptional, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  // Otros campos que desees permitir para actualizar...
}
