import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MessagerService {
  private readonly logger = new Logger(MessagerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendFacebookMessage(identified: string, message: string, token): Promise<any> {
    const data = {
      recipient: {
        id: identified,
      },
      messaging_type: 'RESPONSE',
      message: {
        text: message,
      },
    };

    try {
      const response = await axios.post(`${this.configService.get<string>('facebook.facebookGraphApi')}/me/messages`, data, {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        console.log('Message sent successfully');
      }
    } catch (error) {
      console.log('Error sending message:', error);
    }
  }
}
