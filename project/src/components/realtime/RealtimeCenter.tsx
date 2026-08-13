import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { notificationService } from '@/services';
import { founderV2Service, type FounderBill } from '@/services/v2Service';
import { BillSheet } from '@/components/billing/BillSheet';
import type { Notification } from '@/types';

const realtimeNotifications=notificationService as typeof notificationService&{subscribe?:(callback:(notification:Notification)=>void)=>()=>void};

export function RealtimeCenter(){const{user,profile}=useAuth();const userId=user?.id;const navigate=useNavigate();const[notice,setNotice]=useState<Notification|null>(null);const[bill,setBill]=useState<FounderBill|null>(null);const[coins,setCoins]=useState(0);
  useEffect(()=>{setNotice(null);setBill(null);setCoins(0);let active=true;if(!userId||!realtimeNotifications.subscribe)return()=>{active=false;};const unsubscribe=realtimeNotifications.subscribe((incoming)=>{if(!active)return;setNotice(incoming);window.dispatchEvent(new CustomEvent('founder:notifications-changed'));if(incoming.entityType==='bill'&&incoming.entityId&&profile?.role==='customer'){void Promise.all([founderV2Service.getBill(incoming.entityId),founderV2Service.getCoinBalance()]).then(([nextBill,balance])=>{if(active&&nextBill){setCoins(balance);setBill(nextBill);}});}});return()=>{active=false;unsubscribe();};},[profile?.role,userId]);
  const act=()=>{if(!notice)return;void notificationService.markRead(notice.id);if(notice.actionLink)navigate(notice.actionLink);setNotice(null);};
  return <>{notice&&<div className="fixed left-3 right-3 top-16 z-[65] mx-auto max-w-md animate-slide-up rounded-2xl border border-brand-100 bg-white p-4 shadow-xl dark:border-brand-900 dark:bg-gray-900"><div className="flex items-start gap-3"><div className="rounded-full bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/10"><Bell size={18}/></div><div className="min-w-0 flex-1"><p className="font-semibold">{notice.title}</p><p className="mt-0.5 text-sm text-gray-500">{notice.body}</p>{notice.actionLabel&&<button onClick={act} className="btn-primary mt-3 text-sm">{notice.actionLabel}</button>}</div><button onClick={()=>setNotice(null)} aria-label="Dismiss notification" className="p-1 text-gray-400"><X size={17}/></button></div></div>}{bill&&<BillSheet bill={bill} coinsAvailable={coins} onClose={()=>setBill(null)}/>}</>;
}
