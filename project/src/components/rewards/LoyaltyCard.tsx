import { Gift, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/format';
import type { LoyaltyProgram } from '@/types';

export function LoyaltyCard({ program }: { program: LoyaltyProgram }) {
  const pct = (program.currentSteps / program.totalSteps) * 100;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider">{program.businessName}</p>
            <h3 className="text-lg font-bold mt-0.5">{program.name}</h3>
          </div>
          <Gift size={28} className="text-white/80" />
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {Array.from({ length: program.totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 flex-1 rounded-full transition-colors',
                i < program.currentSteps ? 'bg-white' : 'bg-white/25'
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-sm font-medium">
          {program.currentSteps}/{program.totalSteps} {program.type === 'visit' ? 'visits' : program.type === 'spend' ? 'points' : 'points'}
          {' • '}
          <span className="text-white/80">{program.nextReward}</span>
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Reward</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{program.rewardLabel}</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Progress</span>
          <span className="flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-500">
            <TrendingUp size={14} /> {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {program.history.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent activity</p>
            <div className="space-y-1.5">
              {program.history.slice(-3).reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{h.action}</span>
                  <span className="text-gray-400">+{h.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{program.terms}</p>
      </div>
    </div>
  );
}
