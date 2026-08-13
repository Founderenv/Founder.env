import { Coins, ReceiptText, X } from 'lucide-react';
import type { FounderBill } from '@/services/v2Service';
import { formatCurrency } from '@/utils/format';

const statusLabel = (bill: FounderBill) => bill.status === 'cancelled' ? 'Cancelled' : bill.paymentStatus === 'paid' ? 'Paid' : bill.paymentStatus === 'processing' ? 'Processing' : 'Ready to Pay';

export function BillSheet({ bill, coinsAvailable, onClose }: { bill: FounderBill; coinsAvailable: number; onClose: () => void }) {
  const savings=bill.memberDiscount+bill.coinDiscount;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Your bill is ready">
    <div className="w-full max-w-md animate-slide-up overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-gray-950 sm:rounded-3xl">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Your bill is ready</p><h2 className="mt-1 text-xl font-bold">{bill.businessName || 'Founder.env Business'}</h2><p className="mt-1 text-xs text-white/70">Bill #{bill.invoiceNumber || bill.id.slice(0,8).toUpperCase()}</p></div><button onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close bill"><X size={18}/></button></div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        <div className="space-y-3 text-sm">
          <BillRow label="Original Bill" value={formatCurrency(bill.originalAmount)} />
          <BillRow label="Founder Benefit" value={`−${formatCurrency(bill.memberDiscount)}`} accent />
          <div className="my-3 border-t border-dashed border-gray-200 dark:border-gray-800" />
          <BillRow label="FE Coins Available" value={`${coinsAvailable.toFixed(2)} FE`} icon />
          <BillRow label="Eligible FE Coins" value={`${bill.coinDiscount.toFixed(2)} FE`} />
          <BillRow label="FE Coin Discount" value={`−${formatCurrency(bill.coinDiscount)}`} accent />
          <BillRow label="Total Savings" value={formatCurrency(savings)} accent />
        </div>
        <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900"><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Final Amount</p><div className="mt-1 flex items-end justify-between"><p className="text-3xl font-bold">{formatCurrency(bill.finalAmount)}</p><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">{statusLabel(bill)}</span></div></div>
        {bill.description && <p className="mt-3 text-sm text-gray-500">{bill.description}</p>}
        {bill.paymentStatus !== 'paid' && bill.status !== 'cancelled' && <button onClick={() => window.alert('Online payments are not configured during Early Access. Your bill remains safely ready to pay.')} className="btn-primary mt-5 w-full"><ReceiptText size={18}/> Continue</button>}
        <p className="mt-3 text-center text-xs text-gray-400">Amounts are securely calculated by Founder.env.</p>
      </div>
    </div>
  </div>;
}

function BillRow({label,value,accent=false,icon=false}:{label:string;value:string;accent?:boolean;icon?:boolean}){return <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-gray-500">{icon&&<Coins size={14}/>} {label}</span><span className={accent?'font-semibold text-success-600':'font-semibold'}>{value}</span></div>;}
