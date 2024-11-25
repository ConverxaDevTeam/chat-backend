// email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('nodemailer.host'),
      port: configService.get<number>('nodemailer.port'),
      secure: true,
      requireTLS: true,
      auth: {
        user: configService.get<string>('nodemailer.username'),
        pass: configService.get<string>('nodemailer.password'),
      },
    });
  }

  async sendPasswordDemo(first_name, last_name, email, password): Promise<void> {
    const template = await this.loadTemplate('user-demo');

    const compiledTemplate = handlebars.compile(template);

    const html = compiledTemplate({
      first_name: `${first_name}`,
      last_name: `${last_name}`,
      password: `${password}`,
    });

    const mailOptions = {
      from: this.configService.get<string>('nodemailer.from'),
      to: email,
      subject: 'Bienvenido a SofiaCall',
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendTestingEmail({ webhook, email, data }): Promise<void> {
    const template = await this.loadTemplate('testing');

    const compiledTemplate = handlebars.compile(template);

    const html = compiledTemplate({
      data: data,
      webhook: webhook,
      email: email,
    });

    const mailOptions = {
      from: this.configService.get<string>('nodemailer.from'),
      to: 'leo@pixeldigita.com',
      subject: 'testing',
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = join(process.cwd(), 'src', 'template', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return templateContent;
  }
}
