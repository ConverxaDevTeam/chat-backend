import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'Refresh token' })
  @IsNotEmpty({ message: 'Introduce un refresh token.' })
  refresh_token: string;
}
