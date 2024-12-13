import { Controller, Get, Param, UseGuards, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('conversation')
@ApiTags('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({ summary: 'get conversations by organization id' })
  @Get('organization/:organizationId')
  async getConversationsByOrganizationId(@GetUser() user: User, @Param('organizationId') organizationId: number) {
    const conversations = await this.conversationService.findByOrganizationIdAndUserId(organizationId, user);
    return { ok: true, conversations };
  }

  @ApiOperation({ summary: 'get conversation by organization id and conversation id' })
  @Get(':organizationId/:conversationId')
  async getConversationByOrganizationIdAndById(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('conversationId') conversationId: number) {
    const conversation = await this.conversationService.getConversationByOrganizationIdAndById(organizationId, conversationId, user);
    return { ok: true, conversation };
  }

  @ApiOperation({ summary: 'Assign a conversation to a user (HITL)' })
  @Post(':conversationId/assign-hitl')
  async assignHitl(@GetUser() user: User, @Param('conversationId') conversationId: number) {
    const conversation = await this.conversationService.assignHitl(conversationId, user);
    return { ok: true, conversation };
  }

  @ApiOperation({ summary: 'Reassign a conversation to a different user (HITL)' })
  @Post(':conversationId/reassign-hitl')
  async reassignHitl(@GetUser() user: User, @Param('conversationId') conversationId: number) {
    const conversation = await this.conversationService.reassignHitl(conversationId, user);
    return { ok: true, conversation };
  }
}
