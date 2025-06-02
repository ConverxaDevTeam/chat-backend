import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Token de acceso de Google',
    example: 'ya29.a0AfB_byDXmZn...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}
