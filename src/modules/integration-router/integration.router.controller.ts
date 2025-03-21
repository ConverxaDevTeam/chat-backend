import { BadRequestException, Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { IntegrationRouterService } from './integration.router.service';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadedFiles } from '@nestjs/common';

@ApiTags('integration-router')
@Controller('integration-router')
@UseGuards(JwtAuthGuard)
export class IntegrationRouterController {
  constructor(private readonly integrationRouterService: IntegrationRouterService) {}

  @Post('send-message')
  @ApiOperation({ summary: 'Enviar mensaje como agente a una conversación' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images'))
  async sendAgentMessage(@GetUser() user: User, @Body() sendMessageDto: SendAgentMessageDto, @UploadedFiles() images?: Array<Express.Multer.File>) {
    if (!sendMessageDto.message && !images) {
      throw new BadRequestException('Se requiere al menos un mensaje o una imagen');
    }
    const message = await this.integrationRouterService.sendAgentMessage(user, { ...sendMessageDto, images });
    return { ok: true, message };
  }
}
