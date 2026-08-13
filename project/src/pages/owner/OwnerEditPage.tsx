import { useEffect, useState } from 'react';
import { Save, Upload, Loader2 } from 'lucide-react';
import { businessService, categoryService, ownerService } from '@/services';
import type { Business, Category } from '@/types';
import { cn } from '@/utils/format';

export function OwnerEditPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([ownerService.getCurrent(), categoryService.getAll()]).then(
      async ([owner, categoryRows]) => {
        setCategories(categoryRows);
        const owned = await businessService.getByOwner(owner.id);
        setBusiness(owned[0] ?? null);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreview(null);
    }
  }, [coverFile]);

  const field = (key: keyof Business, value: string) => {
    setBusiness((b) => (b ? { ...b, [key]: value } : b));
    setNotice(null);
  };

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await businessService.update(business.id, business, {
        logo: logoFile || undefined,
        cover: coverFile || undefined,
      });
      if (updated) {
        setBusiness(updated);
        setLogoFile(null);
        setCoverFile(null);
      }
      setNotice({ type: 'success', text: 'Business profile saved successfully!' });
    } catch (err: unknown) {
      setNotice({ type: 'error', text: (err as Error).message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card mx-auto max-w-content p-8 text-center text-sm text-gray-500">Loading business profile...</div>;

  if (!business)
    return (
      <div className="card mx-auto max-w-content p-8 text-center text-sm text-gray-500">
        No owned business is available. Complete onboarding first.
      </div>
    );

  return (
    <div className="mx-auto max-w-content pb-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit business profile</h1>
          <p className="text-sm text-gray-500">Changes appear in the live preview.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : notice?.type === 'success' ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {notice && (
        <div
          className={cn(
            'mb-5 rounded-xl p-3 text-sm font-medium',
            notice.type === 'success'
              ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
              : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400'
          )}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" value={business.name} onChange={(v) => field('name', v)} />
            <Input label="Username" value={business.username} onChange={(v) => field('username', v)} />
            <label>
              <span className="label">Category</span>
              <select className="input" value={business.category} onChange={(e) => field('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <Input label="Phone" value={business.phone} onChange={(v) => field('phone', v)} />
            <Input label="WhatsApp" value={business.whatsapp} onChange={(v) => field('whatsapp', v)} />
            <Input label="Business email" value={business.email} onChange={(v) => field('email', v)} />
            <div className="sm:col-span-2">
              <Input label="Address" value={business.address} onChange={(v) => field('address', v)} />
            </div>
            <div className="sm:col-span-2">
              <label>
                <span className="label">Description</span>
                <textarea className="input resize-none" rows={4} value={business.description} onChange={(e) => field('description', e.target.value)} />
              </label>
            </div>
            <div className="sm:col-span-2"><Input label="Main products or services" value={business.servicesSummary ?? ''} onChange={(v) => field('servicesSummary', v)} /></div>
            <Input
              label="Instagram"
              value={business.socialLinks.instagram ?? ''}
              onChange={(v) => setBusiness((b) => (b ? { ...b, socialLinks: { ...b.socialLinks, instagram: v } } : b))}
            />
            <Input
              label="Website"
              value={business.socialLinks.website ?? ''}
              onChange={(v) => setBusiness((b) => (b ? { ...b, socialLinks: { ...b.socialLinks, website: v } } : b))}
            />
            <label><span className="label">Preferred content language</span><select className="input" value={business.preferredContentLanguage ?? 'Auto'} onChange={(e) => field('preferredContentLanguage', e.target.value)}><option>Auto</option><option>English</option><option>Hindi</option><option>Marathi</option></select></label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="btn-outline cursor-pointer">
              <Upload size={16} /> {logoFile ? `Logo selected: ${logoFile.name.slice(0, 15)}...` : 'Replace logo'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="btn-outline cursor-pointer">
              <Upload size={16} /> {coverFile ? `Cover selected: ${coverFile.name.slice(0, 15)}...` : 'Replace cover'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="mt-3 text-xs text-gray-400">Selected logo and cover files will be uploaded directly to Supabase Storage when you save.</p>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Live preview</p>
          <div className="overflow-hidden rounded-3xl border bg-white shadow-xl dark:bg-gray-900">
            <img src={coverPreview || business.coverUrl} className="h-32 w-full object-cover" alt="Preview cover" />
            <div className="p-5">
              <img src={logoPreview || business.logoUrl} className="-mt-12 h-16 w-16 rounded-2xl border-4 border-white object-cover shadow dark:border-gray-900" alt="Preview logo" />
              <h2 className="mt-3 text-xl font-bold">{business.name}</h2>
              <p className="text-sm text-gray-500">@{business.username}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{business.description}</p>
              <div className="mt-4 flex gap-2">
                <span className="btn-primary flex-1">Follow</span>
                <span className="btn-outline flex-1">Message</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
