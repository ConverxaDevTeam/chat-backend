import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntegrationRouterService } from './integration.router.service';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';

@ApiTags('integration-router')
@Controller('integration-router')
@UseGuards(JwtAuthGuard)
export class IntegrationRouterController {
  constructor(private readonly integrationRouterService: IntegrationRouterService) {}

  @Post('send-message')
  @ApiOperation({ summary: 'Enviar mensaje como agente a una conversación' })
  async sendAgentMessage(@GetUser() user: User, @Body() sendMessageDto: SendAgentMessageDto) {
    const message = await this.integrationRouterService.sendAgentMessage(user, sendMessageDto);
    return { ok: true, message };
  }
}
