import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ChatUserService } from './chat-user.service';

@Controller('chat-user')
@ApiTags('chat-user')
export class ChatUserController {
  constructor(private readonly chatUserService: ChatUserService) {}
}
