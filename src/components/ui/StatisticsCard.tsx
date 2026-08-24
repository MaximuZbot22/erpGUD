import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from './Card';

interface StatisticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number; // e.g. 12.5 means 12.5%
    type: 'up' | 'down' | 'neutral';
  };
  sparklineData?: number[]; // list of numbers to render a mini SVG line chart
  icon?: React.ReactNode;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  description,
  trend,
  sparklineData,
  icon
}) => {
  // Render a simple SVG sparkline path
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const width = 80;
    const height = 30;
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

    const strokeColor = trend?.type === 'down' ? '#ef4444' : '#10b981'; // rose-500 or emerald-500

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  return (
    <Card hoverEffect>
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              {value}
            </span>
            
            {trend && (
              <span className={`inline-flex items-center text-xs font-medium ${
                trend.type === 'up' 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : trend.type === 'down' 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-slate-500'
              }`}>
                {trend.type === 'up' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                {trend.type === 'down' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {trend.type === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
                {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-between h-full min-h-[48px] pl-4">
          {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
          <div className="mt-2">{renderSparkline()}</div>
        </div>
      </CardContent>
    </Card>
  );
};
