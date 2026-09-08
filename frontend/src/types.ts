export interface CronRun {
  id: number;
  scheduled_time: string;
  actual_time: string;
  delay_seconds: number;
  delay_minutes: number;
  trigger_type: string;
  github_run_id: string | null;
  github_run_number: number | null;
  notes: string | null;
  created_at: string;
}

export interface YearlyAverage {
  year: number;
  avg_delay_minutes: number;
  run_count: number;
}

export interface SummaryData {
  total_runs: number;
  all_time_avg_minutes: number;
  last_week_avg_minutes: number;
  last_month_avg_minutes: number;
  yearly_averages: YearlyAverage[];
  last_week_runs: CronRun[];
  latest_run: CronRun | null;
}

export interface DelayDataset {
  generated_at: string;
  summary: SummaryData;
  runs: CronRun[];
}

export interface BarItem {
  id: string | number;
  label: string;
  subLabel?: string;
  value: number; // in minutes
  formattedValue: string;
  colorClass?: string;
  barColor?: string;
  extraInfo?: string;
  timestamp?: string;
}
