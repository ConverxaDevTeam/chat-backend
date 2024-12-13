import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

class TextDto {
  @ApiProperty({ example: 'Hello, World!', description: 'Message body' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

class AudioDto {
  @ApiProperty({ example: 'CAPTION', description: 'Image caption' })
  @IsBoolean()
  @IsNotEmpty()
  voice: boolean;

  @ApiProperty({ example: 'image/jpeg', description: 'Image MIME type' })
  @IsString()
  @IsNotEmpty()
  mime_type: string;

  @ApiProperty({ example: 'SHA256', description: 'Image SHA256' })
  @IsString()
  @IsNotEmpty()
  sha256: string;

  @ApiProperty({ example: 'ID', description: 'Image ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

class ImageDto {
  @ApiProperty({ example: 'CAPTION', description: 'Image caption' })
  @IsString()
  @IsNotEmpty()
  caption: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Image MIME type' })
  @IsString()
  @IsNotEmpty()
  mime_type: string;

  @ApiProperty({ example: 'SHA256', description: 'Image SHA256' })
  @IsString()
  @IsNotEmpty()
  sha256: string;

  @ApiProperty({ example: 'ID', description: 'Image ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

class ButtonReplyDto {
  @ApiProperty({ example: 'BUTTON_ID', description: 'Button ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Button Title', description: 'Button title' })
  @IsString()
  @IsNotEmpty()
  title: string;
}

class ListReplyDto {
  @ApiProperty({ example: 'LIST_ID', description: 'List ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'List Title', description: 'List title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'List description', description: 'List description' })
  @IsString()
  @IsOptional()
  description?: string;
}

class InteractiveDto {
  @ApiPropertyOptional({ type: ButtonReplyDto, description: 'Button reply details' })
  @IsObject()
  @IsOptional()
  button_reply?: ButtonReplyDto;

  @ApiPropertyOptional({ type: ListReplyDto, description: 'List reply details' })
  @IsObject()
  @IsOptional()
  list_reply?: ListReplyDto;

  @ApiProperty({ example: 'button', description: 'Type of interactive' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

class ButtonDto {
  @ApiProperty({ example: 'Button Payload', description: 'Button payload' })
  @IsString()
  @IsNotEmpty()
  payload: string;

  @ApiProperty({ example: 'Button Text', description: 'Button text' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

class ContextDto {
  @ApiProperty({ example: 'PHONE_NUMBER', description: 'Sender phone number' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'CONTEXT_ID', description: 'Context ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

class MessageDto {
  @ApiProperty({ example: 'PHONE_NUMBER', description: 'Sender phone number' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'wamid.ID', description: 'Message ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'TIMESTAMP', description: 'Message timestamp' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({ type: InteractiveDto, description: 'Interactive information' })
  @IsObject()
  @IsOptional()
  interactive?: InteractiveDto;

  @ApiPropertyOptional({ type: TextDto, description: 'Text content of the message' })
  @IsObject()
  @IsOptional()
  text?: TextDto;

  @ApiPropertyOptional({ type: ImageDto, description: 'Image content of the message' })
  @IsObject()
  @IsOptional()
  image?: ImageDto;

  @ApiPropertyOptional({ type: ImageDto, description: 'Audio content of the message' })
  @IsObject()
  @IsOptional()
  audio?: AudioDto;

  @ApiPropertyOptional({ type: ContextDto, description: 'Context information' })
  @IsObject()
  @IsOptional()
  context?: ContextDto;

  @ApiPropertyOptional({ type: ButtonDto, description: 'Button information' })
  @IsObject()
  @IsOptional()
  button?: ButtonDto;

  @ApiProperty({ example: 'text', description: 'Type of the message' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

class MetadataDto {
  @ApiProperty({ example: '1234567890', description: 'Display phone number' })
  @IsString()
  @IsNotEmpty()
  display_phone_number: string;

  @ApiProperty({ example: 'PHONE_NUMBER_ID', description: 'Phone number ID' })
  @IsString()
  @IsNotEmpty()
  phone_number_id: string;
}

class ProfileDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the contact' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

class ContactDto {
  @ApiProperty({ type: ProfileDto, description: 'Profile information' })
  @IsObject()
  @IsNotEmpty()
  profile: ProfileDto;

  @ApiProperty({ example: 'PHONE_NUMBER', description: 'WhatsApp ID' })
  @IsString()
  @IsNotEmpty()
  wa_id: string;
}

class ValueDto {
  @ApiProperty({ example: 'whatsapp', description: 'Messaging product' })
  @IsString()
  @IsNotEmpty()
  messaging_product: string;

  @ApiProperty({ type: MetadataDto, description: 'Metadata information' })
  @IsObject()
  @IsNotEmpty()
  metadata: MetadataDto;

  @ApiProperty({ type: ContactDto, isArray: true, description: 'Contact information' })
  @IsArray()
  @IsNotEmpty()
  contacts: ContactDto[];

  @ApiProperty({ type: MessageDto, isArray: true, description: 'List of messages' })
  @IsArray()
  @IsNotEmpty()
  messages: MessageDto[];
}

class ChangeDto {
  @ApiProperty({ example: 'field', description: 'Field information' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ type: ValueDto, description: 'Value information' })
  @IsObject()
  @IsNotEmpty()
  value: ValueDto;
}

class EntryDto {
  @ApiProperty({ example: 'WHATSAPP_BUSINESS_ACCOUNT_ID', description: 'WhatsApp business account ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ type: ChangeDto, isArray: true, description: 'List of changes' })
  @IsArray()
  @IsNotEmpty()
  changes: ChangeDto[];
}

export class WebhookWhatsAppDto {
  @ApiProperty({ example: 'whatsapp_business_account', description: 'Type of object' })
  @IsString()
  @IsNotEmpty()
  object: string;

  @ApiProperty({ type: EntryDto, isArray: true, description: 'List of entries' })
  @IsArray()
  @IsNotEmpty()
  entry: EntryDto[];
}
