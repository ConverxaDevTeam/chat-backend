import { Controller, Get, Post, Body, Param, Put, NotFoundException, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from '@models/notification.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications', type: [Notification] })
  @Get()
  findAll(): Promise<Notification[]> {
    return this.notificationService.findAll();
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
}
