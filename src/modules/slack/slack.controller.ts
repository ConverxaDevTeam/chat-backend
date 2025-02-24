import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@infrastructure/decorators/public-route.decorator';
import { SlackService } from './slack.service';

@Controller('slack')
@ApiTags('slack')
@ApiBearerAuth()
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(private readonly slackService: SlackService) {}

  @Get('auth')
  @Public()
  @ApiOperation({ summary: 'login slack' })
  async handleSlackAuth(@Query() query, @Res() res) {
    return this.slackService.handleSlackAuth(query, res);
  }

  @Post('actions')
  @Public()
  @ApiOperation({ summary: 'actions slack' })
  async handleSlackActions(@Body() body, @Res() res) {
    if (body.type === 'url_verification') {
      return res.json({ challenge: body.challenge });
    }
    setImmediate(async () => {
      if (body.event.type === 'message' && body.event.channel && body.event.channel && body.event.type === 'message') {
        if (!body.event.subtype && body.event.text && !body.event.bot_id) {
          const text = body.event.text;
          const channelId = body.event.channel;
          await this.slackService.handleMessage(text, channelId);
        }
      }
    });

    res.status(200).json({ ok: true });
  }
}
