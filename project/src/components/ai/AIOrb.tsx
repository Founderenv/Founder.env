import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/format';

export function AIOrb({ compact=false }: { compact?:boolean }){
  return <div className={cn('ai-orb relative grid shrink-0 place-items-center',compact?'h-16 w-16':'h-32 w-32 sm:h-40 sm:w-40')} aria-hidden="true"><div className="ai-orb-ring absolute inset-0 rounded-full"/><div className="ai-orb-core absolute inset-[18%] rounded-full"/><div className="ai-orb-glow absolute inset-[8%] rounded-full blur-xl"/><Sparkles className="relative z-10 text-white" size={compact?22:38}/></div>;
}
