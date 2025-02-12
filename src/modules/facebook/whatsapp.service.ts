import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { MessageFormatType } from '@models/Message.entity';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(phone: string, message: { text?: string; audio?: string; format: MessageFormatType }, phoneNumberId: string, token: string): Promise<any> {
    if (message.format === MessageFormatType.AUDIO) {
      return this.sendMessageAudio(phone, message.audio!, phoneNumberId, token);
    }
    return this.sendMessageText(phone, message.text!, phoneNumberId, token);
  }

  async sendMessageText(phone: string, text: string, sender_id: string, token: string, previewUrl = false): Promise<any> {
    try {
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: previewUrl, body: text },
      };

      const url = `${this.configService.get<string>('facebook.facebookGraphApi')}/${sender_id}/messages`;

      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      return { ok: true, data: response.data };
    } catch (error) {
      console.error('WhatsApp error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      return { ok: false, message: errorMessage };
    }
  }

  async sendMessageAudio(phone: string, nameAudio: string, phoneNumberId: string, token: string): Promise<any> {
    const audioUrl = `${this.configService.get<string>('url.web_hook_whatsapp')}/audio/${nameAudio}`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'audio',
      audio: { link: audioUrl },
    };
    try {
      await axios.post(`${this.configService.get<string>('facebook.facebookGraphApi')}/${phoneNumberId}/messages`, data, {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log(error.response.data.error.message);
    }
  }
}
