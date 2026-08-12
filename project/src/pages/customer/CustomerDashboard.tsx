import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, ReceiptText, Store } from 'lucide-react';
import { founderV2Service, paymentService, type FounderBill } from '@/services/v2Service';
import { formatCurrency } from '@/utils/format';

export function CustomerDashboard() {
  const [bills, setBills] = useState<FounderBill[]>([]); const [coins, setCoins] = useState(0); const [error, setError] = useState('');
  const load = () => Promise.all([founderV2Service.getMyBills(), founderV2Service.getCoinBalance()]).then(([nextBills, nextCoins]) => { setBills(nextBills); setCoins(nextCoins); }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your account.'));
  useEffect(() => { void load(); }, []);
  const pending = bills.filter((item) => item.paymentStatus !== 'paid'); const savings = bills.reduce((total, item) => total + item.memberDiscount + item.coinDiscount, 0);
  return <div className="mx-auto max-w-content pb-10"><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Founder.env member</p><h1 className="mt-1 text-2xl font-bold">Your Founder benefits</h1>
    {error && <p className="mt-3 rounded-xl bg-error-50 p-3 text-sm text-error-600">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric icon={Coins} label="FE Coin balance" value={coins.toFixed(2)} /><Metric icon={ReceiptText} label="Founder savings" value={formatCurrency(savings)} /><Metric icon={Store} label="Pending bills" value={String(pending.length)} /></div>
    <section className="card mt-6 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Your bills</h2><p className="text-sm text-gray-500">Verified payments earn FE Coins once.</p></div><Link className="btn-outline text-sm" to="/explore">Discover businesses</Link></div>
      <div className="mt-4 space-y-3">{bills.length === 0 ? <p className="text-sm text-gray-500">No bills yet. Follow a business and request your first bill.</p> : bills.map((item) => <div key={item.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><div className="flex justify-between gap-3"><div><p className="font-semibold">{formatCurrency(item.finalAmount)}</p><p className="text-xs text-gray-500">Saved {formatCurrency(item.memberDiscount + item.coinDiscount)} · {new Date(item.createdAt).toLocaleDateString()}</p></div><span className="text-sm font-medium">{item.paymentStatus === 'paid' ? 'Paid ✓' : 'Pending'}</span></div>{item.paymentStatus !== 'paid' && <button className="btn-primary mt-3 text-sm" onClick={() => void paymentService.createPayment(item.id).catch((e: Error) => setError(e.message))}>Pay now</button>}</div>)}</div>
    </section></div>;
}
function Metric({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) { return <div className="card p-4"><Icon size={18} className="text-brand-600" /><p className="mt-3 text-xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p></div>; }
