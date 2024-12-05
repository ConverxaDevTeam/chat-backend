import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageType } from '@models/Message.entity';
import { Conversation } from '../../models/Conversation.entity';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createMessage(conversation: Conversation, text: string, type: MessageType): Promise<Message> {
    const message = new Message();
    message.text = text;
    message.type = type;
    message.conversation = conversation;
    await this.messageRepository.save(message);
    return message;
  }
}
