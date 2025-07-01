import './polyfills'; // Importar polyfills primero
import './config/dd-tracer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';
import * as pg from 'pg';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { winstonLogger } from '@infrastructure/loggers/winston.logger';
import { HttpExceptionFilter } from '@infrastructure/filters/global-exception.filter';
import { WebChatSocketGateway } from '@modules/socket/socket.gateway';
import * as cors from 'cors';

export const logger = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production' ? winstonLogger : new Logger('backend-chat');

async function bootstrap() {
  // Verificar variables de entorno críticas
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY
      ? `${process.env.CLAUDE_API_KEY.substring(0, 5)}...${process.env.CLAUDE_API_KEY.substring(process.env.CLAUDE_API_KEY.length - 5)}`
      : undefined,
    DB_HOST: process.env.DB_HOST,
    PORT: process.env.PORT || 3001,
  };

  console.log('Variables de entorno críticas:', envVars);

  pg.defaults.parseInputDatesAsUTC = false;
  pg.types.setTypeParser(1114, (stringValue: string) => new Date(`${stringValue}Z`));

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  // Aumentar límites para todos los tipos de peticiones
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const allowedHeaders = ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Access-Control-Allow-Origin'];
  if (process.env.NGROK_DEV === '1') {
    allowedHeaders.push('ngrok-skip-browser-warning');
  }

  // Configuración detallada de CORS
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders,
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    origin: [
      /http\:\/\/localhost\:\d{1,5}$/,
      'https://chat-v2.sofiacall.com',
      'https://dev-sofia-chat-frontend.sofiacall.com',
      'https://internal-app.sofiachat.com',
      'https://app.sofiachat.com',
      'https://ci3.googleusercontent.com',
      'https://drlntz6nkra23p6khm9h89.webrelay.io',
      'https://qdn4t4csc2ryljnzjdyfd3.webrelay.io',
      'https://wki5y7wysxt8gqj0dw0yzh.webrelay.io',
    ],
  });

  // Configuración de CORS específica para '/sofia-chat'
  app.use('/files', cors());
  app.use('/assets', cors());
  app.use('/images', cors());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder().setTitle('SofiaChat API').setDescription('SofiaChat API docuemntation').addBearerAuth().setVersion('1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  app.useWebSocketAdapter(new IoAdapter(app));

  const httpServer = await app.listen(3001);

  const webChatSocketGateway = app.get(WebChatSocketGateway);
  webChatSocketGateway.bindServer(httpServer);
}
bootstrap();
// Test commit
// Test commit
