import React, { useState } from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  type: 'line' | 'bar' | 'area';
  data: ChartDataPoint[];
  height?: number;
  color?: 'emerald' | 'amber' | 'blue' | 'rose';
}

export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  height = 200,
  color = 'emerald'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return <div className="text-sm text-slate-400 text-center py-8">No data available</div>;

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = 500; // Fixed inner coordinate width, scales responsive via viewBox
  
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, 0); // Include 0
  const maxVal = Math.max(...values, 10);
  const range = maxVal - minVal;

  // Determine colors
  const colorMap = {
    emerald: {
      stroke: '#047857', // emerald-700
      fill: 'rgba(16, 185, 129, 0.1)', // emerald-500 10%
      bar: '#059669', // emerald-600
      hover: '#047857',
    },
    amber: {
      stroke: '#b45309', // amber-700
      fill: 'rgba(245, 158, 11, 0.1)',
      bar: '#d97706',
      hover: '#b45309',
    },
    blue: {
      stroke: '#1d4ed8',
      fill: 'rgba(59, 130, 246, 0.1)',
      bar: '#2563eb',
      hover: '#1d4ed8',
    },
    rose: {
      stroke: '#be123c',
      fill: 'rgba(244, 63, 94, 0.1)',
      bar: '#e11d48',
      hover: '#be123c',
    }
  };

  const currentTheme = colorMap[color];

  // Helper to map values to SVG Y coordinate
  const getY = (val: number) => {
    const ratio = (val - minVal) / range;
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Helper to map index to SVG X coordinate
  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (data.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  // SVG grid lines (horizontal ticks)
  const ticksCount = 4;
  const horizontalTicks = Array.from({ length: ticksCount + 1 }).map((_, idx) => {
    const val = minVal + (idx / ticksCount) * range;
    return {
      y: getY(val),
      value: val.toLocaleString(undefined, { maximumFractionDigits: 0 })
    };
  });

  // Calculate paths
  let linePath = '';
  let areaPath = '';
  
  if (type === 'line' || type === 'area') {
    const points = data.map((d, idx) => `${getX(idx)},${getY(d.value)}`);
    linePath = `M ${points.join(' L ')}`;
    
    if (type === 'area') {
      const bottomY = getY(0);
      areaPath = `${linePath} L ${getX(data.length - 1)},${bottomY} L ${getX(0)},${bottomY} Z`;
    }
  }

  // Width of each bar for bar chart
  const availableWidth = chartWidth - padding.left - padding.right;
  const barWidth = Math.min(25, (availableWidth / data.length) * 0.6);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        {/* Horizontal Gridlines */}
        {horizontalTicks.map((tick, idx) => (
          <g key={idx} className="opacity-40">
            <line
              x1={padding.left}
              y1={tick.y}
              x2={chartWidth - padding.right}
              y2={tick.y}
              stroke="#e2e8f0"
              className="dark:stroke-slate-800"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              className="fill-slate-400 dark:fill-slate-500 font-medium"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {data.map((d, idx) => {
          // Show every label if small dataset, or alternate labels to avoid collision
          const shouldShowLabel = data.length < 8 || idx % Math.ceil(data.length / 6) === 0;
          if (!shouldShowLabel) return null;

          return (
            <text
              key={idx}
              x={type === 'bar' 
                ? padding.left + (idx + 0.5) * (availableWidth / data.length)
                : getX(idx)
              }
              y={height - padding.bottom + 18}
              textAnchor="middle"
              fontSize="10"
              className="fill-slate-400 dark:fill-slate-500 font-medium"
            >
              {d.label}
            </text>
          );
        })}

        {/* Area Fill */}
        {type === 'area' && (
          <path d={areaPath} fill={currentTheme.fill} className="transition-all duration-300" />
        )}

        {/* Line Stroke */}
        {(type === 'line' || type === 'area') && (
          <path
            d={linePath}
            fill="none"
            stroke={currentTheme.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* Interactive Dots for Line / Area Chart */}
        {(type === 'line' || type === 'area') &&
          data.map((d, idx) => (
            <g key={idx}>
              <circle
                cx={getX(idx)}
                cy={getY(d.value)}
                r={hoveredIdx === idx ? 6 : 3.5}
                className="transition-all duration-150 cursor-pointer"
                fill={hoveredIdx === idx ? currentTheme.stroke : '#ffffff'}
                stroke={currentTheme.stroke}
                strokeWidth={hoveredIdx === idx ? 2 : 1.5}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}

        {/* Bar Chart Bars */}
        {type === 'bar' &&
          data.map((d, idx) => {
            const colWidth = availableWidth / data.length;
            const x = padding.left + idx * colWidth + (colWidth - barWidth) / 2;
            const zeroY = getY(0);
            const valY = getY(d.value);
            const isNegative = d.value < 0;

            const barHeight = Math.abs(zeroY - valY);
            const finalY = isNegative ? zeroY : valY;

            return (
              <rect
                key={idx}
                x={x}
                y={finalY}
                width={barWidth}
                height={Math.max(2, barHeight)} // min 2px height
                rx="3"
                className="transition-all duration-200 cursor-pointer"
                fill={hoveredIdx === idx ? currentTheme.hover : currentTheme.bar}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && (
        <div 
          className="absolute bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-1.5 rounded shadow-lg text-xs pointer-events-none transition-all duration-75"
          style={{
            left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
            top: `${(getY(data[hoveredIdx].value) / height) * 100 - 20}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold">{data[hoveredIdx].label}</div>
          <div>{data[hoveredIdx].value.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};
