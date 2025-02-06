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

  async sendUserWellcome(email: string, password: string): Promise<void> {
    const template = await this.loadTemplate('user-welcome');

    const compiledTemplate = handlebars.compile(template);

    const html = compiledTemplate({
      email,
      password,
      link: 'https://sofiacall.com',
      baseUrl: this.configService.get<string>('URL.FILES'),
    });

    const mailOptions = {
      from: this.configService.get<string>('nodemailer.from'),
      to: email,
      subject: 'Bienvenido a SofiaCall',
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = join(process.cwd(), 'src', 'infrastructure', 'template', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return templateContent;
  }
}
