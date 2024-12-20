import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageFormatType, MessageType } from '@models/Message.entity';
import { Conversation } from '../../models/Conversation.entity';
import { WebhookWhatsAppDto } from '@modules/facebook/dto/webhook.dto';
import axios from 'axios';
import * as uuid from 'uuid';
import { join } from 'path';
import * as fs from 'fs';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';
import { IntegrationType } from '@models/Integration.entity';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly sofiaLLMService: SofiaLLMService,
  ) {}

  async createMessage(
    conversation: Conversation,
    text: string,
    type: MessageType,
    options?: {
      platform: IntegrationType;
      format: MessageFormatType;
      audio_url?: string;
    },
  ): Promise<Message> {
    const message = new Message();
    if (options) {
      message.format = options.format;
      if (options.format === MessageFormatType.AUDIO && options.platform === IntegrationType.MESSENGER && options.audio_url) {
        const audioResponse = await axios.get(options.audio_url, { responseType: 'stream' });

        const uniqueName = `${uuid.v4()}.wav`;
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', uniqueName);
        const writer = fs.createWriteStream(audioPath);

        audioResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        message.audio = uniqueName;
        const transcription = await this.sofiaLLMService.getAudioText(uniqueName);
        message.text = transcription.text;
      } else if (options.format === MessageFormatType.AUDIO && options.platform === IntegrationType.CHAT_WEB && options.audio_url) {
        message.audio = options.audio_url;
        const transcription = await this.sofiaLLMService.getAudioText(options.audio_url);
        message.text = transcription.text;
      }
    } else {
      message.text = text;
    }
    message.type = type;
    message.conversation = conversation;
    await this.messageRepository.save(message);
    return message;
  }

  async createMessageAudio(conversation: Conversation, text: string, type: MessageType): Promise<Message> {
    const audio = await this.sofiaLLMService.textToAudio(text);
    const message = new Message();
    message.type = type;
    message.text = text;
    message.format = MessageFormatType.AUDIO;
    message.conversation = conversation;
    message.audio = audio;
    await this.messageRepository.save(message);
    return message;
  }

  async createMessageUserWhatsApp(conversation: Conversation, webhookWhatsAppDto: WebhookWhatsAppDto): Promise<Message | null> {
    if (webhookWhatsAppDto.entry[0].changes[0].value.messages[0].type === 'text') {
      const message = new Message();
      message.type = MessageType.USER;
      message.text = webhookWhatsAppDto.entry[0].changes[0].value.messages[0].text?.body || '';
      message.format = MessageFormatType.TEXT;
      await this.messageRepository.save(message);
      return message;
    } else if (webhookWhatsAppDto.entry[0].changes[0].value.messages[0].type === 'audio') {
      const message = new Message();
      message.type = MessageType.USER;
      message.format = MessageFormatType.AUDIO;
      try {
        const mediaResponse = await axios({
          method: 'get',
          url: `https://graph.facebook.com/v20.0/${webhookWhatsAppDto.entry[0].changes[0].value.messages[0].audio?.id}`,
          headers: {
            Authorization: `Bearer token`,
          },
        });
        const audioResponse = await axios.get(mediaResponse.data.url, {
          responseType: 'stream',
          headers: {
            Authorization: `Bearer token`,
          },
        });
        const uniqueName = `${uuid.v4()}.ogg`;
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', uniqueName);
        const writer = fs.createWriteStream(audioPath);
        audioResponse.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });
        message.audio = uniqueName;
        const transcription = await this.sofiaLLMService.getAudioText(uniqueName);
        message.text = transcription.text;
      } catch (error) {
        console.error('Error downloading image:', error.message);
      }
      await this.messageRepository.save(message);
      return message;
    } else {
      return null;
    }
  }
}
