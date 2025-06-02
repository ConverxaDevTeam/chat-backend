import { Controller, Post, Patch, Param, Body, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '@modules/auth/guards/super-admin.guard'; // Added SuperAdminGuard
import { PlanService } from './plan.service';
import { UpdateCustomPlanDto } from './dto/update-custom-plan.dto';
import { RequestCustomPlanDto } from './dto/request-custom-plan.dto';
import { Organization } from '@models/Organization.entity';

@ApiTags('Plan Management')
@ApiBearerAuth()
@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request-custom')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Request a custom plan for the user's organization" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Custom plan request received.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization or user not found.' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error processing request.' })
  async requestCustomPlan(@Req() req, @Body() dto: RequestCustomPlanDto): Promise<{ message: string }> {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User information is missing from the request.');
    }
    await this.planService.requestCustomPlan(dto.organizationId, req.user.id);
    return { message: 'Custom plan request received and is being processed.' };
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':organizationId/set-custom')
  @ApiOperation({ summary: "Set an organization's plan to custom (Super Admin only)" })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization plan set to custom.', type: Organization })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not have permission.' })
  async setPlanToCustomBySuperAdmin(@Param('organizationId', ParseIntPipe) organizationId: number): Promise<Organization> {
    return this.planService.setPlanToCustomBySuperAdmin(organizationId);
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':organizationId/details')
  @ApiOperation({ summary: 'Update custom plan details for an organization (Super Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Custom plan details updated.', type: Organization })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Organization is not on a custom plan or invalid data.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not have permission.' })
  async updateCustomPlanDetailsBySuperAdmin(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() updateCustomPlanDto: UpdateCustomPlanDto,
  ): Promise<Organization> {
    return this.planService.updateCustomPlanDetailsBySuperAdmin(organizationId, updateCustomPlanDto);
  }
}
