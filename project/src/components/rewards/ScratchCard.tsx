import { useState } from 'react';
import { Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/format';
import type { ScratchCampaign, ScratchResult } from '@/types';
import { scratchService } from '@/services';

export function ScratchCard({ campaign }: { campaign: ScratchCampaign }) {
  const [result, setResult] = useState<ScratchResult | null>(null);
  const [scratching, setScratching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const handlePlay = () => {
    if (revealed) return;
    setScratching(true);
    scratchService.play(campaign.id).then((r) => {
      setResult(r);
      setScratching(false);
      setRevealed(true);
    });
  };

  const handleReset = () => {
    setResult(null);
    setRevealed(false);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <Avatar src={campaign.businessLogo} alt={campaign.businessName} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-accent-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.name}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{campaign.businessName} • Min bill ₹{campaign.minimumBill}</p>
        </div>
      </div>

      <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-100 to-accent-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
        {!revealed && !scratching && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Sparkles size={28} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scratch to reveal your reward</p>
            <button onClick={handlePlay} className="mt-3 btn-primary">
              Scratch Now
            </button>
            <p className="mt-2 text-xs text-gray-400">Demo outcome only. Production rewards will be decided and signed server-side.</p>
          </div>
        )}

        {scratching && (
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Revealing...</p>
          </div>
        )}

        {revealed && result && (
          <div className="text-center animate-scale-in">
            <div className={cn(
              'mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl',
              result.isWin ? 'bg-success-50 dark:bg-success-500/10' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              {result.isWin ? <Check size={32} className="text-success-600" /> : <AlertCircle size={32} className="text-gray-400" />}
            </div>
            <p className={cn(
              'text-xl font-bold',
              result.isWin ? 'text-success-600' : 'text-gray-500 dark:text-gray-400'
            )}>
              {result.label}
            </p>
            <button onClick={handleReset} className="mt-3 btn-outline text-xs">
              <RefreshCw size={14} /> Play Again
            </button>
          </div>
        )}
      </div>

      {campaign.rewards.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Possible rewards</p>
          <div className="flex flex-wrap gap-2">
            {campaign.rewards.map((r) => (
              <span key={r.outcome} className={cn(
                'badge',
                r.outcome === 'better_luck' ? 'bg-gray-100 text-gray-500 dark:bg-gray-800' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-500'
              )}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
