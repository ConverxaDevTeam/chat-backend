import { ApiProperty } from '@nestjs/swagger';
import { LayoutConfig } from './create-dashboard-card.dto';

export class UpdateLayoutDto {
  @ApiProperty()
  breakpoint: string;

  @ApiProperty({ type: () => [LayoutConfig] })
  layouts: LayoutConfig[];
}
