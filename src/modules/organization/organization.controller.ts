import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';

@Controller('organization')
@ApiTags('organization')
@ApiBearerAuth()
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'obtener todas las organizaciones, solo admin' })
  @Get('')
  async getAll() {
    const organizations = await this.organizationService.getAll();
    return { ok: true, organizations };
  }
}
