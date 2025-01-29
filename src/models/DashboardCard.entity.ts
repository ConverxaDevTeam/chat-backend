import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn } from 'typeorm';
import { IsArray, IsBoolean, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { UserOrganization } from './UserOrganization.entity';
import { AnalyticType, StatisticsDisplayType, TimeRange } from '../interfaces/analytics.enum';

class Layout {
  lg: { w: number; h: number; x: number; y: number; i: string };
  md: { w: number; h: number; x: number; y: number; i: string };
  sm: { w: number; h: number; x: number; y: number; i: string };
  xs: { w: number; h: number; x: number; y: number; i: string };
}

@Entity({ name: 'DashboardCards' })
export class DashboardCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('simple-array')
  @IsArray()
  @IsEnum(AnalyticType, { each: true })
  analyticTypes: AnalyticType[];

  @Column({
    type: 'enum',
    enum: StatisticsDisplayType,
  })
  @IsEnum(StatisticsDisplayType)
  displayType: StatisticsDisplayType;

  @Column({
    type: 'enum',
    enum: TimeRange,
  })
  @IsEnum(TimeRange)
  timeRange: TimeRange;

  @Column('jsonb', {
    default: {
      lg: { w: 12, h: 6, x: 0, y: 0, i: '0' },
      md: { w: 12, h: 6, x: 0, y: 0, i: '0' },
      sm: { w: 12, h: 6, x: 0, y: 0, i: '0' },
      xs: { w: 12, h: 6, x: 0, y: 0, i: '0' },
    },
  })
  @IsObject()
  @ValidateNested()
  layout: Layout;

  @Column({ default: false })
  @IsBoolean()
  showLegend: boolean;

  @ManyToOne(() => UserOrganization, { nullable: true })
  @JoinColumn()
  userOrganization: UserOrganization;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
