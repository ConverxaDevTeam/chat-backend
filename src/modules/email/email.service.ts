// email.service.ts
import { Injectable } from '@nestjs/common';
import * as Mailgun from 'mailgun.js';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as FormData from 'form-data';

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
  }

  async sendUserWellcome(email: string, password: string): Promise<void> {
    const template = await this.loadTemplate('user-welcome');
    const compiledTemplate = handlebars.compile(template);

    console.log('url email', this.configService.get<string>('url.frontend'));

    const html = compiledTemplate({
      email,
      password,
      link: this.configService.get<string>('url.frontend'),
      baseUrl: this.configService.get<string>('url.frontend'),
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

    const html = compiledTemplate({
      email,
      password,
      organization_name: organizationName,
      link: frontendUrl,
      baseUrl: frontendUrl,
    });

    await this.mailgun.messages.create(this.configService.get<string>('mailgun.domain'), {
      from: this.configService.get<string>('mailgun.from'),
      to: email,
      subject: `Bienvenido a ${organizationName} en SofiaChat`,
      html,
    });
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = join(process.cwd(), 'src', 'infrastructure', 'template', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return templateContent;
  }
}
