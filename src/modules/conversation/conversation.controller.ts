import { Controller, Get, Param, UseGuards, Post, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { ParseIntPipe } from '@nestjs/common';
import { SearchConversationDto } from './dto/search-conversation.dto';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { OrganizationRoleType } from '@models/UserOrganization.entity';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('conversation')
@ApiTags('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({ summary: 'get conversations by organization id' })
  @Get('organization/:organizationId')
  @UseGuards(JwtAuthRolesGuard)
  @Roles(OrganizationRoleType.HITL, OrganizationRoleType.OWNER, OrganizationRoleType.USER)
  async getConversationsByOrganizationId(@GetUser() user: User, @Param('organizationId', ParseIntPipe) organizationId: number, @Query() searchParams: SearchConversationDto) {
    const result = await this.conversationService.findByOrganizationIdAndUserId(organizationId, user, searchParams);
    return result;
  }

  @ApiOperation({ summary: 'get conversation by organization id and conversation id' })
  @Get(':organizationId/:conversationId')
  async getConversationByOrganizationIdAndById(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('conversationId') conversationId: number) {
    const conversation = await this.conversationService.getConversationByOrganizationIdAndById(organizationId, conversationId, user);
    if (!conversation) {
      return { ok: false, error: 'Conversation not found or does not belong to this organization', conversation: null };
    }
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

  @ApiOperation({ summary: 'Delete a conversation' })
  @Delete(':conversationId')
  async deleteConversation(@GetUser() user: User, @Param('conversationId') conversationId: number) {
    const conversation = await this.conversationService.softDeleteConversation(conversationId);
    return { ok: true, conversation };
  }
}
