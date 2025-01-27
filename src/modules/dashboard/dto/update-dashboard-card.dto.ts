import { PartialType } from '@nestjs/swagger';
import { CreateDashboardCardDto } from './create-dashboard-card.dto';

export class UpdateDashboardCardDto extends PartialType(CreateDashboardCardDto) {}
