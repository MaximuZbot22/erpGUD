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
  redAccent?: boolean;
  goldAccent?: boolean;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  description,
  trend,
  sparklineData,
  icon,
  redAccent = false,
  goldAccent = false
}) => {
  const isHighlighted = redAccent || goldAccent;

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

    const strokeColor = trend?.type === 'down' ? '#f43f5e' : (isHighlighted ? '#e50914' : '#e50914');

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
    <Card hoverEffect className="relative overflow-hidden bg-[#141414] border-[#262626]">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-heading">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-heading text-white">
              {value}
            </span>
            
            {trend && (
              <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                trend.type === 'up' 
                  ? 'bg-red-500/10 text-[#ff1e27] border border-red-500/20' 
                  : trend.type === 'down' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : 'bg-[#1e1e1e] text-zinc-400'
              }`}>
                {trend.type === 'up' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                {trend.type === 'down' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {trend.type === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
                {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-zinc-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-between h-full min-h-[48px] pl-4">
          {icon && <div className="p-2.5 rounded-xl border bg-[#181818] border-[#2a2a2a] text-[#e50914]">{icon}</div>}
          <div className="mt-2">{renderSparkline()}</div>
        </div>
      </CardContent>
    </Card>
  );
};
