import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeChannelNameSlackDto {
  @ApiProperty({ example: 'Canal de ventas', description: 'Nombre' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un nombre.' })
  name: string;
}
