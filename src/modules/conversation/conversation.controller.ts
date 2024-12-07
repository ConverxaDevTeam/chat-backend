import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';

@Controller('conversation')
@ApiTags('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a department by id' })
  @ApiBearerAuth()
  @Get('organization/:organizationId')
  async getConversationsByOrganizationId(@GetUser() user: User, @Param('organizationId') organizationId: number) {
    const conversations = await this.conversationService.findByOrganizationIdAndUserId(organizationId, user);

    return { ok: true, conversations };
  }
}
