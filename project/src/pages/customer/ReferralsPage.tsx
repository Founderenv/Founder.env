import { useEffect, useState } from 'react';
import { Check, Copy, IndianRupee, Loader2, Share2, Store, WalletCards } from 'lucide-react';
import { referralRewardsService, type ReferralDashboard } from '@/services/referralRewardsService';

const VPA = /^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9.-]{1,63}$/;
const money = (paise: number) => `₹${Math.floor(paise / 100)}`;

export function ReferralsPage() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [editing, setEditing] = useState(false);
  const [upi, setUpi] = useState(''); const [payee, setPayee] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function refresh() { setData(await referralRewardsService.getDashboard()); }
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load referrals.')); }, []);

  async function enroll() {
    setError(''); setMessage('');
    if (!VPA.test(upi.trim())) { setError('Enter a valid UPI ID, for example yourname@upi.'); return; }
    setBusy(true);
    try { const next = await referralRewardsService.enroll(upi.trim(), payee.trim()); setData(next); setEditing(false); setMessage('Payout details saved. Your referral code is free and permanent.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save payout details.'); }
    finally { setBusy(false); }
  }
  async function copyCode() { if (data?.referralCode) { await navigator.clipboard.writeText(data.referralCode); setMessage('Referral code copied.'); } }
  async function share() {
    if (!data?.referralCode) return;
    const text = `Join Founder.env and use my referral code ${data.referralCode} when setting up your business. ${window.location.origin}`;
    try { if (navigator.share) await navigator.share({ title: 'Founder.env referral', text }); else { await navigator.clipboard.writeText(text); setMessage('Share message copied.'); } }
    catch (cause) { if ((cause as DOMException).name !== 'AbortError') { await navigator.clipboard.writeText(text); setMessage('Share message copied.'); } }
  }
  async function requestPayout() {
    setBusy(true); setError('');
    try { await referralRewardsService.requestPayout(); await refresh(); setMessage('₹150 payout requested. Your registered UPI was securely snapshotted.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not request payout.'); }
    finally { setBusy(false); }
  }

  if (!data && !error) return <div className="py-16"><Loader2 className="mx-auto animate-spin text-brand-600" /></div>;
  const enrolled = Boolean(data?.enrolled); const remaining = Math.max(0, 15000 - (data?.availablePaise ?? 0));
  return <div className="mx-auto max-w-2xl pb-8">
    <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Customer rewards</p><h1 className="mt-1 text-2xl font-bold">Refer &amp; Earn</h1><p className="mt-1 text-sm text-gray-500">Refer new local business owners to Founder.env.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">{message}</p>}
    {!enrolled || editing ? <Enrollment enrolled={enrolled} upi={upi} payee={payee} busy={busy} setUpi={setUpi} setPayee={setPayee} save={() => void enroll()} cancel={() => setEditing(false)} /> : data && <>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 to-indigo-950 p-5 text-white shadow-xl sm:p-7">
        <p className="text-sm text-white/60">Available for payout</p><p className="mt-1 text-4xl font-bold">{money(data.availablePaise)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><Stat label="Referral earnings" value={money(data.earnedPaise)} /><Stat label="Verified businesses" value={`${data.verifiedBusinesses}`} /></div>
        <div className="mt-5"><div className="flex justify-between text-xs text-white/70"><span>Progress</span><span>{Math.min(data.availablePaise / 2500, 6)} / 6</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.min(100, data.availablePaise / 150)}%` }} /></div><p className="mt-2 text-xs text-white/60">{remaining ? `${money(remaining)} more to unlock payout` : '₹150 payout is ready'}</p></div>
        <button disabled={busy || data.availablePaise < 15000} onClick={() => void requestPayout()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-gray-950 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="animate-spin" size={17} /> : <IndianRupee size={17} />}{data.availablePaise >= 15000 ? 'Request ₹150 Payout' : 'Withdraw ₹150'}</button>
      </section>
      <section className="card mt-4 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your E-Referral Code</p><p className="mt-2 break-all text-2xl font-black tracking-wide text-brand-600">{data.referralCode}</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void copyCode()} className="btn-outline justify-center"><Copy size={16} />Copy Code</button><button onClick={() => void share()} className="btn-primary justify-center"><Share2 size={16} />Share</button></div><p className="mt-3 text-xs text-gray-400">The referred owner receives no discount; Founder.env pricing stays the same.</p></section>
      <section className="card mt-4 p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payout UPI</p><p className="mt-1 font-semibold">{data.payoutUpi}</p>{data.payeeName && <p className="text-xs text-gray-500">{data.payeeName}</p>}</div><button onClick={() => { setUpi(data.payoutUpi ?? ''); setPayee(data.payeeName ?? ''); setEditing(true); }} className="text-sm font-semibold text-brand-600">Edit</button></div></section>
      <RecentReferrals items={data.recentReferrals} />
      {data.payoutRequests.length > 0 && <section className="mt-6"><h2 className="font-bold">Payout History</h2><div className="mt-3 space-y-2">{data.payoutRequests.map((item) => <div key={item.id} className="card flex items-center justify-between p-4"><div><p className="font-semibold">₹150 payout</p><p className="text-xs text-gray-500">{new Date(item.requested_at).toLocaleDateString()}</p></div><span className="flex items-center gap-1 text-sm font-semibold capitalize">{item.status === 'paid' && <Check size={15} className="text-green-600" />}{item.status.replace('_', ' ')}</span></div>)}</div></section>}
    </>}
  </div>;
}

function Enrollment({ enrolled, upi, payee, busy, setUpi, setPayee, save, cancel }: { enrolled: boolean; upi: string; payee: string; busy: boolean; setUpi: (v: string) => void; setPayee: (v: string) => void; save: () => void; cancel: () => void }) {
  return <section className="card p-5 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><WalletCards /></div><h2 className="mt-4 text-xl font-bold">{enrolled ? 'Edit payout UPI' : 'Start earning — free'}</h2>{!enrolled && <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300"><p>Earn <strong>₹25</strong> when a referred owner completes a verified ₹299 setup payment and their business activates.</p><p>Minimum payout is <strong>₹150</strong> — six verified businesses.</p><p className="font-semibold text-brand-600">No enrollment fee. No ₹19 payment. Referral codes are free.</p></div>}<div className="mt-5 space-y-4"><label className="block"><span className="label">UPI ID / VPA *</span><input autoCapitalize="none" className="input" placeholder="yourname@upi" value={upi} onChange={(event) => setUpi(event.target.value)} /><span className="mt-1 block text-xs text-gray-400">We never ask for your UPI PIN, OTP, or bank password.</span></label><label className="block"><span className="label">Payee name (optional)</span><input className="input" value={payee} onChange={(event) => setPayee(event.target.value)} /></label></div><div className="mt-5 flex gap-2"><button disabled={busy} onClick={save} className="btn-primary">{busy && <Loader2 size={16} className="animate-spin" />}Save &amp; Continue</button>{enrolled && <button onClick={cancel} className="btn-outline">Cancel</button>}</div></section>;
}
function RecentReferrals({ items }: { items: ReferralDashboard['recentReferrals'] }) { return <section className="mt-6"><h2 className="font-bold">Recent Referrals</h2><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Store size={18} /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.business_name}</p><p className="text-xs capitalize text-gray-500">{item.status.replace('_', ' ')}</p></div><span className={`text-sm font-semibold ${item.status === 'reward_earned' ? 'text-green-600' : 'text-amber-600'}`}>{item.status === 'reward_earned' ? '+₹25' : '₹25 pending'}</span></div>) : <p className="card p-6 text-center text-sm text-gray-500">Share your code with a new business owner to get started.</p>}</div></section>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-white/60">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
