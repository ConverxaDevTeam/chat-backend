import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { UserOrganization } from './UserOrganization.entity';
import { AnalyticType, StatisticsDisplayType, TimeRange } from '../interfaces/analytics.enum';

@Entity({ name: 'DashboardCards' })
export class DashboardCard extends BaseEntity {
  @Column()
  title: string;

  @Column('simple-array')
  analyticTypes: AnalyticType[];

  @Column({ type: 'enum', enum: StatisticsDisplayType })
  displayType: StatisticsDisplayType;

  @Column({ type: 'enum', enum: TimeRange })
  timeRange: TimeRange;

  @Column({ type: 'json' })
  layout: {
    lg: { w: number; h: number; x: number; y: number; i: number };
    md: { w: number; h: number; x: number; y: number; i: number };
    sm: { w: number; h: number; x: number; y: number; i: number };
    xs: { w: number; h: number; x: number; y: number; i: number };
  };

  @Column({ default: true })
  showLegend: boolean;

  @ManyToOne(() => UserOrganization, { onDelete: 'CASCADE', nullable: true })
  userOrganization: UserOrganization;
}
