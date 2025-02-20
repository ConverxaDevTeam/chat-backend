import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageFormatType, MessageType } from '@models/Message.entity';
import { Conversation } from '../../models/Conversation.entity';
import { WebhookWhatsAppDto } from '@modules/facebook/dto/webhook.dto';
import axios from 'axios';
import * as uuid from 'uuid';
import * as fs from 'fs';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';
import { IntegrationType } from '@models/Integration.entity';
import { join } from 'path';
import * as getMP3Duration from 'get-mp3-duration';
import { SessionService } from './session.service';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationType } from '@models/notification.entity';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly sofiaLLMService: SofiaLLMService,
    private readonly sessionService: SessionService,
    private readonly notificationService: NotificationService,
  ) {}

  async createMessage(
    conversation: Conversation,
    text: string,
    type: MessageType,
    organizationId: number,
    userId?: number,
    options?: {
      platform: IntegrationType | 'HITL';
      format: MessageFormatType;
      audio_url?: string;
      images?: string[];
    },
  ): Promise<Message> {
    const message = new Message();
    message.text = text;
    if (options) {
      message.format = options.format;
      if (options.format === MessageFormatType.AUDIO && options.platform === IntegrationType.MESSENGER && options.audio_url) {
        const audioResponse = await axios.get(options.audio_url, { responseType: 'stream' });

        const uniqueName = `${uuid.v4()}.wav`;
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', uniqueName);
        const writer = fs.createWriteStream(audioPath);

        audioResponse.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });
        message.audio = uniqueName;
        try {
          const audioDuration = await this.getAudioDuration(audioPath);
          message.time = audioDuration;
        } catch (error) {
          console.error('Error obteniendo la duración del audio:', error.message);
        }
        const transcription = await this.sofiaLLMService.getAudioText(uniqueName);
        message.text = transcription.text;
      } else if (options.format === MessageFormatType.AUDIO && options.platform === IntegrationType.CHAT_WEB && options.audio_url) {
        message.audio = options.audio_url;
        const transcription = await this.sofiaLLMService.getAudioText(options.audio_url);
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', options.audio_url);
        try {
          const audioDuration = await this.getAudioDuration(audioPath);
          message.time = audioDuration;
        } catch (error) {
          console.error('Error obteniendo la duración del audio:', error.message);
        }
        message.text = transcription.text;
      } else if (options.format === MessageFormatType.AUDIO && options.platform === IntegrationType.WHATSAPP && options.audio_url) {
        message.audio = options.audio_url;
        const transcription = await this.sofiaLLMService.getAudioText(options.audio_url);
        message.text = transcription.text;
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', options.audio_url);
        try {
          const audioDuration = await this.getAudioDuration(audioPath);
          message.time = audioDuration;
        } catch (error) {
          console.error('Error obteniendo la duración del audio:', error.message);
        }
      }
    }
    if (options?.images) {
      message.images = options.images;
    }
    message.type = type;
    message.conversation = conversation;

    // Verificar si la conversación esta asignada a un agente
    if (userId) {
      await this.notificationService.createNotificationForUser(userId, NotificationType.USER, `Tienes un nuevo mensaje: ${message.text}`, organizationId);
    }

    return this.sessionService.attachMessageToSession(await this.messageRepository.save(message), conversation.id);
  }

  async createMessageAudio(conversation: Conversation, text: string, type: MessageType, organizationId: number, userId?: number): Promise<Message> {
    const audio = await this.sofiaLLMService.textToAudio(text);
    const message = new Message();
    const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', audio);
    try {
      const audioDuration = await this.getAudioDuration(audioPath);
      message.time = audioDuration;
    } catch (error) {
      console.error('Error obteniendo la duración del audio:', error.message);
    }
    message.type = type;
    message.text = text;
    message.format = MessageFormatType.AUDIO;
    message.conversation = conversation;
    message.audio = audio;
    if (userId) {
      await this.notificationService.createNotificationForUser(userId, NotificationType.USER, `Tienes un nuevo mensaje: ${message.text}`, organizationId);
    }
    return this.sessionService.attachMessageToSession(await this.messageRepository.save(message), conversation.id);
  }

  async getAudioDuration(filePath: string): Promise<number> {
    const buffer = fs.readFileSync(filePath);

    const duration = getMP3Duration(buffer);
    return duration;
  }

  async createMessageUserWhatsApp(conversation: Conversation, webhookWhatsAppDto: WebhookWhatsAppDto): Promise<Message | null> {
    if (webhookWhatsAppDto.entry[0].changes[0].value.messages[0].type === 'text') {
      const message = new Message();
      message.type = MessageType.USER;
      message.text = webhookWhatsAppDto.entry[0].changes[0].value.messages[0].text?.body || '';
      message.format = MessageFormatType.TEXT;
      return this.sessionService.attachMessageToSession(await this.messageRepository.save(message), conversation.id);
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
        try {
          const audioDuration = await this.getAudioDuration(audioPath);
          message.time = audioDuration;
        } catch (error) {
          console.error('Error obteniendo la duración del audio:', error.message);
        }
        const transcription = await this.sofiaLLMService.getAudioText(uniqueName);
        message.text = transcription.text;
      } catch (error) {
        console.error('Error downloading image:', error.message);
      }
      return this.sessionService.attachMessageToSession(await this.messageRepository.save(message), conversation.id);
    } else {
      return null;
    }
  }
}
