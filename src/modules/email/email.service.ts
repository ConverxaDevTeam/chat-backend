// email.service.ts
import { Injectable } from '@nestjs/common';
import * as Mailgun from 'mailgun.js';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as FormData from 'form-data';
import { Organization } from '@models/Organization.entity';
import { User } from '@models/User.entity';
import { ChangeOrganizationTypeDto } from '@modules/plan/dto/change-organization-type.dto';
import { OrganizationType } from '@models/Organization.entity';
import { logger } from 'src/main';

@Injectable()
export class EmailService {
  private mailgun;

  constructor(private readonly configService: ConfigService) {
    const mailgun = new Mailgun.default(FormData);
    const mailgunApiKey = this.configService.get<string>('mailgun.apiKey');
    if (!mailgunApiKey) {
      throw new Error('Mailgun API Key no configurado');
    }
    const mailgunDomain = this.configService.get<string>('mailgun.domain');
    if (!mailgunDomain) {
      throw new Error('Mailgun Domain no configurado');
    }
    const mailgunFrom = this.configService.get<string>('mailgun.from');
    if (!mailgunFrom) {
      throw new Error('Mailgun From no configurado');
    }
    this.mailgun = mailgun.client({
      username: 'api',
      key: mailgunApiKey,
    });

    handlebars.registerHelper('reset', function (text) {
      return text;
    });
  }

  async sendUserWellcome(email: string, password: string): Promise<void> {
    const template = await this.loadTemplate('user-welcome');
    const compiledTemplate = handlebars.compile(template);

    console.log('url email', this.configService.get<string>('url.frontend'));
    const backendBaseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

    const html = compiledTemplate({
      email,
      password,
      link: this.configService.get<string>('url.frontend'),
      frontendBaseUrl: this.configService.get<string>('url.frontend'),
      backendBaseUrl,
    });

    const messageData = {
      from: this.configService.get<string>('mailgun.from'),
      to: email,
      subject: 'Bienvenido a SofiaCall',
      html,
    };

    await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), messageData);
  }

  async sendNewOrganizationEmail(email: string, password: string, organizationName: string): Promise<void> {
    const template = await this.loadTemplate('new-organization');
    const compiledTemplate = handlebars.compile(template);
    const frontendUrl = this.configService.get<string>('url.frontend');
    const backendBaseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

    const html = compiledTemplate({
      email,
      password,
      organization_name: organizationName,
      link: frontendUrl,
      frontendBaseUrl: frontendUrl,
      backendBaseUrl,
    });

    await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), {
      from: this.configService.get<string>('mailgun.from'),
      to: email,
      subject: `Bienvenido a ${organizationName} en Converxa`,
      html,
    });
  }

  async sendResetPasswordCode(email: string, code: string): Promise<void> {
    const template = await this.loadTemplate('reset-password');
    const compiledTemplate = handlebars.compile(template);
    const frontendUrl = this.configService.get<string>('url.frontend');
    const backendBaseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

    const html = compiledTemplate({
      email,
      code,
      frontendBaseUrl: frontendUrl,
      backendBaseUrl,
      resetPasswordLink: `${frontendUrl}/reset-password/change?code=${code}&email=${encodeURIComponent(email)}`,
      linkedinLink: 'https://linkedin.com/company/converxa',
      whatsappLink: 'https://whatsapp.com/converxa',
      instagramLink: 'https://instagram.com/converxa',
      facebookLink: 'https://facebook.com/converxa',
    });

    await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), {
      from: this.configService.get<string>('mailgun.from'),
      to: email,
      subject: 'Código para resetear password',
      html,
    });
  }

  async sendCustomPlanRequestEmail(to: string, organizationName: string, requestingUserEmail: string, requestingUserName: string): Promise<void> {
    const template = await this.loadTemplate('custom-plan-request');
    const compiledTemplate = handlebars.compile(template);
    const currentYear = new Date().getFullYear();
    const backendBaseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

    const html = compiledTemplate({
      organizationName,
      requestingUserEmail,
      requestingUserName,
      currentYear,
      frontendBaseUrl: this.configService.get<string>('url.frontend'),
      backendBaseUrl,
    });

    const messageData = {
      from: this.configService.get<string>('mailgun.from'),
      to,
      subject: `Solicitud de Plan Personalizado para ${organizationName}`,
      html,
    };

    await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), messageData);
  }

  async sendPlanChangeEmail(organization: Organization, user: User, changeTypeDto: ChangeOrganizationTypeDto): Promise<boolean> {
    try {
      const template = await this.loadTemplate('plan-change');
      const compiledTemplate = handlebars.compile(template);
      const frontendBaseUrl = this.configService.get<string>('url.frontend');
      const backendBaseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

      const html = compiledTemplate({
        organizationName: organization.name,
        adminEmail: user.email,
        planType: changeTypeDto.type,
        isCustomPlan: changeTypeDto.type === OrganizationType.CUSTOM,
        daysToUpdate: changeTypeDto.daysToUpdate,
        link: `${frontendBaseUrl}/admin/organizations/${organization.id}`,
        linkedinLink: 'https://www.linkedin.com/company/converxa/',
        whatsappLink: 'https://wa.me/56962378459',
        instagramLink: 'https://www.instagram.com/converxa/',
        facebookLink: 'https://www.facebook.com/sofia.chat.ai',
        backendBaseUrl,
      });

      const messageData = {
        from: this.configService.get<string>('mailgun.from'),
        to: user.email,
        subject: `Cambio de Plan en Sofia Chat - ${organization.name}`,
        html,
      };

      await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), messageData);
      logger.log(`Plan change email sent for organization ${organization.id}`);
      return true;
    } catch (error) {
      logger.error(`Error sending plan change email for organization ${organization.id}:`, error);
      return false;
    }
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = join(process.cwd(), 'src', 'infrastructure', 'template', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return templateContent;
  }
}
