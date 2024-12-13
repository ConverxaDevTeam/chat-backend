// import { Phone } from '@models/Phone.entity';
// import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
// import axios from 'axios';
// import { ConfigService } from '@nestjs/config';
// import { MessageService } from './message.service';

// @Injectable()
// export class WhatsAppService {
//   private readonly logger = new Logger(WhatsAppService.name);

//   constructor(
//     private readonly configService: ConfigService,
//     @Inject(forwardRef(() => MessageService))
//     private messageService: MessageService,
//   ) {}

//   async sendMessage(phone: Phone, message: string, previewUrl = false): Promise<any> {
//     const data = {
//       messaging_product: 'whatsapp',
//       recipient_type: 'individual',
//       to: phone.phone,
//       type: 'text',
//       text: { preview_url: previewUrl, body: message },
//     };
//     try {
//       const response = await axios.post(`${this.configService.get<string>('keys.facebookGraphApi')}/${this.configService.get<string>('keys.facebookIdentity')}/messages`, data, {
//         headers: {
//           'Content-type': 'application/json',
//           Authorization: `Bearer ${this.configService.get<string>('keys.facebookToken')}`,
//         },
//       });
//       if (response.status === 200) {
//         await this.messageService.createMessageTextSystem(phone, message);
//       }
//     } catch (error) {
//       await this.messageService.createMessageError(phone, error.response.data.error.message);
//     }
//   }

//   async sendMessageAudio(phone: Phone, message: string, nameAudio: string): Promise<any> {
//     const data = {
//       messaging_product: 'whatsapp',
//       recipient_type: 'individual',
//       to: phone.phone,
//       type: 'audio',
//       audio: { link: `https://back-whatsapp.sofiacall.com/audio/${nameAudio}` },
//     };
//     try {
//       const response = await axios.post(`${this.configService.get<string>('keys.facebookGraphApi')}/${this.configService.get<string>('keys.facebookIdentity')}/messages`, data, {
//         headers: {
//           'Content-type': 'application/json',
//           Authorization: `Bearer ${this.configService.get<string>('keys.facebookToken')}`,
//         },
//       });
//       if (response.status === 200) {
//         await this.messageService.createMessageAudioSystem(phone, message, nameAudio);
//       }
//     } catch (error) {
//       console.log(error.response.data.error.message);
//       await this.messageService.createMessageAudioError(phone, error.response.data.error.message, nameAudio);
//     }
//   }

//   async sendTemplate(phone: Phone, templateName: string, language: string, parameters: any, message: string): Promise<any> {
//     const data = {
//       messaging_product: 'whatsapp',
//       recipient_type: 'individual',
//       to: phone.phone,
//       type: 'template',
//       template: {
//         name: templateName,
//         language: { code: language, policy: 'deterministic' },
//         components: [
//           {
//             type: 'body',
//             parameters: parameters,
//           },
//         ],
//       },
//     };
//     try {
//       const response = await axios.post(`${this.configService.get<string>('keys.facebookGraphApi')}/${this.configService.get<string>('keys.facebookIdentity')}/messages`, data, {
//         headers: {
//           'Content-type': 'application/json',
//           Authorization: `Bearer ${this.configService.get<string>('keys.facebookToken')}`,
//         },
//       });
//       console.log(response);
//       if (response.status === 200) {
//         await this.messageService.createTemplateSystem(phone, message);
//       }
//     } catch (error) {
//       console.log(error.response.data.error.message);
//       await this.messageService.createTemplateError(phone, error.response.data.error.message);
//     }
//   }
// }
