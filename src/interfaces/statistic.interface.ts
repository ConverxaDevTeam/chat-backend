import { AnalyticType } from './analytics.enum';

export interface StatisticEntry {
  type: AnalyticType;
  created_at: Date;
  value: number;
}
