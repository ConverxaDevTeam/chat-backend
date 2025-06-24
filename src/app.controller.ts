import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '@infrastructure/decorators/public-route.decorator';
import { NoLogging } from '@infrastructure/decorators/no-logging.decorator';

@Controller()
@Public()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @NoLogging()
  get(): Record<string, string> {
    return this.appService.getState();
  }

  @Get('health')
  @NoLogging()
  getHealth(): Record<string, any> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      deployment: process.env.DEPLOYMENT_COLOR || 'blue',
    };
  }
}
