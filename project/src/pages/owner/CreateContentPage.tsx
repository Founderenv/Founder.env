import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Image as ImageIcon, Info, Loader2, Send } from 'lucide-react';
import { Tabs } from '@/components/ui/Sheet';
import { dealService, ownerService, businessService, postService, storyService, videoService } from '@/services';
import type { Business, Deal, Post } from '@/types';
import { cn } from '@/utils/format';

const contentTypes = [
  { id: 'post', label: 'Post' },
  { id: 'story', label: 'Story' },
  { id: 'deal', label: 'Deal' },
  { id: 'clip', label: 'Deal Clip' },
];

export function CreateContentPage() {
  const navigate = useNavigate();
  const [type, setType] = useState('post');
  const [business, setBusiness] = useState<Business | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  // Post form state
  const [postType, setPostType] = useState('Standard');
  const [postCaption, setPostCaption] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postCtaLabel, setPostCtaLabel] = useState('');
  const [postCtaLink, setPostCtaLink] = useState('');

  // Story form state
  const [storyType, setStoryType] = useState('Image');
  const [storyCaption, setStoryCaption] = useState('');

  // Deal form state
  const [dealTitle, setDealTitle] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [dealOriginalPrice, setDealOriginalPrice] = useState('');
  const [dealOfferPrice, setDealOfferPrice] = useState('');
  const [dealDiscount, setDealDiscount] = useState('');
  const [dealStartsAt, setDealStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [dealEndsAt, setDealEndsAt] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return end.toISOString().slice(0, 16);
  });
  const [dealMaxClaims, setDealMaxClaims] = useState('100');
  const [dealTerms, setDealTerms] = useState('');
  const [dealCtaLabel, setDealCtaLabel] = useState('Claim Deal');

  // Clip form state
  const [clipCaption, setClipCaption] = useState('');
  const [clipDealId, setClipDealId] = useState('');
  const [clipMusic, setClipMusic] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const owner = await ownerService.getCurrent();
        const owned = await businessService.getByOwner(owner.id);
        const b = owned[0] ?? null;
        setBusiness(b);
        if (b) {
          const bDeals = await dealService.getByBusiness(b.id);
          setDeals(bDeals);
        }
      } catch (err) {
        console.error('Error fetching business for content creation:', err);
      } finally {
        setLoadingBusiness(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!business) {
      setNotice({ type: 'error', text: 'You must have an owned business profile to create content.' });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      if (type === 'post') {
        if (!postCaption.trim()) throw new Error('Post caption is required.');
        const postInputType = (['standard', 'product', 'announcement', 'event', 'new_arrival'].includes(postType.toLowerCase().replace(' ', '_'))
          ? postType.toLowerCase().replace(' ', '_')
          : 'standard') as Post['type'];
        await postService.create(
          business.id,
          {
            type: postInputType,
            caption: postCaption,
            location: postLocation || undefined,
            ctaLabel: postCtaLabel || undefined,
            ctaLink: postCtaLink || undefined,
          },
          mediaFile || undefined
        );
        navigate('/owner/home', { replace: true });
        setPostCaption('');
        setMediaFile(null);
      } else if (type === 'story') {
        await storyService.create(
          business.id,
          {
            storyType: storyType.toLowerCase(),
            caption: storyCaption || undefined,
          },
          mediaFile || undefined
        );
        navigate('/owner/home', { replace: true });
        setStoryCaption('');
        setMediaFile(null);
      } else if (type === 'deal') {
        if (!dealTitle.trim() || !dealDescription.trim()) throw new Error('Deal title and description are required.');
        const orig = Number(dealOriginalPrice) || 0;
        const offer = Number(dealOfferPrice) || 0;
        const disc = Number(dealDiscount) || (orig > 0 ? Math.round(((orig - offer) / orig) * 100) : 0);
        await dealService.create(
          business.id,
          {
            title: dealTitle,
            description: dealDescription,
            originalPrice: orig,
            offerPrice: offer,
            discount: disc,
            startsAt: new Date(dealStartsAt).toISOString(),
            endsAt: new Date(dealEndsAt).toISOString(),
            maxClaims: dealMaxClaims ? Number(dealMaxClaims) : undefined,
            terms: dealTerms || undefined,
            ctaLabel: dealCtaLabel || undefined,
          },
          mediaFile || undefined
        );
        navigate('/owner/home', { replace: true });
        setDealTitle('');
        setDealDescription('');
        setMediaFile(null);
      } else if (type === 'clip') {
        if (!clipCaption.trim()) throw new Error('Clip caption is required.');
        if (!mediaFile) throw new Error('Video media file is required for Deal Clips.');
        await videoService.create(
          business.id,
          {
            caption: clipCaption,
            dealId: clipDealId || undefined,
            music: clipMusic || undefined,
          },
          mediaFile
        );
        navigate('/owner/home', { replace: true });
        setClipCaption('');
        setMediaFile(null);
      }
    } catch (err: unknown) {
      setNotice({ type: 'error', text: (err as Error).message || 'Failed to publish content.' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingBusiness) return <div className="card mx-auto max-w-3xl p-8 text-center text-sm text-gray-500">Loading business information...</div>;

  if (!business)
    return (
      <div className="card mx-auto max-w-3xl p-8 text-center text-sm text-gray-500">
        No business profile found. Please complete onboarding first.
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="text-2xl font-bold">Create</h1>
      <p className="mb-5 text-sm text-gray-500">Publish business content from one focused workspace.</p>
      <div className="card overflow-hidden">
        <div className="border-b px-5 pt-2">
          <Tabs
            tabs={contentTypes}
            active={type}
            onChange={(value) => {
              setType(value);
              setNotice(null);
              setMediaFile(null);
            }}
          />
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          {type === 'post' && (
            <>
              <Select label="Post type" options={['Standard', 'Product', 'Announcement', 'Event', 'New Arrival']} value={postType} onChange={setPostType} />
              <Media video={false} selectedFile={mediaFile} onSelectFile={setMediaFile} />
              <Text label="Caption" placeholder="Tell customers what is new..." value={postCaption} onChange={setPostCaption} />
              <Input label="Location" placeholder="Branch or city" value={postLocation} onChange={setPostLocation} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="CTA label" placeholder="Shop now" value={postCtaLabel} onChange={setPostCtaLabel} />
                <Input label="CTA link" placeholder="https://..." value={postCtaLink} onChange={setPostCtaLink} />
              </div>
            </>
          )}

          {type === 'story' && (
            <>
              <Select label="Story type" options={['Image', 'Video', 'Offer', 'Deal', 'Announcement']} value={storyType} onChange={setStoryType} />
              <Media video={storyType === 'Video'} selectedFile={mediaFile} onSelectFile={setMediaFile} />
              <Text label="Story caption" placeholder="Add a short message..." value={storyCaption} onChange={setStoryCaption} />
              <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800">
                <Info size={14} className="mr-1 inline" /> Stories are published by businesses and expire after 24 hours.
              </p>
            </>
          )}

          {type === 'deal' && (
            <>
              <Input label="Deal title" placeholder="Buy 1 Get 1 Free" value={dealTitle} onChange={setDealTitle} />
              <Text label="Description" placeholder="Describe the offer..." value={dealDescription} onChange={setDealDescription} />
              <Media video={false} selectedFile={mediaFile} onSelectFile={setMediaFile} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Original price (₹)" placeholder="499" type="number" value={dealOriginalPrice} onChange={setDealOriginalPrice} />
                <Input label="Offer price (₹)" placeholder="299" type="number" value={dealOfferPrice} onChange={setDealOfferPrice} />
                <Input label="Discount (%)" placeholder="40" type="number" value={dealDiscount} onChange={setDealDiscount} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Starts" type="datetime-local" value={dealStartsAt} onChange={setDealStartsAt} />
                <Input label="Ends" type="datetime-local" value={dealEndsAt} onChange={setDealEndsAt} />
              </div>
              <Input label="Maximum claims" type="number" placeholder="100" value={dealMaxClaims} onChange={setDealMaxClaims} />
              <Text label="Terms" placeholder="Offer terms and eligibility..." value={dealTerms} onChange={setDealTerms} />
              <Input label="CTA Label" placeholder="Claim Deal" value={dealCtaLabel} onChange={setDealCtaLabel} />
            </>
          )}

          {type === 'clip' && (
            <>
              <Media video={true} selectedFile={mediaFile} onSelectFile={setMediaFile} />
              <Text label="Caption" placeholder="Describe this Deal Clip..." value={clipCaption} onChange={setClipCaption} />
              <Input label="Music / Audio Track" placeholder="e.g. Chill Beats" value={clipMusic} onChange={setClipMusic} />
              {deals.length > 0 && (
                <label>
                  <span className="label">Link to Deal (optional)</span>
                  <select className="input" value={clipDealId} onChange={(e) => setClipDealId(e.target.value)}>
                    <option value="">None</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="text-xs text-gray-400">Deal Clips are business-published vertical videos stored directly in Supabase Storage.</p>
            </>
          )}

          {notice && (
            <div
              className={cn(
                'rounded-xl p-3 text-sm font-medium',
                notice.type === 'success'
                  ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                  : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400'
              )}
            >
              {notice.text}
            </div>
          )}

          <button onClick={handleCreate} disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {saving ? 'Publishing...' : `Publish ${type === 'clip' ? 'Deal Clip' : type[0].toUpperCase() + type.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder?: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input type={type} className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Text({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <textarea className="input resize-none" rows={4} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Media({ video = false, selectedFile, onSelectFile }: { video?: boolean; selectedFile: File | null; onSelectFile: (file: File | null) => void }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-500 dark:border-gray-700">
      <ImageIcon size={26} />
      <span className="mt-2 text-sm font-medium">Choose {video ? 'vertical video' : 'image or video'}</span>
      {selectedFile ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium dark:bg-gray-800">
          <Check size={14} className="text-success-600" />
          <span>{selectedFile.name}</span>
          <button type="button" onClick={() => onSelectFile(null)} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
        </div>
      ) : (
        <label className="btn-outline mt-3 cursor-pointer text-xs">
          Browse File
          <input type="file" className="hidden" accept={video ? 'video/*' : 'image/*,video/*'} onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
