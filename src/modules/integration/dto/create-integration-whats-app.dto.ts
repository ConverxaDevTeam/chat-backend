import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntegrationWhatsAppDto {
  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'token' })
  @IsNotEmpty({ message: 'Introduce un token.' })
  token: string;
}
