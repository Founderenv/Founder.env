import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Coins, ReceiptText, Users, WandSparkles } from 'lucide-react';
import { AIOrb } from '@/components/ai/AIOrb';
import { founderV2Service, type BillRequest, type FounderBill } from '@/services/v2Service';
import { formatCurrency } from '@/utils/format';
import { useAuth } from '@/auth/AuthProvider';
import { requireSupabase } from '@/lib/supabase';
import { FECoinWallet } from '@/components/rewards/FECoinWallet';
import type { CoinWallet } from '@/services/v2Service';

export function BusinessDashboard() {
  const { ownerBusiness } = useAuth(); const [params,setParams]=useSearchParams();
  const [requests, setRequests] = useState<BillRequest[]>([]); const [bills, setBills] = useState<FounderBill[]>([]); const [selected, setSelected] = useState<BillRequest | null>(null); const [amount, setAmount] = useState(''); const [error, setError] = useState('');
  const [wallet,setWallet]=useState<CoinWallet>({balance:0,earned:0,redeemed:0,transactions:[]});
  const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  const load = () => ownerBusiness?Promise.all([founderV2Service.getOwnerRequests(ownerBusiness.businessId), founderV2Service.getOwnerBills(ownerBusiness.businessId),founderV2Service.getCoinWallet(ownerBusiness.businessId)]).then(([r,b,w]) => { setRequests(r); setBills(b);setWallet(w); }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your business data.')):Promise.resolve();
  // AuthGate resolves the owner business before mounting this route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);
  useEffect(()=>{const target=params.get('request');if(!target)return;const match=requests.find((item)=>item.id===target);if(match){setSelected(match);setParams({}, {replace:true});}},[params,requests,setParams]);
  // The subscription is keyed only by the stable business id; callbacks read the latest rows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!ownerBusiness)return;const client=requireSupabase();const channel=client.channel(`owner-billing:${ownerBusiness.businessId}`).on('postgres_changes',{event:'*',schema:'public',table:'bill_requests',filter:`business_id=eq.${ownerBusiness.businessId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'bills',filter:`business_id=eq.${ownerBusiness.businessId}`},()=>void load()).subscribe();return()=>{void client.removeChannel(channel);};},[ownerBusiness?.businessId]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !selected || Number(amount) <= 0) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await founderV2Service.createBill(selected.id, { amount: Number(amount) });
      setSelected(null);
      setAmount('');
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not create bill.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const paid = bills.filter((item) => item.paymentStatus === 'paid'); const sales = paid.reduce((sum,item) => sum + item.finalAmount,0);
  return <div className="mx-auto max-w-content pb-10"><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Business network</p><h1 className="mt-1 text-2xl font-bold">Founder dashboard</h1>{error && <p className="mt-3 rounded-xl bg-error-50 p-3 text-sm text-error-600">{error}</p>}
    <Link to="/owner/ai-content" className="group relative mt-5 flex min-h-36 items-center justify-between overflow-hidden rounded-3xl bg-[#06100c] p-6 text-white shadow-xl"><div className="relative z-10 max-w-lg"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-300"><WandSparkles size={14}/>AI Content Studio</p><h2 className="mt-2 text-2xl font-bold">Create today's business post</h2><p className="mt-2 text-sm text-white/55">Your AI uses your saved business details to design a ready-to-share poster and caption.</p><span className="mt-4 inline-flex text-sm font-semibold text-brand-300 group-hover:text-brand-200">Start creating →</span></div><AIOrb compact/></Link>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Bill requests" value={String(requests.length)} /><Metric icon={ReceiptText} label="Paid bills" value={String(paid.length)} /><Metric icon={Coins} label="Founder sales" value={formatCurrency(sales)} /></div>
    <div className="mt-6"><FECoinWallet wallet={wallet} title="Business FE Coins" /></div>
    <section className="card mt-6 p-5"><h2 className="font-semibold">Bill requests</h2><p className="text-sm text-gray-500">Create a bill from a customer request; benefits are calculated by the database.</p><div className="mt-4 space-y-3">{requests.length === 0 ? <p className="text-sm text-gray-500">No pending bill requests.</p> : requests.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div><p className="font-medium">Customer request</p><p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p></div><button className="btn-primary text-sm" onClick={() => setSelected(item)}>Add bill</button></div>)}</div></section>
    <section className="card mt-6 p-5"><h2 className="font-semibold">Recent bills</h2><div className="mt-4 space-y-2">{bills.slice(0,8).map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{formatCurrency(item.finalAmount)} · {item.paymentStatus}</span><span className="text-gray-500">Saved {formatCurrency(item.memberDiscount + item.coinDiscount)}</span></div>)}</div></section>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><form onSubmit={submit} className="card w-full max-w-sm p-5"><h2 className="font-semibold">Add bill</h2><label className="mt-4 block text-sm">Amount<input autoFocus className="input mt-1 w-full" min="1" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</button><button className="btn-primary" disabled={saving || Number(amount) <= 0}>{saving ? 'Creating...' : 'Create bill'}</button></div></form></div>}
  </div>;
}
function Metric({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) { return <div className="card p-4"><Icon size={18} className="text-brand-600" /><p className="mt-3 text-xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p></div>; }
