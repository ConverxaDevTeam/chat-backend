import './polyfills'; // Importar polyfills primero
import './config/dd-tracer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { urlencoded, json } from 'express';
import * as express from 'express';
import * as path from 'path';
import * as pg from 'pg';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { winstonLogger } from '@infrastructure/loggers/winston.logger';
import { HttpExceptionFilter } from '@infrastructure/filters/global-exception.filter';
import { WebChatSocketGateway } from '@modules/socket/socket.gateway';
import { NestExpressApplication } from '@nestjs/platform-express';
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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
    origin: (origin, callback) => {
      const allowedOrigins: (string | RegExp)[] = [
        'https://app-chat.converxa.net',
        'https://internal-app.converxa.net',
        'https://back-chat.converxa.net',
        'https://ci3.googleusercontent.com',
        'https://drlntz6nkra23p6khm9h89.webrelay.io',
        'https://qdn4t4csc2ryljnzjdyfd3.webrelay.io',
        'https://wki5y7wysxt8gqj0dw0yzh.webrelay.io',
      ];

      // Localhost solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push(/http\:\/\/localhost\:\d{1,5}$/);
      }

      // Si no hay origin (requests directos como Postman) o está en la lista permitida
      if (!origin || allowedOrigins.some((allowed) => (typeof allowed === 'string' ? allowed === origin : (allowed as RegExp).test(origin)))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  });

  // Configuración manual de CORS para archivos estáticos públicos usando express middleware
  app.use('/files', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Configuración de CORS específica para otros archivos estáticos públicos
  app.use('/assets', cors({ origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] }));
  app.use('/images', cors({ origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] }));
  app.use('/logos', cors({ origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] }));
  app.use('/audio', cors({ origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] }));

  // Configuración manual de archivos estáticos para uploads
  app.use(
    '/users',
    express.static(path.join(process.cwd(), 'uploads', 'users'), {
      index: false,
      dotfiles: 'deny',
    }),
  );
  app.use(
    '/organizations',
    express.static(path.join(process.cwd(), 'uploads', 'organizations'), {
      index: false,
      dotfiles: 'deny',
    }),
  );
  app.use(
    '/templates',
    express.static(path.join(process.cwd(), 'uploads', 'templates'), {
      index: false,
      dotfiles: 'deny',
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder().setTitle('Converxa API').setDescription('Converxa API documentation').addBearerAuth().setVersion('1.0').build();
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
