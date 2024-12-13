import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(phone: string, message: string, facebookIdentity: string, previewUrl = false): Promise<any> {
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: previewUrl, body: message },
    };
    try {
      const response = await axios.post(`${this.configService.get<string>('keys.facebookGraphApi')}/${facebookIdentity}/messages`, data, {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${this.configService.get<string>('keys.facebookToken')}`,
        },
      });
      if (response.status === 200) {
        return { ok: true };
      }
    } catch (error) {
      return { ok: false, message: error.response.data.error.message };
    }
  }

  // async sendMessageAudio(phone: string, nameAudio: string): Promise<any> {
  //   const data = {
  //     messaging_product: 'whatsapp',
  //     recipient_type: 'individual',
  //     to: phone,
  //     type: 'audio',
  //     audio: { link: `https://back-whatsapp.sofiacall.com/audio/${nameAudio}` },
  //   };
  //   try {
  //     const response = await axios.post(`${this.configService.get<string>('keys.facebookGraphApi')}/${this.configService.get<string>('keys.facebookIdentity')}/messages`, data, {
  //       headers: {
  //         'Content-type': 'application/json',
  //         Authorization: `Bearer ${this.configService.get<string>('keys.facebookToken')}`,
  //       },
  //     });
  //     if (response.status === 200) {
  //       await this.messageService.createMessageAudioSystem(phone, message, nameAudio);
  //     }
  //   } catch (error) {
  //     console.log(error.response.data.error.message);
  //     await this.messageService.createMessageAudioError(phone, error.response.data.error.message, nameAudio);
  //   }
  // }
}
