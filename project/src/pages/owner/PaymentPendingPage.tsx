import { useEffect, useState } from 'react';
import { CalendarClock, Check, CheckCircle2, CreditCard, Loader2, LogOut, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/layout/Navigation';
import { razorpaySubscriptionService } from '@/services/razorpayService';
import { referralRewardsService } from '@/services/referralRewardsService';

const features = ['Permanent public business profile', 'Unlimited QR code', 'Deals, stories, and posts', 'Customer follows and messages', 'Analytics dashboard', 'Cancel at the end of a billing cycle'];

export function PaymentPendingPage() {
  const { profile, ownerBusiness, signOut, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

  useEffect(() => {
    if (!ownerBusiness?.businessId) return;
    void referralRewardsService.getBusinessReferral(ownerBusiness.businessId).then((referral) => {
      if (referral) { setReferralCode(referral.referralCode); setAppliedCode(referral.referralCode); }
    }).catch(() => undefined);
  }, [ownerBusiness?.businessId]);

  async function applyReferral(code: string | null) {
    if (!ownerBusiness?.businessId) return;
    setReferralBusy(true); setReferralMessage(''); setError('');
    try {
      const applied = await referralRewardsService.applyToBusiness(ownerBusiness.businessId, code);
      setAppliedCode(applied ? referralCode.trim().toUpperCase() : '');
      setReferralMessage(applied ? 'Referral code applied ✓' : 'Referral code removed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid referral code.'); }
    finally { setReferralBusy(false); }
  }

  async function subscribe() {
    setBusy(true); setError('');
    try {
      const checkout = await razorpaySubscriptionService.create();
      await razorpaySubscriptionService.openCheckout(checkout, profile?.email ?? null, async () => {
        const completion = await refreshProfile();
        window.location.assign(completion.destination ?? '/owner/analytics');
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start subscription checkout');
    } finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between"><Logo /><button id="payment-pending-signout" onClick={() => void signOut()} className="flex items-center gap-1.5 text-sm text-gray-500"><LogOut size={14} />Sign out</button></div>
      <div className="grid overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[1.1fr_.9fr]">
        <section className="p-7 md:p-9">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Founder.env Business</p>
          <h1 className="mt-3 text-3xl font-bold">Start your business subscription</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">Your profile is saved. Authorise Razorpay Autopay to activate <strong className="text-gray-800 dark:text-gray-200">{ownerBusiness?.businessName ?? 'your business'}</strong>.</p>
          <div className="mt-7 space-y-3">{features.map((feature) => <p key={feature} className="flex items-center gap-2.5 text-sm"><CheckCircle2 size={17} className="shrink-0 text-brand-600" />{feature}</p>)}</div>
          <div className="mt-7 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-200"><ShieldCheck className="mt-0.5 shrink-0" size={19} /><p>Payment details and mandate authentication are handled by Razorpay. Founder.env never receives your card or UPI credentials.</p></div>
          <div className="mt-5 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2"><Users size={18} className="text-brand-600" /><h2 className="font-semibold">Were you referred by someone?</h2></div>
            <label className="mt-3 block"><span className="label">E-Referral Code (Optional)</span><input className="input uppercase" placeholder="FE-________" value={referralCode} onChange={(event) => { setReferralCode(event.target.value); setReferralMessage(''); }} /></label>
            <p className="mt-2 text-xs leading-5 text-gray-500">Referral codes support the person who introduced you to Founder.env. Your Founder.env pricing does not change.</p>
            {referralMessage && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600"><Check size={15} />{referralMessage}</p>}
            <div className="mt-3 flex gap-2"><button disabled={referralBusy || !referralCode.trim()} onClick={() => void applyReferral(referralCode)} className="btn-outline text-xs">{referralBusy && <Loader2 size={14} className="animate-spin" />}Apply Code</button>{appliedCode && <button disabled={referralBusy} onClick={() => { setReferralCode(''); void applyReferral(null); }} className="px-3 text-xs font-semibold text-gray-500">Remove</button>}</div>
          </div>
        </section>
        <aside className="bg-gray-950 p-7 text-white md:p-9">
          <p className="text-sm text-gray-400">Due today</p><div className="mt-1 flex items-end gap-2"><span className="text-5xl font-bold">₹299</span><span className="pb-1 text-sm text-gray-400">one-time setup</span></div>
          <div className="my-6 h-px bg-white/10" />
          <p className="text-sm text-gray-400">Then</p><p className="mt-1 text-2xl font-bold">₹199/month</p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-400"><CalendarClock size={16} className="mt-0.5 shrink-0" />Your first monthly bill is scheduled exactly one calendar month after authorisation. The subscription runs for up to 24 monthly charges.</p>
          <button id="start-razorpay-subscription" disabled={busy} onClick={() => void subscribe()} className="btn-primary mt-7 w-full justify-center disabled:cursor-wait disabled:opacity-70">{busy ? <><Loader2 size={17} className="animate-spin" />Opening secure checkout…</> : <><CreditCard size={17} />Pay ₹299 &amp; Enable AutoPay</>}</button>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/15 p-3 text-xs text-red-200">{error}</p>}
          <p className="mt-4 text-center text-[11px] leading-4 text-gray-500">No ₹199 monthly charge is collected today. By continuing, you authorise ₹199/month AutoPay starting one calendar month after activation for up to 24 monthly billing cycles, unless cancelled under the applicable subscription terms.</p>
        </aside>
      </div>
    </div>
  </div>;
}
