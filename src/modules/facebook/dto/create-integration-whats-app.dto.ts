import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntegrationWhatsAppDto {
  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'code' })
  @IsNotEmpty({ message: 'Introduce un code.' })
  code: string;

  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'phone_number_id' })
  @IsNotEmpty({ message: 'Introduce number_id.' })
  phone_number_id: string;

  @ApiProperty({ example: 'asdasdasdasdsadasd', description: 'waba_id' })
  @IsNotEmpty({ message: 'Introduce waba_id.' })
  waba_id: string;
}
