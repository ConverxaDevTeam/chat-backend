import { version } from '../package.json';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getState(): Record<string, string> {
    return {
      version,
    };
  }
}
