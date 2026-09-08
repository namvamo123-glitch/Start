import React, { useState } from 'react';
import { BarItem } from '../types';
import { Info } from 'lucide-react';

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  items: BarItem[];
  unit?: string;
  averageValue?: number;
  highlightHighest?: boolean;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  subtitle,
  items,
  unit = 'min',
  averageValue,
}) => {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        No delay records available for this view.
      </div>
    );
  }

  const maxValue = Math.max(...items.map((it) => it.value), 1);
  const chartMax = Math.ceil(maxValue * 1.15 * 10) / 10;

  const getBarColor = (val: number, customColor?: string) => {
    if (customColor) return customColor;
    if (val <= 3.0) return 'from-emerald-500 to-teal-400';
    if (val <= 6.5) return 'from-indigo-500 to-blue-400';
    if (val <= 12.0) return 'from-amber-500 to-yellow-400';
    return 'from-rose-500 to-orange-400';
  };

  const getBadgeColor = (val: number) => {
    if (val <= 3.0) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
    if (val <= 6.5) return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40';
    if (val <= 12.0) return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
    return 'text-rose-400 bg-rose-950/60 border-rose-800/40';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            {title}
          </h3>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {averageValue !== undefined && (
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
            <span className="text-slate-400">Section Avg:</span>
            <span className="font-semibold text-white">
              {averageValue.toFixed(2)} {unit}
            </span>
          </div>
        )}
      </div>

      {/* Bar graph listing */}
      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const percentage = Math.min(100, Math.max(3, (item.value / chartMax) * 100));
          const isHovered = hoveredId === item.id;

          return (
            <div
              key={item.id}
              className={`group relative rounded-lg p-2.5 transition-all duration-150 ${
                isHovered ? 'bg-slate-800/50 ring-1 ring-slate-700' : 'hover:bg-slate-800/30'
              }`}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-baseline gap-2 truncate">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  {item.subLabel && (
                    <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
                      {item.subLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pl-3">
                  <span
                    className={`font-mono font-medium px-2 py-0.5 rounded border text-[11px] ${getBadgeColor(
                      item.value
                    )}`}
                  >
                    {item.formattedValue}
                  </span>
                </div>
              </div>

              {/* Horizontal Bar Track */}
              <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                {/* Average Marker Line */}
                {averageValue !== undefined && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-dashed border-r border-dashed border-amber-400/60 z-10"
                    style={{ left: `${(averageValue / chartMax) * 100}%` }}
                    title={`Average: ${averageValue.toFixed(2)} ${unit}`}
                  />
                )}

                {/* Animated Horizontal Fill Bar */}
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getBarColor(
                    item.value,
                    item.barColor
                  )} transition-all duration-500 ease-out shadow-sm`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Tooltip on Hover */}
              {isHovered && item.extraInfo && (
                <div className="mt-2 text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{item.extraInfo}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart legend and scale */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> &lt; 3m (Fast)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> 3-6.5m (Normal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 6.5-12m (Queue load)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> &gt; 12m (High delay)
          </span>
        </div>
        <div className="font-mono text-slate-400">Scale: 0 to {chartMax} {unit}</div>
      </div>
    </div>
  );
};
