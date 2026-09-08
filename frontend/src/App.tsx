import React, { useState, useEffect } from 'react';
import fallbackData from './data/delays.json';
import { DelayDataset } from './types';
import { MetricCards } from './components/MetricCards';
import { HorizontalBarChart } from './components/HorizontalBarChart';
import { DelayTable } from './components/DelayTable';
import {
  buildWeekBarItems,
  buildMonthWeeklyBarItems,
  buildYearlyBarItems,
} from './utils/stats';
import {
  Clock,
  Activity,
  Layers,
  Calendar,
  BarChart3,
  RefreshCw,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';

export const App: React.FC = () => {
  const [data, setData] = useState<DelayDataset>(fallbackData as unknown as DelayDataset);
  const [activeTab, setActiveTab] = useState<'all' | 'week' | 'month' | 'years'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // Attempt to fetch latest generated json dynamically
      const response = await fetch('./data/delays.json', { cache: 'no-store' });
      if (response.ok) {
        const freshData = await response.json();
        setData(freshData);
      }
    } catch (err) {
      console.warn('Using bundled dataset fallback:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const weekItems = buildWeekBarItems(data.runs);
  const monthWeeklyItems = buildMonthWeeklyBarItems(data.runs);
  const yearlyItems = buildYearlyBarItems(data.summary);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar / Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  GitHub Actions Cron Delay Tracker
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                  03:14 UTC Daily
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Measuring real scheduler startup latency vs target cron trigger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1.5 rounded-lg transition-colors"
              title="Reload latest data snapshot"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cron Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Metrics Cards */}
        <MetricCards summary={data.summary} />

        {/* View Selection Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Visuals</span>
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Last Week</span>
            </button>
            <button
              onClick={() => setActiveTab('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Last Month Avg</span>
            </button>
            <button
              onClick={() => setActiveTab('years')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'years'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Past Years</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Last updated: <span className="text-slate-300 font-mono">{new Date(data.generated_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Visualizations (Horizontal Bar Charts) */}
        <div className="space-y-6">
          {/* Section 1: Last Week Delays */}
          {(activeTab === 'all' || activeTab === 'week') && (
            <HorizontalBarChart
              title="Last Week Daily Startup Delays"
              subtitle="Startup latency recorded for each individual morning cron run at 03:14 UTC"
              items={weekItems}
              averageValue={data.summary.last_week_avg_minutes}
              unit="min"
            />
          )}

          {/* Section 2: Last Month Average */}
          {(activeTab === 'all' || activeTab === 'month') && (
            <HorizontalBarChart
              title="Last Month Delay Overview & Weekly Averages"
              subtitle={`Monthly average: ${data.summary.last_month_avg_minutes.toFixed(2)} min | Cohort breakdown across past 30 days`}
              items={monthWeeklyItems}
              averageValue={data.summary.last_month_avg_minutes}
              unit="min"
            />
          )}

          {/* Section 3: Average of the Last Years */}
          {(activeTab === 'all' || activeTab === 'years') && (
            <HorizontalBarChart
              title="Multi-Year Comparison: Average Delay of the Last Years"
              subtitle="Comparing average runner startup queue delays across annual cron executions"
              items={yearlyItems}
              averageValue={data.summary.all_time_avg_minutes}
              unit="min"
            />
          )}
        </div>

        {/* Execution History Table */}
        <DelayTable runs={data.runs} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 mt-12 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>Automated via GitHub Actions cron (<code className="text-slate-300">14 3 * * *</code>)</span>
          </div>
          <div>
            <span>Data stored in SQLite repository file: <code className="text-slate-300">data/delays.db</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
