import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/utils/format';
import type { AnalyticsMetric, AnalyticsSeries, TrafficSource } from '@/types';

export function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const formatValue = () => {
    if (metric.format === 'currency') return formatCurrency(metric.value);
    if (metric.format === 'percent') return metric.value + '%';
    return formatNumber(metric.value);
  };

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-success-600' : metric.trend === 'down' ? 'text-error-500' : 'text-gray-400';

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
      <div className="mt-1.5 flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatValue()}</span>
        <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
          <TrendIcon size={14} />
          {metric.change > 0 ? '+' : ''}{metric.change}%
        </span>
      </div>
    </div>
  );
}

export function AnalyticsChart({ series }: { series: AnalyticsSeries }) {
  const maxVal = Math.max(...series.data.map((d) => d.value), 1);
  const width = 100;
  const height = 120;
  const step = width / (series.data.length - 1 || 1);
  const points = series.data.map((d, i) => `${i * step},${height - (d.value / maxVal) * height}`);
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{series.label}</h3>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${series.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1bb370" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1bb370" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#grad-${series.label})`} />
          <path d={pathD} fill="none" stroke="#1bb370" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {series.data.map((d, i) => (
            <circle key={i} cx={i * step} cy={height - (d.value / maxVal) * height} r="1.5" fill="#1bb370" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        {series.data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function TrafficSourceBar({ sources }: { sources: TrafficSource[] }) {
  const total = sources.reduce((s, src) => s + src.percentage, 0) || 1;
  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-accent-500', 'bg-amber-500', 'bg-purple-500'];

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Traffic Sources</h3>
      <div className="flex h-3 overflow-hidden rounded-full">
        {sources.map((src, i) => (
          <div
            key={src.source}
            className={cn(colors[i % colors.length], 'transition-all hover:opacity-80')}
            style={{ width: `${(src.percentage / total) * 100}%` }}
            title={`${src.source}: ${src.percentage}%`}
          />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {sources.map((src, i) => (
          <div key={src.source} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', colors[i % colors.length])} />
              <span className="text-gray-700 dark:text-gray-300">{src.source}</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{src.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
