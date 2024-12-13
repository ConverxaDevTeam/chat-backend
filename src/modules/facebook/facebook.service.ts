import { User } from '@models/User.entity';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { IntegrationService } from '@modules/integration/integration.service';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationService: IntegrationService,
  ) {}

  async createIntegrationWhatsApp(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationWhatsAppDto.code}`,
      );
      const accessToken = response.data.access_token;

      if (!accessToken) {
        throw new Error('Failed to exchange code for token');
      }

      const integration = await this.integrationService.createIntegrationWhatsApp(user, organizationId, departamentoId, createIntegrationWhatsAppDto, accessToken);

      await axios.delete(`https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      await axios.post(
        `https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`,
        {
          callback_url: `${this.configService.get<string>('url.web_hook_whatsapp')}/api/facebook/webhook/${integration.id}/api`,
          verify_token: accessToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return integration;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data);
      }
      throw new Error('Failed to create integration');
    }
  }
}
