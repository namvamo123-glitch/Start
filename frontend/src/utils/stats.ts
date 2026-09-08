import { BarItem, CronRun, SummaryData } from '../types';

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    const sec = Math.round(minutes * 60);
    return `${sec}s`;
  }
  const min = Math.floor(minutes);
  const sec = Math.round((minutes - min) * 60);
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function buildWeekBarItems(runs: CronRun[]): BarItem[] {
  // Take last 7 runs or runs from the last 7 days
  const sorted = [...runs].sort(
    (a, b) => new Date(a.actual_time).getTime() - new Date(b.actual_time).getTime()
  );
  const recent = sorted.slice(-7);

  return recent.map((run) => {
    const dateObj = new Date(run.actual_time);
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    });

    return {
      id: run.id,
      label: `${dayName} (${formattedDate})`,
      subLabel: `Started at ${timeStr} UTC`,
      value: run.delay_minutes,
      formattedValue: `${run.delay_minutes.toFixed(2)} min (${formatDuration(run.delay_minutes)})`,
      timestamp: run.actual_time,
      extraInfo: `Scheduled: ${new Date(run.scheduled_time).toISOString().substring(11, 19)} UTC | Actual: ${new Date(run.actual_time).toISOString().substring(11, 19)} UTC | Delay: ${run.delay_seconds.toFixed(1)}s`,
    };
  });
}

export function buildMonthWeeklyBarItems(runs: CronRun[]): BarItem[] {
  // Group the last 30 days of runs into 4 weekly cohorts
  const sorted = [...runs].sort(
    (a, b) => new Date(b.actual_time).getTime() - new Date(a.actual_time).getTime()
  );
  const last30 = sorted.slice(0, 30);

  // Split into 4 chunks (approx 7-8 days each)
  const chunks = [
    { label: 'Past 7 Days (Week 1)', runs: last30.slice(0, 7) },
    { label: '8-14 Days Ago (Week 2)', runs: last30.slice(7, 14) },
    { label: '15-21 Days Ago (Week 3)', runs: last30.slice(14, 21) },
    { label: '22-30 Days Ago (Week 4)', runs: last30.slice(21, 30) },
  ];

  return chunks
    .filter((c) => c.runs.length > 0)
    .map((c, idx) => {
      const delays = c.runs.map((r) => r.delay_minutes);
      const avg = delays.reduce((acc, d) => acc + d, 0) / delays.length;
      return {
        id: `month-week-${idx}`,
        label: c.label,
        subLabel: `${c.runs.length} cron runs`,
        value: Math.round(avg * 100) / 100,
        formattedValue: `${avg.toFixed(2)} min avg`,
        extraInfo: `Average startup delay over ${c.runs.length} runs: ${formatDuration(avg)}`,
      };
    });
}

export function buildYearlyBarItems(summary: SummaryData): BarItem[] {
  return summary.yearly_averages.map((yearStat) => {
    return {
      id: `year-${yearStat.year}`,
      label: `Year ${yearStat.year}`,
      subLabel: `${yearStat.run_count} recorded cron executions`,
      value: yearStat.avg_delay_minutes,
      formattedValue: `${yearStat.avg_delay_minutes.toFixed(2)} min avg`,
      extraInfo: `Yearly average delay: ${formatDuration(yearStat.avg_delay_minutes)} across ${yearStat.run_count} executions`,
    };
  });
}
