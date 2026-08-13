import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, CreditCard, Gift, QrCode, Users } from 'lucide-react';
import { AnalyticsChart, MetricCard, TrafficSourceBar } from '@/components/admin/Analytics';
import { LoyaltyCard } from '@/components/rewards/LoyaltyCard';
import { QRCard, QRPoster } from '@/components/qr/QRCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { loyaltyMembers, loyaltyPrograms, payments, referralCampaigns, rewardCampaigns, subscriptions } from '@/mocks/data';
import { analyticsService, businessService, ownerService, subscriptionService } from '@/services';
import { dataMode, requireSupabase } from '@/lib/supabase';
import type { AnalyticsMetric, AnalyticsSeries, Business, Payment, Subscription, TrafficSource } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { razorpaySubscriptionService } from '@/services/razorpayService';

const allowed = ['qr', 'analytics', 'rewards', 'loyalty', 'referrals', 'subscription'];

export function OwnerPage() {
  const { section = 'analytics' } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  useEffect(() => { void ownerService.getCurrent().then((owner) => businessService.getByOwner(owner.id)).then((items) => setBusiness(items[0] ?? null)); }, []);
  const active = allowed.includes(section) ? section : 'analytics';
  const title = active === 'qr' ? 'Permanent QR' : active[0].toUpperCase() + active.slice(1);
  if (!business) return <div className="card mx-auto max-w-content p-8 text-center text-sm text-gray-500">No owned business is available yet. Complete business onboarding first.</div>;
  return <div className="mx-auto max-w-content pb-10"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{business.name} · Owner</p><h1 className="mt-1 text-2xl font-bold">{title}</h1></div>{active === 'qr' ? <QRSection business={business} /> : active === 'analytics' ? <AnalyticsSection businessId={business.id} /> : active === 'rewards' ? <RewardsManager /> : active === 'loyalty' ? <LoyaltyManager /> : active === 'referrals' ? <ReferralManager /> : <SubscriptionManager businessId={business.id} />}</div>;
}

function QRSection({ business }: { business: Business }) {
  const [poster, setPoster] = useState(false);
  return <div className="grid gap-5 lg:grid-cols-2"><QRCard business={business} /><div className="card p-5"><h2 className="font-semibold">QR toolkit</h2><p className="mt-1 text-sm text-gray-500">This permanent code always opens the public business page without forcing login.</p><button onClick={() => setPoster((v) => !v)} className="btn-outline mt-5 w-full"><QrCode size={16} />{poster ? 'Hide poster' : 'Generate poster preview'}</button>{poster && <div className="mt-5"><QRPoster business={business} /></div>}</div></div>;
}

function AnalyticsSection({ businessId }: { businessId: string }) {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]); const [series, setSeries] = useState<AnalyticsSeries[]>([]); const [sources, setSources] = useState<TrafficSource[]>([]); const [range, setRange] = useState('7 Days');
  const load=useCallback(()=>analyticsService.getOwnerMetrics(businessId).then((data) => { setMetrics(data.metrics); setSeries(data.series); setSources(data.trafficSources); }),[businessId]);
  useEffect(() => { void load();if(dataMode!=='supabase')return;const client=requireSupabase();const channel=client.channel(`owner-analytics:${businessId}`).on('postgres_changes',{event:'*',schema:'public',table:'business_followers',filter:`business_id=eq.${businessId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'bill_requests',filter:`business_id=eq.${businessId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'bills',filter:`business_id=eq.${businessId}`},()=>void load()).subscribe();return()=>{void client.removeChannel(channel);}; }, [businessId,load]);
  return <div><div className="mb-5 flex gap-2 overflow-x-auto">{['Today', '7 Days', '30 Days', '90 Days'].map((item) => <button key={item} onClick={() => setRange(item)} className={range === item ? 'btn-primary whitespace-nowrap' : 'btn-outline whitespace-nowrap'}>{item}</button>)}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-2">{series.map((item) => <AnalyticsChart key={item.label} series={item} />)}<div className="card p-5"><h2 className="font-semibold">Traffic sources</h2><div className="mt-4"><TrafficSourceBar sources={sources} /></div></div></div><p className="mt-4 text-xs text-gray-400">Showing {range.toLowerCase()} analytics events available to this business.</p></div>;
}

function RewardsManager() {
  if (dataMode === 'supabase') return <BackendConfigurationNotice feature="Reward campaign editing" />;
  const campaign = rewardCampaigns[0];
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><FormCard title="Reward campaign" description="Create welcome, milestone, or promotional rewards."><Input label="Campaign name" defaultValue={campaign?.name} /><Input label="Reward" defaultValue={campaign?.rewardTitle} /><Input label="Value" defaultValue={campaign?.rewardValue} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Maximum rewards" type="number" defaultValue={String(campaign?.maxRewards ?? 100)} /><Input label="End date" type="date" /></div><PendingButton /></FormCard><Summary icon={Gift} title="Active campaign" lines={[campaign?.name ?? 'Welcome reward', `${campaign?.issuedCount ?? 0} issued`, `${campaign?.maxRewards ?? 0} maximum rewards`]} /></div>;
}

function LoyaltyManager() {
  if (dataMode === 'supabase') return <BackendConfigurationNotice feature="Loyalty program editing" />;
  return <div className="grid gap-5 lg:grid-cols-[1fr_380px]"><FormCard title="Loyalty program" description="Configure visit, points, or spend-based loyalty."><label><span className="label">Program type</span><select className="input"><option>Visit-based</option><option>Points-based</option><option>Spend-based</option></select></label><Input label="Program name" defaultValue="Cafe Aroma Loyalty" /><Input label="Milestone" type="number" defaultValue="5" /><Input label="Reward" defaultValue="Free Coffee" /><textarea className="input resize-none" rows={3} defaultValue="One visit per paid bill. Reward expires after 30 days." /><PendingButton /></FormCard><div><LoyaltyCard program={loyaltyPrograms[0]} /><div className="card mt-4 p-4"><h3 className="font-semibold">Members</h3><p className="mt-1 text-sm text-gray-500">{loyaltyMembers.length} members · {loyaltyMembers.filter((m) => m.isRepeatCustomer).length} repeat customers</p></div></div></div>;
}

function ReferralManager() {
  if (dataMode === 'supabase') return <BackendConfigurationNotice feature="Referral campaign editing" />;
  const campaign = referralCampaigns[0];
  const stats = [['Referral Shares', campaign.shares], ['Referred Customers', campaign.referredCount], ['Qualified Referrals', campaign.qualifiedCount], ['Rewards Issued', campaign.rewardedCount]] as const;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([label, value]) => <div className="card p-4" key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><FormCard title="Referral campaign" description="Customers refer friends to your business."><Input label="Campaign name" defaultValue={campaign.name} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Friend reward" defaultValue={campaign.friendReward} /><Input label="Referrer reward" defaultValue={campaign.referrerReward} /></div><Input label="Qualifying action" defaultValue={campaign.qualifyingAction} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Minimum purchase" type="number" defaultValue={String(campaign.minimumPurchase)} /><Input label="Maximum rewards" type="number" defaultValue={String(campaign.maxRewards)} /></div><PendingButton /></FormCard><Summary icon={Users} title={campaign.name} lines={[`Friend gets ${campaign.friendReward}`, `Referrer gets ${campaign.referrerReward}`, campaign.isActive ? 'Campaign active' : 'Campaign paused']} /></div></div>;
}

function SubscriptionManager({ businessId }: { businessId: string }) {
  const [liveSubscription, setLiveSubscription] = useState<Subscription | null>(null);
  const [livePayments, setLivePayments] = useState<Payment[]>([]);
  const [actionMessage,setActionMessage]=useState(''); const [cancelling,setCancelling]=useState(false);
  const loadSubscription=useCallback(()=>Promise.all([subscriptionService.getByBusiness(businessId), subscriptionService.getPayments(businessId)]).then(([sub, history]) => { setLiveSubscription(sub); setLivePayments(history); }),[businessId]);
  useEffect(() => { if (dataMode === 'supabase') void loadSubscription(); }, [loadSubscription]);
  const sub = dataMode === 'supabase' ? liveSubscription : subscriptions[0]; const history = dataMode === 'supabase' ? livePayments : payments.filter((payment) => payment.businessId === businessId);
  if (!sub) return <BackendConfigurationNotice feature="Subscription details" />;
  const manual=sub.activationType&&sub.activationType!=='razorpay'&&sub.activationType!=='pending';
  const completed=sub.providerStatus==='completed'||sub.status==='expired';
  const paymentIssue=sub.status==='failed'||sub.providerStatus==='pending'||sub.providerStatus==='halted';
  const cancel=async()=>{if(!window.confirm('Cancel automatic renewal at the end of the current billing cycle?'))return;setCancelling(true);setActionMessage('');try{await razorpaySubscriptionService.cancel();await loadSubscription();setActionMessage('Cancellation scheduled. Access continues through the current billing cycle.');}catch(error){setActionMessage(error instanceof Error?error.message:'Could not schedule cancellation');}finally{setCancelling(false);}};
  return <div className="grid gap-5 lg:grid-cols-[1fr_380px]"><div className="space-y-5"><div className="card p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">Current plan</p><h2 className="mt-1 text-2xl font-bold capitalize">{sub.plan}</h2></div><StatusBadge status={sub.providerStatus||sub.status} variant={sub.status==='active'?'success':'warning'} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Setup payment" value={manual?'Waived':sub.setupFeePaid?'₹299 paid':'Pending'} /><Info label="Autopay mandate" value={manual?'Not required':sub.autopayAuthorized?'Authorised':'Pending'} /><Info label="Next billing" value={completed?'No further charges':sub.nextBillingDate ? formatDate(sub.nextBillingDate) : 'Not scheduled'} /><Info label="Monthly plan" value={manual?'Manual access':'₹199/month'} /><Info label="Payments completed" value={manual?'Not applicable':`${sub.paidCount??0} of ${sub.totalCount??24}`} /><Info label="Renewal" value={manual?'Managed by Founder.env':completed?'Completed':sub.cancelAtPeriodEnd?'Cancels at cycle end':'Automatic'} /></div>{paymentIssue&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><strong>Payment Issue.</strong> Your ₹199 monthly AutoPay could not be completed. Razorpay may retry; your business data is preserved.</p>}{sub.activationType==='razorpay'&&!sub.cancelAtPeriodEnd&&!completed&&<button disabled={cancelling} onClick={()=>void cancel()} className="btn-outline mt-5">{cancelling?'Scheduling…':'Cancel at cycle end'}</button>}{actionMessage&&<p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800">{actionMessage}</p>}</div><div className="card overflow-hidden"><div className="border-b p-4"><h2 className="font-semibold">Payment history</h2></div><div className="divide-y">{history.length === 0 ? <p className="p-4 text-sm text-gray-500">No payment history.</p> : history.map((payment) => <div key={payment.id} className="flex items-center justify-between p-4"><div><p className="text-sm font-medium capitalize">{payment.type}</p><p className="text-xs text-gray-500">{formatDate(payment.date)}{payment.invoiceId?` · ${payment.invoiceId}`:''}</p></div><p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p></div>)}</div></div></div><Summary icon={CreditCard} title={manual?'Founder.env access':completed?'Subscription completed':'Razorpay subscription'} lines={manual?['Existing manual activation preserved','No Razorpay mandate required','Business data remains available']:completed?['24-cycle subscription completed','No further charges scheduled','Business data remains available']:[sub.setupFeePaid?'₹299 setup paid':'₹299 setup pending','₹199 monthly from the scheduled date','24 monthly charges maximum',sub.cancelAtPeriodEnd?'Cancellation scheduled':'Cancel at the end of a cycle']} /></div>;
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="card p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-gray-500">{description}</p><div className="mt-5 space-y-4">{children}</div></div>; }
function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label><span className="label">{label}</span><input className="input" {...props} /></label>; }
function PendingButton() { return <button onClick={() => window.alert('Saved locally for preview. Backend persistence is pending.')} className="btn-primary w-full"><Check size={16} /> Save configuration</button>; }
function Summary({ icon: Icon, title, lines }: { icon: typeof Gift; title: string; lines: string[] }) { return <div className="card self-start p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Icon /></div><h2 className="mt-4 font-semibold">{title}</h2><div className="mt-3 space-y-2">{lines.map((line) => <p key={line} className="flex items-center gap-2 text-sm text-gray-500"><Check size={14} className="text-brand-600" />{line}</p>)}</div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function BackendConfigurationNotice({ feature }: { feature: string }) { return <div className="card p-8 text-center"><h2 className="font-semibold">{feature}</h2><p className="mt-2 text-sm text-gray-500">The secure database model is ready. This write workflow remains disabled until its server-authorized mutation is added.</p></div>; }
