import { IsArray, IsNotEmpty, IsString, IsHexColor } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIntegrationWebChatDataDto {
  @ApiProperty({ example: ['http://example.com'], description: 'CORS' })
  @IsArray()
  @IsNotEmpty({ message: 'Introduce las URLs de CORS.' })
  cors: string[];

  @ApiProperty({ example: 'Chat Web', description: 'Título' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un título.' })
  title: string;

  @ApiProperty({ example: 'Soporte al cliente', description: 'Nombre' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un nombre.' })
  name: string;

  @ApiProperty({ example: 'Bienvenido al chat de soporte', description: 'Subtítulo' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce un subtítulo.' })
  sub_title: string;

  @ApiProperty({ example: 'Aquí puedes hablar con un asistente.', description: 'Descripción' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce una descripción.' })
  description: string;

  @ApiProperty({ example: '#FFFFFF', description: 'Color de fondo' })
  @IsString()
  @IsHexColor({ message: 'El color de fondo debe ser un código hexadecimal válido.' })
  bg_color: string;

  @ApiProperty({ example: 'Chat en vivo', description: 'Texto del título' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce el texto del título.' })
  text_title: string;

  @ApiProperty({ example: '#F0F0F0', description: 'Color de fondo del chat' })
  @IsString()
  @IsHexColor({ message: 'El color de fondo del chat debe ser un código hexadecimal válido.' })
  bg_chat: string;

  @ApiProperty({ example: '#000000', description: 'Color del texto' })
  @IsString()
  @IsHexColor({ message: 'El color del texto debe ser un código hexadecimal válido.' })
  text_color: string;

  @ApiProperty({ example: '#D3D3D3', description: 'Color de fondo del asistente' })
  @IsString()
  @IsHexColor({ message: 'El color de fondo del asistente debe ser un código hexadecimal válido.' })
  bg_assistant: string;

  @ApiProperty({ example: '#E5E5E5', description: 'Color de fondo del usuario' })
  @IsString()
  @IsHexColor({ message: 'El color de fondo del usuario debe ser un código hexadecimal válido.' })
  bg_user: string;

  @ApiProperty({ example: '#007BFF', description: 'Color del botón' })
  @IsString()
  @IsHexColor({ message: 'El color del botón debe ser un código hexadecimal válido.' })
  button_color: string;

  @ApiProperty({ example: 'Enviar', description: 'Texto del botón' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce el texto del botón.' })
  button_text: string;

  @ApiProperty({ example: 'Hoy', description: 'Texto de la fecha' })
  @IsString()
  @IsNotEmpty({ message: 'Introduce el texto de la fecha.' })
  text_date: string;
}
