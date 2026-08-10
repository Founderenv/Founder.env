export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return n.toString();
}

export function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);

  if (month > 0) return month + 'mo ago';
  if (week > 0) return week + 'w ago';
  if (day > 0) return day + 'd ago';
  if (hr > 0) return hr + 'h ago';
  if (min > 0) return min + 'm ago';
  return 'just now';
}

export function timeUntil(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hr = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (day > 0) return day + 'd ' + hr + 'h left';
  if (hr > 0) return hr + 'h ' + min + 'm left';
  return min + 'm left';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
