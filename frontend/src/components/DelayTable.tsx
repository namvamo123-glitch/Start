import React, { useState } from 'react';
import { CronRun } from '../types';
import { Search } from 'lucide-react';
import { formatDuration } from '../utils/stats';

interface DelayTableProps {
  runs: CronRun[];
}

export const DelayTable: React.FC<DelayTableProps> = ({ runs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(15);

  const filtered = runs
    .slice()
    .reverse()
    .filter((r) => {
      const matchText = `${r.actual_time} ${r.trigger_type} ${r.github_run_id || ''} ${r.notes || ''}`.toLowerCase();
      return matchText.includes(searchTerm.toLowerCase());
    });

  const displayed = filtered.slice(0, limit);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">Recent Execution History</h3>
          <p className="text-sm text-slate-400 mt-0.5">Chronological record of GitHub Actions runs</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search date, run ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3">Date (UTC)</th>
              <th className="py-2.5 px-3">Scheduled</th>
              <th className="py-2.5 px-3">Actual Start</th>
              <th className="py-2.5 px-3">Delay</th>
              <th className="py-2.5 px-3">Trigger</th>
              <th className="py-2.5 px-3">Run ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayed.map((run) => {
              const actualDt = new Date(run.actual_time);
              const schedDt = new Date(run.scheduled_time);

              const badgeColor =
                run.delay_minutes <= 3
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                  : run.delay_minutes <= 7
                  ? 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40'
                  : run.delay_minutes <= 12
                  ? 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                  : 'text-rose-400 bg-rose-950/60 border-rose-800/40';

              return (
                <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                    {actualDt.toISOString().substring(0, 10)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {schedDt.toISOString().substring(11, 19)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                    {actualDt.toISOString().substring(11, 19)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                      +{run.delay_minutes.toFixed(2)} min ({formatDuration(run.delay_minutes)})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="capitalize text-slate-400">{run.trigger_type}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {run.github_run_id ? (
                      <span className="flex items-center gap-1">
                        {run.github_run_id}
                        {run.github_run_id.startsWith('sim') ? (
                          <span className="text-[10px] text-slate-400">(simulated)</span>
                        ) : null}
                      </span>
                    ) : (
                      'local'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLimit((prev) => prev + 25)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 transition-colors"
          >
            Show More ({filtered.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
