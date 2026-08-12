import { Download, Share2, Copy, Check, Printer, QrCode as QrIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Avatar } from '@/components/ui/Avatar';
import type { Business } from '@/types';

export function QRCard({ business }: { business: Business }) {
  const [copied, setCopied] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const target = `${window.location.origin}/q/${business.qrCode}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(target).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const download = async () => {
    const dataUrl = await QRCode.toDataURL(target, { width: 1024, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${business.username}-founder-env-qr.png`;
    link.click();
  };

  const share = () => {
    if (navigator.share) navigator.share({ title: business.name, text: `Follow ${business.name} on Founder.env`, url: target });
    else copyLink();
  };

  return (
    <div className="card p-6 text-center">
      <Avatar src={business.logoUrl} alt={business.name} size="xl" className="mx-auto" />
      <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">{business.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">@{business.username}</p>

      <div className="mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-3 dark:border-gray-800"><QRImage value={target} className="h-full w-full" /></div>

      <p className="mt-4 text-sm font-mono text-gray-600 dark:text-gray-400">{business.shortUrl}</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={download}>
          <Download size={16} /> Download QR
        </button>
        <button className="btn-outline" onClick={copyLink}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button className="btn-outline" onClick={share}>
          <Share2 size={16} /> Share
        </button>
        <button className="btn-outline" onClick={() => setShowPoster((value) => !value)}>
          <Printer size={16} /> Generate Poster
        </button>
      </div>
      {showPoster && <div className="mt-5"><QRPoster business={business} /></div>}
    </div>
  );
}

export function QRPoster({ business }: { business: Business }) {
  return (
    <div className="mx-auto max-w-sm bg-white p-8 shadow-xl rounded-2xl">
      <div className="text-center">
        <Avatar src={business.logoUrl} alt={business.name} size="xl" className="mx-auto" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">{business.name}</h2>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-brand-600">Scan & Follow</p>
        <p className="mt-2 text-sm text-gray-600">Unlock exclusive deals and rewards.</p>

        <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-xl border-4 border-gray-900 bg-white p-2"><QRImage value={`${window.location.origin}/q/${business.qrCode}`} className="h-full w-full" /></div>

        <p className="mt-4 text-xs font-mono text-gray-500">{business.shortUrl}</p>
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-400">Built with Founder.env</p>
        </div>
      </div>
    </div>
  );
}

function QRImage({ value, className }: { value: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(value, { width: 512, margin: 1, errorCorrectionLevel: 'H' }).then(setSrc); }, [value]);
  return src ? <img src={src} alt="Scannable Founder.env business QR code" className={className} /> : <QrIcon className="animate-pulse text-gray-300" size={96} />;
}
