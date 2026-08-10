import { useState, type ReactNode } from 'react';
import { Share2, MessageCircle, Link2, Copy, Check, Facebook, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/format';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export function ShareSheet({ open, onClose, title, url }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOptions: { label: string; icon: ReactNode; color: string; action: () => void }[] = [
    { label: 'WhatsApp', icon: <MessageCircle size={20} />, color: 'text-success-600', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`) },
    { label: 'Telegram', icon: <Send size={20} />, color: 'text-blue-500', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`) },
    { label: 'Facebook', icon: <Facebook size={20} />, color: 'text-blue-600', action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`) },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Share" size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {shareOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.action}
              className="flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className={opt.color}>{opt.icon}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <Link2 size={18} className="shrink-0 text-gray-400" />
          <input
            value={url}
            readOnly
            className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-400 outline-none"
          />
          <button
            onClick={copyLink}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              copied
                ? 'bg-success-50 text-success-600 dark:bg-success-500/10'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            )}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ShareButtonProps {
  title: string;
  url: string;
  className?: string;
}

export function ShareButton({ title, url, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn('rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300', className)}
        aria-label="Share"
      >
        <Share2 size={20} />
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} title={title} url={url} />
    </>
  );
}
