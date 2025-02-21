import { Controller, Get, Post, Body, Param, Put, NotFoundException, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from '@models/notification.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get unread notifications for user and system by organization' })
  @ApiResponse({ status: 200, description: 'List of unread notifications for the user and organization', type: [Notification] })
  @Get('organization/:organizationId')
  findAll(@Req() req, @Param('organizationId') organizationId: number): Promise<Notification[]> {
    const userId = req.user.id;
    return this.notificationService.findUnreadNotifications(userId, organizationId);
  }

  @ApiOperation({ summary: 'Get notification by id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'The notification', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Notification> {
    const notification = await this.notificationService.findOne(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  @ApiOperation({ summary: 'Create notification' })
  @ApiResponse({ status: 201, description: 'The notification has been created', type: Notification })
  @Post()
  create(@Body() notification: Partial<Notification>): Promise<Notification> {
    return this.notificationService.create(notification);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'The notification has been marked as read', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Put(':id/read')
  async markAsRead(@Param('id') id: number): Promise<Notification> {
    const notification = await this.notificationService.markAsRead(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  @ApiOperation({ summary: 'Mark all notifications as read for the user' })
  @ApiResponse({ status: 200, description: 'All notifications have been marked as read' })
  @Put('read-all')
  async markAllAsRead(@Req() req): Promise<void> {
    const userId = req.user.id;
    await this.notificationService.markAllAsRead(userId);
  }
}
