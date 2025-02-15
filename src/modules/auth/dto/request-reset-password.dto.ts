import { ApiProperty } from '@nestjs/swagger';

export class RequestResetPasswordDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@example.com',
    required: true,
  })
  email: string;
}
