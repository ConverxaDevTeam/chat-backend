import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPagesDto {
  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'code' })
  @IsNotEmpty({ message: 'Introduce un code.' })
  code: string;
}
