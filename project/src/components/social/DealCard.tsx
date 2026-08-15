import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock, Tag, Bookmark, Flame, Check, Loader2, MoreHorizontal, Trash2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import { ShareButton } from '@/components/ui/ShareSheet';
import { formatCurrency, timeUntil, cn } from '@/utils/format';
import type { Deal } from '@/types';
import { dealService } from '@/services';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/auth/AuthProvider';
import type { DealClaim } from '@/types';

interface DealCardProps {
  deal: Deal;
  onClaim?: (deal: Deal) => void;
  compact?: boolean;
  onDeleted?: (dealId: string) => void;
}

export function DealCard({ deal: initialDeal, onClaim, compact, onDeleted }: DealCardProps) {
  const [deal, setDeal] = useState(initialDeal);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claim, setClaim] = useState<DealClaim | null>(null);
  const [actionError, setActionError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const now = Date.now();
  const isScheduled = Date.parse(deal.startDate) > now;
  const isExpired = Date.parse(deal.endDate) < now;
  const isSoldOut = deal.maxClaims > 0 && deal.claimedCount >= deal.maxClaims;
  const unavailableLabel = isScheduled ? 'Scheduled' : isExpired ? 'Expired' : isSoldOut ? 'Fully Claimed' : '';
  const isOwnBusiness = auth.profile?.role === 'business_owner' && auth.ownerBusiness?.businessId === deal.businessId;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      await dealService.remove(deal.id);
      setDeleteOpen(false);
      setMenuOpen(false);
      onDeleted?.(deal.id);
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'This deal could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClaim = () => {
    if (auth.isBackendMode && (!auth.user || auth.profile?.role !== 'customer')) {
      navigate('/auth', { state: { returnTo: location.pathname } });
      return;
    }
    if (deal.isClaimed) {
      setClaimOpen(true);
      return;
    }
    setActionError('');
    setClaimOpen(true);
  };

  const confirmClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    setActionError('');
    try {
      const result = await dealService.claim(deal.id);
      setDeal(result.deal);
      setClaim(result.claim);
      onClaim?.(result.deal);
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'This deal could not be claimed.');
    } finally {
      setClaiming(false);
    }
  };

  const toggleSave = async () => {
    if (auth.isBackendMode && (!auth.user || auth.profile?.role !== 'customer')) {
      navigate('/auth', { state: { returnTo: location.pathname } });
      return;
    }
    try {
      const updated = await dealService.toggleSave(deal.id);
      if (updated) setDeal(updated);
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'This deal could not be saved.');
    }
  };

  if (compact) {
    return (
      <Link
        to={`/business/${deal.businessUsername}/deals`}
        className="card overflow-hidden transition-all hover:shadow-md active:scale-[0.98] block"
      >
        <div className="relative h-32">
          {deal.mediaUrl ? <img src={deal.mediaUrl} alt={deal.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"><Tag size={32} /></div>}
          <span className="absolute top-2 left-2 badge bg-accent-500 text-white">
            <Flame size={12} /> {deal.discount}% OFF
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{deal.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{deal.businessName}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(deal.offerPrice)}</span>
            <span className="text-xs text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3 p-3">
        <Link to={`/business/${deal.businessUsername}`}>
          <Avatar src={deal.businessLogo} alt={deal.businessName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link to={`/business/${deal.businessUsername}`} className="text-sm font-semibold text-gray-900 hover:underline dark:text-gray-100 truncate">
              {deal.businessName}
            </Link>
            <VerifiedBadge size={14} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{deal.businessCategory} • {deal.city}</p>
        </div>
          <div className="flex items-center gap-2">
            <ShareButton title={`${deal.title} from ${deal.businessName}`} url={`/business/${deal.businessUsername}/deals`} />
            {isOwnBusiness && (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Manage deal">
                  {menuOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-10 z-50 min-w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950 animate-slide-up">
                      <button
                        type="button"
                        onClick={() => { setDeleteOpen(true); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        <Trash2 size={16} /> Delete Deal
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
      </div>

      <Link to={`/business/${deal.businessUsername}/deals`}>
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
          {deal.mediaUrl ? <img src={deal.mediaUrl} alt={deal.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"><Tag size={48} /></div>}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="badge bg-accent-500 text-white">
              <Flame size={12} /> {deal.discount}% OFF
            </span>
            {deal.isClaimed && (
              <span className="badge bg-success-500 text-white">
                <Check size={12} /> Claimed
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{deal.title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{deal.description}</p>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(deal.offerPrice)}</span>
            <span className="text-sm text-gray-400 line-through mb-0.5">{formatCurrency(deal.originalPrice)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={14} />
            {timeUntil(deal.endDate)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{deal.claimedCount}{deal.maxClaims > 0 ? ` of ${deal.maxClaims}` : ''} claimed</span>
          <div className="h-1.5 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${deal.maxClaims > 0 ? Math.min(100, (deal.claimedCount / deal.maxClaims) * 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleClaim}
            disabled={deal.isClaimed || Boolean(unavailableLabel)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]',
              deal.isClaimed
                ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            )}
          >
            <Tag size={16} />
            {deal.isClaimed ? 'Deal Claimed' : unavailableLabel || deal.ctaLabel}
          </button>
          <button
            onClick={() => void toggleSave()}
            className="rounded-xl border border-gray-200 p-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            aria-label="Save deal"
          >
            <Bookmark
              size={20}
              className={cn(
                deal.isSaved ? 'fill-gray-900 text-gray-900 dark:fill-white dark:text-white' : 'text-gray-500 dark:text-gray-400'
              )}
            />
          </button>
        </div>
        {actionError && <p className="mt-3 rounded-lg bg-error-50 p-2 text-xs text-error-600 dark:bg-error-500/10">{actionError}</p>}
      </div>
      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title={claim ? 'Deal Claimed' : 'Claim Deal'} size="sm">
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{deal.title}</p>
            <p className="mt-1 text-sm text-gray-500">{deal.businessName}</p>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{deal.description}</p>
          </div>
          {deal.terms && <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"><span className="font-semibold">Terms: </span>{deal.terms}</div>}
          {claim ? (
            <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-center dark:border-success-500/30 dark:bg-success-500/10">
              <Check className="mx-auto text-success-600" size={28} />
              <p className="mt-2 font-semibold text-success-700 dark:text-success-400">Deal Claimed</p>
              <p className="mt-3 text-xs text-gray-500">Show this code to the business</p>
              <p className="mt-1 break-all font-mono text-lg font-bold text-gray-900 dark:text-white">{claim.claimCode}</p>
            </div>
          ) : deal.isClaimed ? (
            <p className="rounded-lg bg-success-50 p-3 text-sm font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">This deal is already in your claimed deals.</p>
          ) : (
            <button type="button" onClick={() => void confirmClaim()} disabled={claiming} className="btn-primary w-full">
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
              {claiming ? 'Claiming...' : 'Confirm Claim'}
            </button>
          )}
          {actionError && <p className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">{actionError}</p>}
        </div>
      </Modal>
      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete this deal?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Customers will no longer be able to view or claim it. Deal claim history is preserved.</p>
          <div className="flex gap-3">
            <button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="btn-outline flex-1">Cancel</button>
            <button type="button" disabled={deleting} onClick={() => void handleDelete()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-error-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-700 disabled:opacity-60">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
