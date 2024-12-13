import { WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';
import { Syslog } from 'winston-syslog';

const syslogTransport = new Syslog({
  app_name: 'backend-chat',
  localhost: process.env.NODE_ENV,
  eol: '\n',
  format: format.json(),
});

const customFormat = format.combine(
  format.timestamp(),
  format.colorize(),
  format.printf(({ timestamp, level, message, context, ...meta }) => {
    return `${timestamp} [${level}] [${context || 'App'}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  }),
);

export const winstonLogger = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  transports: [
    new transports.Console({
      format: customFormat,
    }),
    syslogTransport,
  ],
});
