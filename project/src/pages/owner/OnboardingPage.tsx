import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CreditCard, Image, MapPin, Store } from 'lucide-react';
import { categoryService, templateService } from '@/services';
import { dataMode } from '@/lib/supabase';
import type { BusinessTemplateConfig, Category } from '@/types';
import { cn } from '@/utils/format';

const steps = ['Account', 'Business', 'Username', 'Category', 'Logo', 'Cover', 'Location', 'Contact', 'Template', 'Preview', 'Activate'];

interface Draft {
  name: string; username: string; category: string; location: string; phone: string; whatsapp: string; email: string; template: string;
}

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<BusinessTemplateConfig[]>([]);
  const [draft, setDraft] = useState<Draft>(dataMode === 'mock' ? { name: 'Cafe Aroma', username: 'cafearoma', category: 'Cafe', location: 'Pune, Maharashtra', phone: '+91 98765 43210', whatsapp: '+91 98765 43210', email: 'hello@cafearoma.in', template: 'cafe_warm' } : { name: '', username: '', category: '', location: '', phone: '', whatsapp: '', email: '', template: '' });
  useEffect(() => { void Promise.all([categoryService.getAll(), templateService.getAll()]).then(([categoryRows, templateRows]) => { setCategories(categoryRows); setTemplates(templateRows); setDraft((value) => ({ ...value, category: value.category || categoryRows[0]?.name || '', template: value.template || templateRows[0]?.id || '' })); }); }, []);
  const update = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const selectedTemplate = templates.find((item) => item.id === draft.template) ?? templates[0];

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Business setup</p>
        <div className="mt-2 flex items-center justify-between"><h1 className="text-2xl font-bold">{steps[step]}</h1><span className="text-sm text-gray-500">{step + 1} / {steps.length}</span></div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>

      <div className="card min-h-[390px] p-5 sm:p-8">
        {step === 0 && <Intro icon={Store} title="Your account comes first" text="Supabase authentication will be connected in the backend phase. You can preview business setup now without creating a fake account." />}
        {step === 1 && <Field label="Business name" value={draft.name} onChange={(v) => update('name', v)} hint="Use the name customers know you by." />}
        {step === 2 && <Field label="Founder.env username" value={draft.username} onChange={(v) => update('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} prefix="founder.env/business/" hint="Usernames will be checked for availability when Supabase is connected." />}
        {step === 3 && <ChoiceGrid values={categories.map((c) => ({ id: c.name, name: c.name, detail: 'Business category' }))} active={draft.category} onChange={(v) => update('category', v)} />}
        {step === 4 && <UploadPlaceholder icon={Store} title="Add your business logo" detail="Square PNG or JPG, at least 400 × 400px" />}
        {step === 5 && <UploadPlaceholder icon={Image} title="Add a cover image" detail="Landscape image, recommended 1600 × 600px" />}
        {step === 6 && <div className="space-y-4"><Field label="Business location" value={draft.location} onChange={(v) => update('location', v)} /><div className="flex h-36 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500 dark:bg-gray-800"><MapPin className="mr-2" size={18} /> Map selection connects with the location backend later</div></div>}
        {step === 7 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={draft.phone} onChange={(v) => update('phone', v)} /><Field label="WhatsApp" value={draft.whatsapp} onChange={(v) => update('whatsapp', v)} /><div className="sm:col-span-2"><Field label="Business email" value={draft.email} onChange={(v) => update('email', v)} /></div></div>}
        {step === 8 && <ChoiceGrid values={templates.map((t) => ({ id: t.id, name: t.name, detail: t.description, color: t.accentColor }))} active={draft.template} onChange={(v) => update('template', v)} />}
        {step === 9 && <Preview draft={draft} accent={selectedTemplate?.accentColor ?? '#4f46e5'} />}
        {step === 10 && <Activation />}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-outline"><ArrowLeft size={16} /> Back</button>
        {step < steps.length - 1 ? <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="btn-primary">Continue <ArrowRight size={16} /></button> : <button onClick={() => window.alert('Payment integration pending. No payment was processed.')} className="btn-primary"><CreditCard size={16} /> Continue to secure payment</button>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, prefix }: { label: string; value: string; onChange: (v: string) => void; hint?: string; prefix?: string }) {
  return <label className="block"><span className="label">{label}</span>{prefix && <span className="mb-2 block text-xs text-gray-400">{prefix}<strong>{value || 'yourname'}</strong></span>}<input className="input" value={value} onChange={(e) => onChange(e.target.value)} />{hint && <span className="mt-2 block text-xs text-gray-400">{hint}</span>}</label>;
}

function Intro({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Icon size={30} /></div><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-2 max-w-md text-sm text-gray-500">{text}</p></div>;
}

function UploadPlaceholder({ icon: Icon, title, detail }: { icon: typeof Store; title: string; detail: string }) {
  return <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-center dark:border-gray-700"><Icon size={32} className="text-brand-600" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-xs text-gray-400">{detail}</p><label className="btn-outline mt-5 cursor-pointer">Choose image<input type="file" accept="image/*" className="hidden" /></label><p className="mt-3 text-xs text-gray-400">Local preview only; uploads require storage integration.</p></div>;
}

function ChoiceGrid({ values, active, onChange }: { values: { id: string; name: string; detail: string; color?: string }[]; active: string; onChange: (v: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">{values.map((value) => <button key={value.id} onClick={() => onChange(value.id)} className={cn('rounded-2xl border p-4 text-left transition', active === value.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'hover:border-gray-300 dark:hover:border-gray-700')}><div className="flex items-center gap-3">{value.color && <span className="h-8 w-8 rounded-xl" style={{ background: value.color }} />}<div><p className="text-sm font-semibold">{value.name}</p><p className="mt-0.5 text-xs text-gray-500">{value.detail}</p></div></div></button>)}</div>;
}

function Preview({ draft, accent }: { draft: Draft; accent: string }) {
  return <div className="mx-auto max-w-md overflow-hidden rounded-3xl border bg-white shadow-xl dark:bg-gray-900"><div className="h-28" style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }} /><div className="p-5"><div className="-mt-12 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gray-100 text-xl font-bold dark:border-gray-900 dark:bg-gray-800">{draft.name.charAt(0)}</div><h2 className="mt-3 text-xl font-bold">{draft.name}</h2><p className="text-sm text-gray-500">@{draft.username} · {draft.category}</p><p className="mt-2 text-sm text-gray-500">{draft.location}</p><div className="mt-4 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: accent }}>Follow</div></div></div>;
}

function Activation() {
  return <div className="mx-auto max-w-lg"><div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><CreditCard /></div><h2 className="mt-4 text-2xl font-bold">Activate your business</h2><p className="mt-1 text-sm text-gray-500">One-time activation. Payment is not simulated in this preview.</p></div><div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10"><div className="flex items-end justify-between"><div><p className="font-semibold">Founder.env Activation</p><p className="text-sm text-gray-500">Includes 30 days Founder.env Pro</p></div><p className="text-3xl font-bold">₹599</p></div><div className="mt-5 space-y-2">{['Permanent business profile', 'Smart QR and short link', '30 days of Pro features', 'Downgrades to Lite after grace period—profile stays live'].map((item) => <p key={item} className="flex items-center gap-2 text-sm"><Check size={16} className="text-brand-600" />{item}</p>)}</div></div></div>;
}
