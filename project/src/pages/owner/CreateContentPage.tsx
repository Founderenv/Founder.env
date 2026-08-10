import { useState } from 'react';
import { Image, Info, Send } from 'lucide-react';
import { Tabs } from '@/components/ui/Sheet';

const contentTypes = [
  { id: 'post', label: 'Post' }, { id: 'story', label: 'Story' }, { id: 'deal', label: 'Deal' }, { id: 'clip', label: 'Deal Clip' },
];

export function CreateContentPage() {
  const [type, setType] = useState('post');
  const [notice, setNotice] = useState('');
  const submit = () => setNotice(`${type === 'clip' ? 'Deal Clip' : type[0].toUpperCase() + type.slice(1)} saved as a frontend demo. Publishing will be enabled with Supabase.`);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="text-2xl font-bold">Create</h1><p className="mb-5 text-sm text-gray-500">Publish business content from one focused workspace.</p>
      <div className="card overflow-hidden"><div className="border-b px-5 pt-2"><Tabs tabs={contentTypes} active={type} onChange={(value) => { setType(value); setNotice(''); }} /></div>
        <div className="space-y-5 p-5 sm:p-6">
          {type === 'post' && <><Select label="Post type" options={['Standard', 'Product', 'Announcement', 'Event', 'New Arrival']} /><Media /><Text label="Caption" placeholder="Tell customers what is new..." /><Input label="Call to action" placeholder="Shop now" /></>}
          {type === 'story' && <><Select label="Story type" options={['Image', 'Video placeholder', 'Offer', 'Deal', 'Announcement', 'Countdown', 'Product']} /><Media /><Text label="Story caption" placeholder="Add a short message..." /><p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800"><Info size={14} className="mr-1 inline" /> Stories are published only by businesses and expire after 24 hours unless added to a highlight.</p></>}
          {type === 'deal' && <><Input label="Deal title" placeholder="Buy 1 Get 1 Free" /><Text label="Description" placeholder="Describe the offer..." /><Media /><div className="grid gap-4 sm:grid-cols-3"><Input label="Original price" placeholder="₹499" /><Input label="Offer price" placeholder="₹299" /><Input label="Discount" placeholder="40%" /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Starts" type="datetime-local" /><Input label="Ends" type="datetime-local" /></div><Input label="Maximum claims" type="number" placeholder="100" /><Text label="Terms" placeholder="Offer terms and eligibility..." /><Input label="CTA" placeholder="Claim Deal" /></>}
          {type === 'clip' && <><Media video /><Text label="Caption" placeholder="Describe this Deal Clip..." /><Input label="Linked deal" placeholder="Choose a deal after backend integration" /><p className="text-xs text-gray-400">Deal Clips are business-published vertical videos. Video processing and upload are backend-dependent.</p></>}
          {notice && <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">{notice}</div>}
          <button onClick={submit} className="btn-primary w-full"><Send size={16} /> Save demo content</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, placeholder, type = 'text' }: { label: string; placeholder?: string; type?: string }) { return <label><span className="label">{label}</span><input type={type} className="input" placeholder={placeholder} /></label>; }
function Text({ label, placeholder }: { label: string; placeholder: string }) { return <label><span className="label">{label}</span><textarea className="input resize-none" rows={4} placeholder={placeholder} /></label>; }
function Select({ label, options }: { label: string; options: string[] }) { return <label><span className="label">{label}</span><select className="input">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Media({ video = false }: { video?: boolean }) { return <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center text-gray-500"><Image size={26} /><span className="mt-2 text-sm font-medium">Choose {video ? 'vertical video' : 'image or video'}</span><span className="mt-1 text-xs">Preview only; no file is uploaded</span><input type="file" className="hidden" accept={video ? 'video/*' : 'image/*,video/*'} /></label>; }
