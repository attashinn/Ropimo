"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

export type ChartCategory = {
  key: string;
  label?: string;
  color?: string; // hex or predefined token
};

const CHART_COLOR_PALETTE = [
  "#10251F", // Ropimo Ink
  "#C7F34A", // Ropimo Lime
  "#246244", // Ropimo Forest
  "#D97706", // Ropimo Amber
  "#3B82F6", // Blue
  "#D9383A", // Rose
  "#8FA89B", // Soft Sage
];

// Area / Line Chart
export interface RopimoAreaChartProps {
  data: ChartDataPoint[];
  index: string; // key for x-axis e.g. "date"
  categories: (string | ChartCategory)[];
  valueFormatter?: (value: number) => string;
  height?: number;
  showGridLines?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function RopimoAreaChart({
  data,
  index,
  categories,
  valueFormatter = (v) => String(v),
  height = 240,
  showGridLines = true,
  showLegend = true,
  showTooltip = true,
  className,
}: RopimoAreaChartProps) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const parsedCategories: ChartCategory[] = React.useMemo(() => {
    return categories.map((cat, i) => {
      if (typeof cat === "string") {
        return {
          key: cat,
          label: cat,
          color: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
        };
      }
      return {
        ...cat,
        label: cat.label || cat.key,
        color: cat.color || CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
      };
    });
  }, [categories]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-[14px] border border-[#D8DDD4] bg-[#FAF9F5] text-xs text-[#65706A]"
      >
        No chart data available
      </div>
    );
  }

  // Calculate scales
  let allValues: number[] = [];
  data.forEach((d) => {
    parsedCategories.forEach((c) => {
      const val = Number(d[c.key]) || 0;
      allValues.push(val);
    });
  });
  const maxVal = Math.max(...allValues, 10);
  const minVal = 0;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 500; // SVG viewBox coordinate width
  const chartHeight = height;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const getX = (i: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (i / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / (maxVal - minVal || 1);
    return padding.top + innerHeight - norm * innerHeight;
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {parsedCategories.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 font-medium text-[#18221E]">
              <span
                className="h-2.5 w-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: c.color }}
              />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative w-full overflow-hidden select-none" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {parsedCategories.map((c) => (
              <linearGradient
                key={`grad-${c.key}`}
                id={`grad-${c.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={c.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={c.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {showGridLines && (
            <g className="stroke-[#E7EADF]" strokeWidth="1" strokeDasharray="3 3">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + innerHeight * ratio;
                return (
                  <line
                    key={`grid-${ratio}`}
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                  />
                );
              })}
            </g>
          )}

          {/* Y Axis Labels */}
          <g className="fill-[#8A958F] text-[9px] font-mono font-medium">
            {[0, 0.5, 1].map((ratio) => {
              const val = Math.round(maxVal - ratio * (maxVal - minVal));
              const y = padding.top + innerHeight * ratio;
              return (
                <text
                  key={`y-label-${ratio}`}
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                >
                  {valueFormatter(val)}
                </text>
              );
            })}
          </g>

          {/* Area & Line for each category */}
          {parsedCategories.map((c) => {
            const points = data.map((d, i) => ({
              x: getX(i),
              y: getY(Number(d[c.key]) || 0),
            }));

            // Path generator
            const linePath = points.reduce((acc, pt, i) => {
              return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, "");

            const areaPath = `${linePath} L ${getX(data.length - 1)} ${padding.top + innerHeight} L ${getX(0)} ${padding.top + innerHeight} Z`;

            return (
              <g key={c.key}>
                <path d={areaPath} fill={`url(#grad-${c.key})`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke={c.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          <g className="fill-[#8A958F] text-[9px] font-medium">
            {data.map((d, i) => {
              if (data.length > 8 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) {
                return null;
              }
              const x = getX(i);
              return (
                <text
                  key={`x-label-${i}`}
                  x={x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                >
                  {String(d[index])}
                </text>
              );
            })}
          </g>

          {/* Hover Crosshair & Trigger Rectangles */}
          {data.map((_, i) => {
            const x = getX(i);
            const colWidth = innerWidth / (data.length || 1);

            return (
              <rect
                key={`trigger-${i}`}
                x={x - colWidth / 2}
                y={padding.top}
                width={colWidth}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#10251F"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {parsedCategories.map((c) => {
                const val = Number(data[hoverIndex][c.key]) || 0;
                return (
                  <circle
                    key={`dot-${c.key}`}
                    cx={getX(hoverIndex)}
                    cy={getY(val)}
                    r="4"
                    fill={c.color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Popup */}
        {showTooltip && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-[8px] bg-[#10251F] px-3 py-2 text-white shadow-elevated text-xs space-y-1"
            style={{
              left: `${(getX(hoverIndex) / chartWidth) * 100}%`,
              top: 10,
            }}
          >
            <p className="font-semibold text-[#C7F34A]">
              {String(data[hoverIndex][index])}
            </p>
            {parsedCategories.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-[#D8DDD4]">{c.label}:</span>
                </div>
                <span className="font-bold text-white">
                  {valueFormatter(Number(data[hoverIndex][c.key]) || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Donut / Pie Chart
export interface DonutDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface RopimoDonutChartProps {
  data: DonutDataPoint[];
  valueFormatter?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
}

export function RopimoDonutChart({
  data,
  valueFormatter = (v) => String(v),
  centerLabel,
  centerValue,
  size = 180,
  className,
}: RopimoDonutChartProps) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg] overflow-visible">
          {data.map((item, idx) => {
            const ratio = item.value / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeAngle * circumference;
            cumulativeAngle += ratio;
            const itemColor = item.color || CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length];
            const isHovered = hoverIndex === idx;

            return (
              <circle
                key={item.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={itemColor}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold tracking-tight text-[#18221E]">
            {centerValue !== undefined
              ? centerValue
              : hoverIndex !== null
              ? valueFormatter(data[hoverIndex].value)
              : total}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
            {hoverIndex !== null ? data[hoverIndex].name : centerLabel || "Total"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {data.map((item, idx) => {
          const itemColor = item.color || CHART_COLOR_PALETTE[idx % CHART_COLOR_PALETTE.length];
          return (
            <div
              key={item.name}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              className={cn(
                "flex items-center gap-1.5 cursor-pointer rounded-full px-2 py-0.5 transition-colors",
                hoverIndex === idx ? "bg-[#EAF4E2] font-semibold text-[#10251F]" : "text-[#65706A]"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: itemColor }} />
              <span>{item.name}</span>
              <span className="font-semibold text-[#18221E]">{valueFormatter(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Unified RopimoChart Component wrapper
export const RopimoChart = {
  Area: RopimoAreaChart,
  Donut: RopimoDonutChart,
};
