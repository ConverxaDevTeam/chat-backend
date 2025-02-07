import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'url.files':
                  return 'https://files.example.com';
                case 'nodemailer.from':
                  return 'no-reply@example.com';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendUserWellcome', () => {
    it('should send welcome email with correct parameters', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const email = 'test@example.com';
      const password = 'testPassword';

      const sendMailMock = jest.spyOn(service['transporter'], 'sendMail').mockResolvedValueOnce({} as any);

      await service.sendUserWellcome(email, password);

      expect(consoleSpy).toHaveBeenCalledWith('https://files.example.com');
      expect(consoleSpy).toHaveBeenCalledWith(undefined); // Para files.url
      expect(configService.get).toHaveBeenCalledWith('url.files');
      expect(configService.get).toHaveBeenCalledWith('nodemailer.from');
      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'no-reply@example.com',
        to: email,
        subject: 'Bienvenido a SofiaCall',
        html: expect.any(String),
      });
    });
  });
});
