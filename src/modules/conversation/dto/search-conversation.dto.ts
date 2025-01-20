import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationType } from '@models/Conversation.entity';

export class SearchConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  conversationId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ enum: ConversationType })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;
}
