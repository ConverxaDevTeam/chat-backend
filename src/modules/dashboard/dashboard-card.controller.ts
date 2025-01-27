import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardCardService } from './dashboard-card.service';
import { CreateDashboardCardDto } from './dto/create-dashboard-card.dto';
import { UpdateDashboardCardDto } from './dto/update-dashboard-card.dto';
import { DashboardCard } from '../../models/DashboardCard.entity';
import { GetUser } from '../../infrastructure/decorators/get-user.decorator';
import { User } from '../../models/User.entity';
import { UpdateLayoutDto } from './dto/update-layout-dto';

@ApiTags('dashboard-cards')
@Controller('dashboard-cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardCardController {
  constructor(private readonly dashboardCardService: DashboardCardService) {}

  @Post(':organizationId?')
  @ApiOperation({ summary: 'Create a new dashboard card for organization or user' })
  create(@GetUser() user: User, @Body() createDashboardCardDto: CreateDashboardCardDto, @Param('organizationId') organizationId?: string): Promise<DashboardCard> {
    return this.dashboardCardService.create(user, createDashboardCardDto, organizationId ? parseInt(organizationId) : null);
  }

  @Get(':organizationId?')
  @ApiOperation({ summary: 'Get all dashboard cards for user and organization or just user' })
  findAll(@GetUser() user: User, @Param('organizationId') organizationId?: string): Promise<DashboardCard[]> {
    return this.dashboardCardService.findAll(user, organizationId ? parseInt(organizationId) : null);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard card' })
  update(@GetUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() updateDashboardCardDto: UpdateDashboardCardDto): Promise<DashboardCard> {
    return this.dashboardCardService.update(user, id, updateDashboardCardDto);
  }

  @Put(':relationId/layout')
  @ApiOperation({ summary: 'Update dashboard cards layout' })
  updateLayout(@GetUser() user: User, @Param('relationId', ParseIntPipe) relationId: number, @Body() updateLayoutDto: UpdateLayoutDto): Promise<DashboardCard[]> {
    return this.dashboardCardService.updateLayout(user, relationId, updateLayoutDto);
  }

  @Delete(':id/:organizationId?')
  @ApiOperation({ summary: 'Delete dashboard card' })
  remove(@GetUser() user: User, @Param('id', ParseIntPipe) id: number, @Param('organizationId') organizationId?: string): Promise<void> {
    return this.dashboardCardService.remove(user, id, organizationId ? parseInt(organizationId) : null);
  }
}
