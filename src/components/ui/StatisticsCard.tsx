import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from './Card';

export interface StatisticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number; // e.g. 12.5 means 12.5%
    type: 'up' | 'down' | 'neutral';
    label?: string;
  };
  subMetric?: {
    label: string;
    value: string | number;
  };
  sparklineData?: number[];
  icon?: React.ReactNode;
  badge?: string;
  redAccent?: boolean;
  goldAccent?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  description,
  trend,
  subMetric,
  sparklineData,
  icon,
  badge,
  redAccent = false,
  goldAccent = false,
  onClick,
  className = ''
}) => {
  const isClickable = Boolean(onClick);

  // Render a simple SVG sparkline path
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const width = 80;
    const height = 28;
    const padding = 2;
    
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min === 0 ? 1 : max - min;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    const strokeColor = trend?.type === 'down' 
      ? '#f43f5e' 
      : (trend?.type === 'up' ? '#34d399' : (redAccent ? '#ff1e27' : '#e50914'));

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <Card 
      hoverEffect={isClickable || true} 
      onClick={onClick}
      className={`relative overflow-hidden bg-[#181818] hover:bg-[#202020] border-[#2a2a2a] hover:border-[#383838] transition-all ${
        isClickable ? 'cursor-pointer select-none active:scale-[0.99]' : ''
      } ${className}`}
    >
      <CardContent className="flex flex-col justify-between p-4 sm:p-5 h-full space-y-3">
        {/* Top Title & Icon / Badge Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-heading truncate">
                {title}
              </p>
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#272727] text-zinc-300 border border-[#383838]">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-[11px] text-zinc-400 truncate">
                {description}
              </p>
            )}
          </div>

          {icon && (
            <div className="p-2 rounded-xl border bg-[#141414] border-[#2e2e2e] text-[#e50914] flex-shrink-0 shadow-sm">
              {icon}
            </div>
          )}
        </div>

        {/* Main Value & Trend Pill */}
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-white">
            {value}
          </span>

          {trend && (
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border shadow-sm ${
              trend.type === 'up' 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' 
                : trend.type === 'down' 
                  ? 'bg-rose-950/40 text-rose-400 border-rose-800/40' 
                  : 'bg-[#222222] text-zinc-400 border-[#333333]'
            }`}>
              {trend.type === 'up' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
              {trend.type === 'down' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {trend.type === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
              {trend.value}%
              {trend.label && <span className="ml-1 text-[10px] opacity-75">{trend.label}</span>}
            </span>
          )}
        </div>

        {/* Sub-metric & Sparkline Bottom Row */}
        {(subMetric || sparklineData) && (
          <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs text-zinc-400">
            {subMetric ? (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[11px] text-zinc-400">{subMetric.label}:</span>
                <span className="font-semibold text-zinc-200">{subMetric.value}</span>
              </div>
            ) : <div />}
            {renderSparkline()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
