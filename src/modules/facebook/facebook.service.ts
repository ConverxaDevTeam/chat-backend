import { User } from '@models/User.entity';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(private readonly configService: ConfigService) {}

  async getFacebookConfig(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number) {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationWhatsAppDto.code}`;

    try {
      const response = await axios.get(tokenUrl);
      const accessToken = response.data.access_token;
      console.log('accessToken', accessToken);
      console.log('phone_number_id', createIntegrationWhatsAppDto.phone_number_id);
      console.log('waba_id', createIntegrationWhatsAppDto.waba_id);

      if (!accessToken) {
        throw new Error('Failed to exchange code for token');
      }

      // Configurar el Webhook para el número de WhatsApp
      const webhookConfigUrl = `https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`;

      const webhookResponse = await axios.post(
        webhookConfigUrl,
        {
          object: 'whatsapp_business_account',
          callback_url: `${this.configService.get<string>('facebook.appId')}/api/facebook/webhook/${10}/api`,
          fields: ['messages'],
          verify_token: accessToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('webhookResponse', webhookResponse);

      // Vincular el número con la WABA (WhatsApp Business Account)
      // const linkNumberUrl = `https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/phone_numbers`;
      // const linkNumberResponse = await axios.post(
      //   linkNumberUrl,
      //   {
      //     phone_number_id: createIntegrationWhatsAppDto.phone_number_id,
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       'Content-Type': 'application/json',
      //     },
      //   },
      // );

      // console.log('linkNumberResponse', linkNumberResponse.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data);
      }
    }
  }
}
