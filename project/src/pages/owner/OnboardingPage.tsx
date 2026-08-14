import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, Image as ImageIcon, MapPin, Store, Loader2, Users, Gift } from 'lucide-react';
import { businessService, categoryService } from '@/services';
import { dataMode } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { referralRewardsService } from '@/services/referralRewardsService';
import type { Category } from '@/types';
import { cn } from '@/utils/format';

const steps = ['Account', 'Business', 'Username', 'Category', 'Logo', 'Cover', 'Location', 'Contact', 'Preview', 'Referral', 'Activate'];

interface Draft {
  name: string;
  username: string;
  category: string;
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  description: string;
  services: string;
  preferredLanguage: 'Auto' | 'English' | 'Hindi' | 'Marathi';
  address: string;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, completeBusinessOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Business is created ONCE for the onboarding, just before the Referral step
  // (so a referral can be attached before the ₹299 payment), then finalised at
  // the Activate step. businessIdRef survives re-renders and re-entrancy. The
  // in-memory value can be lost on refresh/back, so ensureBusiness re-resolves
  // the owned business server-side instead of inserting a duplicate.
  const businessIdRef = useRef<string | null>(null);
  const inFlightBusiness = useRef<Promise<string> | null>(null);
  const [preparing, setPreparing] = useState(false);

  // Referral state
  const [referralCode, setReferralCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');
  const [referralError, setReferralError] = useState('');

  const [draft, setDraft] = useState<Draft>(
    dataMode === 'mock'
      ? {
          name: 'Cafe Aroma',
          username: 'cafearoma',
          category: 'Cafe',
          location: 'Pune, Maharashtra',
          phone: '+91 98765 43210',
          whatsapp: '+91 98765 43210',
          email: 'hello@cafearoma.in',
          description: 'Artisanal coffee house and organic bakery',
          services: 'Speciality coffee, fresh bakery, breakfast',
          preferredLanguage: 'Auto',
          address: 'Main Street, Pune',
        }
      : {
          name: '',
          username: '',
          category: '',
          location: '',
          phone: '',
          whatsapp: '',
          email: '',
          description: '',
          services: '',
          preferredLanguage: 'Auto',
          address: '',
        }
  );

  useEffect(() => {
    void categoryService.getAll().then((categoryRows) => {
      setCategories(categoryRows);
      setDraft((value) => ({
        ...value,
        category: value.category || categoryRows[0]?.name || '',
      }));
    });
  }, []);

  const update = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const buildInput = () => ({
    name: draft.name,
    username: draft.username,
    category: draft.category,
    location: draft.location,
    address: draft.address || draft.location,
    phone: draft.phone,
    whatsapp: draft.whatsapp,
    email: draft.email,
    description: draft.description,
    templateId: 'minimal_premium' as const,
    servicesSummary: draft.services,
    preferredContentLanguage: draft.preferredLanguage,
  });

  const ensureBusiness = async (): Promise<string> => {
    if (businessIdRef.current) return businessIdRef.current;
    if (!draft.name.trim() || !draft.username.trim()) {
      setStatusMessage({ type: 'error', text: 'Business name and username are required.' });
      throw new Error('Business name and username are required.');
    }
    if (inFlightBusiness.current) return inFlightBusiness.current;
    const task = (async () => {
      setPreparing(true);
      setStatusMessage(null);
      // ONE business owner => ONE business record. If a business already exists
      // for the current owner (e.g. businessId state was lost after refresh or
      // back-navigation), reuse it rather than inserting a duplicate username.
      if (dataMode === 'supabase' && user?.id) {
        const owned = await businessService.getByOwner(user.id);
        if (owned && owned.length) {
          businessIdRef.current = owned[0].id;
          return owned[0].id;
        }
      }
      const created = await businessService.create(buildInput(), {
        logo: logoFile || undefined,
        cover: coverFile || undefined,
      });
      businessIdRef.current = created.id;
      return created.id;
    })().finally(() => { inFlightBusiness.current = null; setPreparing(false); });
    inFlightBusiness.current = task;
    return task;
  };

  async function applyReferral(code: string | null) {
    setReferralBusy(true);
    setReferralMessage('');
    setReferralError('');
    try {
      const id = await ensureBusiness();
      const applied = await referralRewardsService.applyToBusiness(id, code);
      setAppliedCode(applied ? referralCode.trim().toUpperCase() : '');
      setReferralMessage(applied ? 'Referral code applied ✓' : 'Referral code removed.');
    } catch (cause) {
      setReferralError(cause instanceof Error ? cause.message : 'Invalid referral code.');
    } finally {
      setReferralBusy(false);
    }
  }

  const handleSaveBusiness = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatusMessage(null);
    try {
      // Business already exists (created at the Referral step); finalise setup.
      await ensureBusiness();
      if (dataMode === 'supabase') {
        await completeBusinessOnboarding();
      }
      setStatusMessage({ type: 'success', text: 'Business profile saved! Opening your dashboard…' });
      navigate('/business/dashboard', { replace: true });
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: (err as Error).message || 'Failed to save business profile.' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Business setup</p>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{steps[step]}</h1>
          <span className="text-sm text-gray-500">{step + 1} / {steps.length}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="card min-h-[390px] p-5 sm:p-8">
        {statusMessage && (
          <div className={cn('mb-4 rounded-xl p-3 text-sm font-medium', statusMessage.type === 'success' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400')}>
            {statusMessage.text}
          </div>
        )}

        {step === 0 && <Intro icon={Store} title="Your account comes first" text="Create your business profile on Founder.env to connect with customers and showcase your offerings." />}
        {step === 1 && <div className="space-y-4"><Field label="Business name" value={draft.name} onChange={(v) => update('name', v)} hint="Use the name customers know you by." /><Field label="Business description" value={draft.description} onChange={(v) => update('description', v)} placeholder="What makes your business useful or special?" /><Field label="Main products or services" value={draft.services} onChange={(v) => update('services', v)} placeholder="For example: haircuts, bridal styling, skincare" /></div>}
        {step === 2 && <Field label="Founder.env username" value={draft.username} onChange={(v) => update('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} prefix="founder.env/business/" hint="Usernames must be lowercase letters, numbers, and underscores." />}
        {step === 3 && <ChoiceGrid values={categories.map((c) => ({ id: c.name, name: c.name, detail: 'Business category' }))} active={draft.category} onChange={(v) => update('category', v)} />}
        {step === 4 && <UploadPlaceholder icon={Store} title="Add your business logo" detail="Square PNG or JPG, at least 400 × 400px" selectedFile={logoFile} onSelectFile={setLogoFile} />}
        {step === 5 && <UploadPlaceholder icon={ImageIcon} title="Add a cover image" detail="Landscape image, recommended 1600 × 600px" selectedFile={coverFile} onSelectFile={setCoverFile} />}
        {step === 6 && (
          <div className="space-y-4">
            <Field label="Business location" value={draft.location} onChange={(v) => update('location', v)} />
            <Field label="Address" value={draft.address} onChange={(v) => update('address', v)} placeholder="Full street address" />
            <div className="flex h-28 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500 dark:bg-gray-800">
              <MapPin className="mr-2" size={18} /> Location will be displayed on your profile.
            </div>
          </div>
        )}
        {step === 7 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" value={draft.phone} onChange={(v) => update('phone', v)} />
            <Field label="WhatsApp" value={draft.whatsapp} onChange={(v) => update('whatsapp', v)} />
            <div className="sm:col-span-2">
              <Field label="Business email" value={draft.email} onChange={(v) => update('email', v)} />
            </div>
            <label className="sm:col-span-2"><span className="label">Preferred content language</span><select className="input" value={draft.preferredLanguage} onChange={(event) => update('preferredLanguage', event.target.value)}><option>Auto</option><option>English</option><option>Hindi</option><option>Marathi</option></select><span className="mt-2 block text-xs text-gray-400">AI Content Studio uses this preference when creating posts.</span></label>
          </div>
        )}
        {step === 8 && <Preview draft={draft} logoFile={logoFile} coverFile={coverFile} />}
        {step === 9 && <ReferralStep preparing={preparing} referralCode={referralCode} setReferralCode={setReferralCode} appliedCode={appliedCode} referralBusy={referralBusy} referralMessage={referralMessage} referralError={referralError} onApply={applyReferral} onSkip={async () => { setReferralMessage(''); setReferralError(''); await ensureBusiness(); }} />}
        {step === 10 && <Activation onSave={handleSaveBusiness} saving={saving} />}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving} className="btn-outline">
          <ArrowLeft size={16} /> Back
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={async () => {
              if (step === steps.length - 2) {
                setPreparing(true);
                try { await ensureBusiness(); setStep((s) => Math.min(steps.length - 1, s + 1)); }
                catch { /* ensureBusiness surfaces the error via statusMessage */ }
                finally { setPreparing(false); }
              } else {
                setStep((s) => Math.min(steps.length - 1, s + 1));
              }
            }}
            disabled={preparing}
            className="btn-primary"
          >
            {preparing ? <Loader2 size={16} className="animate-spin" /> : null}
            {preparing ? 'Preparing…' : <>Continue <ArrowRight size={16} /></>}
          </button>
        ) : (
          <button onClick={handleSaveBusiness} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            {saving ? 'Saving...' : 'Save & Setup Profile'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, prefix, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; prefix?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {prefix && <span className="mb-2 block text-xs text-gray-400">{prefix}<strong>{value || 'yourname'}</strong></span>}
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="mt-2 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

function Intro({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Icon size={30} />
      </div>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">{text}</p>
    </div>
  );
}

function UploadPlaceholder({ icon: Icon, title, detail, selectedFile, onSelectFile }: { icon: typeof Store; title: string; detail: string; selectedFile: File | null; onSelectFile: (file: File | null) => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-center dark:border-gray-700">
      <Icon size={32} className="text-brand-600" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
      {selectedFile ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium dark:bg-gray-800">
          <Check size={16} className="text-success-600" />
          <span>{selectedFile.name}</span>
          <button type="button" onClick={() => onSelectFile(null)} className="ml-2 text-gray-400 hover:text-gray-600">×</button>
        </div>
      ) : (
        <label className="btn-outline mt-5 cursor-pointer">
          Choose image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}

function ChoiceGrid({ values, active, onChange }: { values: { id: string; name: string; detail: string; color?: string }[]; active: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {values.map((value) => (
        <button key={value.id} onClick={() => onChange(value.id)} className={cn('rounded-2xl border p-4 text-left transition', active === value.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'hover:border-gray-300 dark:hover:border-gray-700')}>
          <div className="flex items-center gap-3">
            {value.color && <span className="h-8 w-8 rounded-xl" style={{ background: value.color }} />}
            <div>
              <p className="text-sm font-semibold">{value.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">{value.detail}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Preview({ draft, logoFile, coverFile }: { draft: Draft; logoFile: File | null; coverFile: File | null }) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border bg-white shadow-xl dark:bg-gray-900">
      {coverPreview ? (
        <img src={coverPreview} className="h-28 w-full object-cover" alt="Cover" />
      ) : (
        <div className="h-28 bg-gradient-to-br from-brand-500 to-gray-950" />
      )}
      <div className="p-5">
        {logoPreview ? (
          <img src={logoPreview} className="-mt-12 h-16 w-16 rounded-2xl border-4 border-white object-cover shadow dark:border-gray-900" alt="Logo" />
        ) : (
          <div className="-mt-12 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gray-100 text-xl font-bold dark:border-gray-900 dark:bg-gray-800">
            {draft.name.charAt(0) || 'B'}
          </div>
        )}
        <h2 className="mt-3 text-xl font-bold">{draft.name || 'Your Business Name'}</h2>
        <p className="text-sm text-gray-500">@{draft.username || 'username'} · {draft.category || 'Category'}</p>
        <p className="mt-2 text-sm text-gray-500">{draft.location || 'Location'}</p>
        <div className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-center text-sm font-semibold text-white">
          Follow
        </div>
      </div>
    </div>
  );
}

function ReferralStep({
  preparing, referralCode, setReferralCode, appliedCode, referralBusy, referralMessage, referralError, onApply, onSkip,
}: {
  preparing: boolean;
  referralCode: string;
  setReferralCode: (v: string) => void;
  appliedCode: string;
  referralBusy: boolean;
  referralMessage: string;
  referralError: string;
  onApply: (code: string | null) => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [skipping, setSkipping] = useState(false);
  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <Users size={24} />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Were you referred by someone?</h2>
        <p className="mt-1 text-sm text-gray-500">Optional — apply an E-Referral Code before paying.</p>
      </div>
      <div className="mt-6 rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
        <label className="block">
          <span className="label">E-Referral Code</span>
          <div className="flex gap-2">
            <input
              className="input uppercase"
              placeholder="FE-XXXXXXXX"
              value={referralCode}
              disabled={preparing || referralBusy}
              onChange={(event) => { setReferralCode(event.target.value.toUpperCase()); }}
            />
            <button disabled={referralBusy || !referralCode.trim() || preparing} onClick={() => void onApply(referralCode)} className="btn-outline shrink-0">
              {referralBusy ? <Loader2 size={14} className="animate-spin" /> : null}Apply Code
            </button>
          </div>
        </label>
        <p className="mt-3 text-xs leading-5 text-gray-500">Referral codes support the person who introduced you to Founder.env. Your Founder.env pricing remains unchanged — ₹299 today, ₹199/month later.</p>
        {referralMessage && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600"><Check size={15} />{referralMessage}</p>}
        {referralError && <p className="mt-2 text-sm font-medium text-error-600">{referralError} — you can correct the code or skip.</p>}
        {appliedCode && (
          <button disabled={referralBusy || preparing} onClick={() => void onApply(null)} className="mt-3 text-xs font-semibold text-gray-500">Remove referral</button>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400"><Gift size={14} className="text-brand-600" /><span>Your referring customer earns a reward only after your ₹299 setup payment is verified and your business activates.</span></div>
      </div>
      <button disabled={referralBusy || preparing || skipping} onClick={() => void (async () => { setSkipping(true); try { await onSkip(); } finally { setSkipping(false); } })()} className="btn-ghost mt-3 w-full">
        {skipping ? <Loader2 size={14} className="animate-spin" /> : null}Skip referral
      </button>
    </div>
  );
}

function Activation({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <CreditCard />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Save Business Setup</h2>
        <p className="mt-1 text-sm text-gray-500">Save your profile in pre-payment pending activation state.</p>
      </div>
      <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-semibold">Founder.env Pre-Activation</p>
            <p className="text-sm text-gray-500">Business draft created securely in Supabase</p>
          </div>
          <p className="text-xl font-bold text-brand-600">Pending</p>
        </div>
        <div className="mt-5 space-y-2">
          {['Permanent business draft created', 'Upload logo and cover to storage', 'Edit profile anytime', 'Ready for payment & activation'].map((item) => (
            <p key={item} className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-brand-600" />
              {item}
            </p>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={onSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            {saving ? 'Saving...' : 'Save & Setup Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
