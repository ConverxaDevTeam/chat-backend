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
}
