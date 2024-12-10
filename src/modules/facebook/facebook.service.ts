import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor() {}
}
