import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendAgentMessageDto {
  @ApiProperty({ description: 'Mensaje de texto a enviar' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'ID de la conversación' })
  @IsNumber()
  @IsNotEmpty()
  conversationId: number;

  @ApiProperty({ description: 'Imágenes a enviar', type: 'array', items: { type: 'string', format: 'binary' }, required: false })
  images?: Array<Express.Multer.File>;
}
