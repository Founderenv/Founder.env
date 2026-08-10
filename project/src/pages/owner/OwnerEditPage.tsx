import { useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { businessService, categoryService, ownerService, templateService } from '@/services';
import type { Business, BusinessTemplateConfig, Category } from '@/types';

export function OwnerEditPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<BusinessTemplateConfig[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => { void Promise.all([ownerService.getCurrent(), categoryService.getAll(), templateService.getAll()]).then(async ([owner, categoryRows, templateRows]) => { setCategories(categoryRows); setTemplates(templateRows); setBusiness((await businessService.getByOwner(owner.id))[0] ?? null); }); }, []);
  const field = (key: keyof Business, value: string) => { setBusiness((b) => b ? ({ ...b, [key]: value }) : b); setSaved(false); };
  if (!business) return <div className="card mx-auto max-w-content p-8 text-center text-sm text-gray-500">No owned business is available. Complete onboarding first.</div>;

  return (
    <div className="mx-auto max-w-content pb-10">
      <div className="mb-5 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Edit business profile</h1><p className="text-sm text-gray-500">Changes appear in the live preview.</p></div><button onClick={() => { void businessService.update(business.id, business).then(() => setSaved(true)); }} className="btn-primary"><Save size={16} />{saved ? 'Saved' : 'Save changes'}</button></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" value={business.name} onChange={(v) => field('name', v)} />
            <Input label="Username" value={business.username} onChange={(v) => field('username', v)} />
            <label><span className="label">Category</span><select className="input" value={business.category} onChange={(e) => field('category', e.target.value)}>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></label>
            <Input label="Phone" value={business.phone} onChange={(v) => field('phone', v)} />
            <Input label="WhatsApp" value={business.whatsapp} onChange={(v) => field('whatsapp', v)} />
            <Input label="Business email" value={business.email} onChange={(v) => field('email', v)} />
            <div className="sm:col-span-2"><Input label="Address" value={business.address} onChange={(v) => field('address', v)} /></div>
            <div className="sm:col-span-2"><label><span className="label">Description</span><textarea className="input resize-none" rows={4} value={business.description} onChange={(e) => field('description', e.target.value)} /></label></div>
            <Input label="Instagram" value={business.socialLinks.instagram ?? ''} onChange={(v) => setBusiness((b) => b ? ({ ...b, socialLinks: { ...b.socialLinks, instagram: v } }) : b)} />
            <Input label="Website" value={business.socialLinks.website ?? ''} onChange={(v) => setBusiness((b) => b ? ({ ...b, socialLinks: { ...b.socialLinks, website: v } }) : b)} />
            <label><span className="label">Template</span><select className="input" value={business.templateId} onChange={(e) => field('templateId', e.target.value)}>{templates.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
            <label><span className="label">Profile theme</span><select className="input" value={business.templateTheme} onChange={(e) => field('templateTheme', e.target.value)}><option value="default">Template default</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="btn-outline cursor-pointer"><Upload size={16} /> Replace logo<input type="file" className="hidden" accept="image/*" /></label><label className="btn-outline cursor-pointer"><Upload size={16} /> Replace cover<input type="file" className="hidden" accept="image/*" /></label></div>
          <p className="mt-3 text-xs text-gray-400">Image and gallery uploads remain local UI until Supabase Storage is connected. Opening-hours controls retain the current business schedule.</p>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Live preview</p><div className="overflow-hidden rounded-3xl border bg-white shadow-xl dark:bg-gray-900"><img src={business.coverUrl} className="h-32 w-full object-cover" alt="Preview cover" /><div className="p-5"><img src={business.logoUrl} className="-mt-12 h-16 w-16 rounded-2xl border-4 border-white object-cover dark:border-gray-900" alt="Preview logo" /><h2 className="mt-3 text-xl font-bold">{business.name}</h2><p className="text-sm text-gray-500">@{business.username}</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{business.description}</p><div className="mt-4 flex gap-2"><span className="btn-primary flex-1">Follow</span><span className="btn-outline flex-1">Message</span></div></div></div></div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><input className="input" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
