import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { customerAvatarService } from '@/services/customerAvatarService';

export function ProfilePhotoEditor({ open, name, currentUrl, onClose, onSaved }: { open: boolean; name: string; currentUrl: string; onClose: () => void; onSaved: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: boolean; text: string } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  if (!open) return null;

  async function choose(file?: File) {
    if (!file) return;
    setMessage(null);
    try {
      const prepared = await customerAvatarService.prepare(file);
      if (preview) URL.revokeObjectURL(preview);
      setBlob(prepared); setPreview(URL.createObjectURL(prepared));
    } catch (cause) { setMessage({ error: true, text: cause instanceof Error ? cause.message : 'Could not open this image.' }); }
  }

  async function save() {
    if (!blob) return;
    setBusy(true); setMessage(null);
    try { const url = await customerAvatarService.upload(blob); onSaved(url); setMessage({ text: 'Profile photo updated.' }); setTimeout(onClose, 450); }
    catch (cause) { setMessage({ error: true, text: cause instanceof Error ? cause.message : 'Upload failed.' }); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setMessage(null);
    try { await customerAvatarService.remove(); onSaved(''); onClose(); }
    catch (cause) { setMessage({ error: true, text: cause instanceof Error ? cause.message : 'Could not remove the photo.' }); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Change profile photo">
    <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-gray-900 sm:max-w-md sm:rounded-3xl">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Change Profile Photo</h2><button aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button></div>
      <div className="mt-5 flex justify-center"><Avatar src={preview || currentUrl} alt={name} size="2xl" className="ring-4 ring-brand-100 dark:ring-brand-900" /></div>
      <p className="mt-3 text-center text-xs text-gray-500">Images are center-cropped to a square and resized to 512 × 512.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void choose(event.target.files?.[0])} />
      {message && <p role={message.error ? 'alert' : 'status'} className={`mt-4 rounded-xl p-3 text-sm ${message.error ? 'bg-red-50 text-red-700 dark:bg-red-500/10' : 'bg-green-50 text-green-700 dark:bg-green-500/10'}`}>{message.text}</p>}
      <div className="mt-5 grid gap-2">
        <button disabled={busy} onClick={() => input.current?.click()} className="btn-outline w-full justify-center"><Camera size={17} />Choose Photo</button>
        {blob && <button disabled={busy} onClick={() => void save()} className="btn-primary w-full justify-center">{busy ? <Loader2 className="animate-spin" size={17} /> : <Camera size={17} />}Save Photo</button>}
        {currentUrl && <button disabled={busy} onClick={() => void remove()} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={17} />Remove Current Photo</button>}
      </div>
    </div>
  </div>;
}
