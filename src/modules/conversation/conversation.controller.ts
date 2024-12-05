import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';

@Controller('conversation')
@ApiTags('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}
}
