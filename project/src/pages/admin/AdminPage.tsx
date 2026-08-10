import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Check, ExternalLink, Search, Settings, Shield, Store } from 'lucide-react';
import { MetricCard } from '@/components/admin/Analytics';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { adminService } from '@/services';
import type { AnalyticsMetric, Business, CustomerAccount, Payment, Report, Subscription } from '@/types';
import { formatCurrency, formatDate, timeAgo } from '@/utils/format';

export function AdminPage() {
  const { section } = useParams();
  if (!section) return <Dashboard />;
  if (section === 'businesses') return <Businesses />;
  if (section === 'customers') return <Customers />;
  if (section === 'payments') return <Payments />;
  if (section === 'subscriptions') return <Subscriptions />;
  if (section === 'content') return <Content />;
  if (section === 'reports') return <Reports />;
  return <AdminSettings />;
}

function Header({ title, description }: { title: string; description: string }) { return <div className="mb-5"><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-gray-500">{description}</p></div>; }

function Dashboard() {
  const [adminDashboardMetrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  useEffect(() => { void Promise.all([adminService.getDashboardMetrics(), adminService.getReports(), adminService.getPayments(), adminService.getBusinesses()]).then(([m, r, p, b]) => { setMetrics(m); setReports(r); setPayments(p); setBusinesses(b); }); }, []);
  const recent = reports.filter((report) => report.status === 'pending').slice(0, 3);
  return <div className="mx-auto max-w-content"><Header title="Founder.env overview" description="A simple operating view for the solo founder." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{adminDashboardMetrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="card p-5"><h2 className="font-semibold">Needs attention</h2><div className="mt-4 space-y-3"><Attention icon={AlertTriangle} label={`${reports.filter((r) => r.status === 'pending').length} reports awaiting review`} to="/admin/reports" /><Attention icon={Shield} label={`${payments.filter((p) => p.status === 'failed').length} failed payments`} to="/admin/payments" /><Attention icon={Store} label={`${businesses.filter((b) => b.status === 'pending').length} businesses pending`} to="/admin/businesses" /></div></div><div className="card p-5"><h2 className="font-semibold">Recent reports</h2><div className="mt-4 divide-y">{recent.map((report) => <div key={report.id} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-medium capitalize">{report.reason.replace(/_/g, ' ')}</p><span className="text-xs text-gray-400">{timeAgo(report.createdAt)}</span></div><p className="mt-1 line-clamp-1 text-xs text-gray-500">{report.entityPreview}</p></div>)}</div></div></div></div>;
}

function Attention({ icon: Icon, label, to }: { icon: typeof Store; label: string; to: string }) { return <Link to={to} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"><Icon size={18} className="text-brand-600" /><span className="flex-1">{label}</span><ExternalLink size={14} className="text-gray-400" /></Link>; }

function Businesses() {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  useEffect(() => { void adminService.getBusinesses().then(setBusinesses); }, []);
  const rows = businesses.filter((b) => (filter === 'all' || b.plan === filter || b.status === filter) && `${b.name} ${b.username}`.toLowerCase().includes(query.toLowerCase()));
  return <div><Header title="Businesses" description="Search, verify, manage plans, extend, or suspend." /><Toolbar query={query} setQuery={setQuery}><select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All</option><option value="pro">Pro</option><option value="lite">Lite</option><option value="suspended">Suspended</option></select></Toolbar><Table headings={['Business', 'Category', 'Plan', 'Status', 'Joined', 'Actions']}>{rows.map((b) => <tr key={b.id}><Td><Link className="font-semibold hover:text-brand-600" to={`/business/${b.username}`}>{b.name}</Link><p className="text-xs text-gray-400">@{b.username}</p></Td><Td>{b.category}</Td><Td><StatusBadge status={b.plan} variant={b.plan === 'pro' ? 'success' : 'neutral'} /></Td><Td><StatusBadge status={b.status} /></Td><Td>{formatDate(b.joinedAt)}</Td><Td><Actions labels={['Verify', 'Change plan', 'Extend', 'Suspend']} /></Td></tr>)}</Table></div>;
}

function Customers() {
  const [query, setQuery] = useState(''); const [adminCustomers, setCustomers] = useState<CustomerAccount[]>([]);
  useEffect(() => { void adminService.getCustomers().then(setCustomers); }, []);
  const rows = adminCustomers.filter((c) => `${c.displayName} ${c.email}`.toLowerCase().includes(query.toLowerCase()));
  return <div><Header title="Customers" description="Private admin-only customer identity and account status." /><Toolbar query={query} setQuery={setQuery} /><Table headings={['Name', 'Email (private)', 'Joined', 'Following', 'Status']}>{rows.map((c) => <tr key={c.id}><Td><span className="font-semibold">{c.displayName}</span></Td><Td>{c.email}</Td><Td>{formatDate(c.createdAt)}</Td><Td>{c.followingCount}</Td><Td><StatusBadge status={c.status} variant="success" /></Td></tr>)}</Table></div>;
}

function Payments() {
  const [query, setQuery] = useState(''); const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => { void adminService.getPayments().then(setPayments); }, []);
  const rows = payments.filter((p) => `${p.id} ${p.businessName}`.toLowerCase().includes(query.toLowerCase()));
  return <div><Header title="Payments" description="Activation and subscription payment records." /><Toolbar query={query} setQuery={setQuery} /><Table headings={['Payment ID', 'Business', 'Amount', 'Type', 'Status', 'Date']}>{rows.map((p) => <tr key={p.id}><Td>{p.id}</Td><Td><span className="font-semibold">{p.businessName}</span></Td><Td>{formatCurrency(p.amount)}</Td><Td><span className="capitalize">{p.type}</span></Td><Td><StatusBadge status={p.status} variant={p.status === 'success' ? 'success' : p.status === 'failed' ? 'error' : 'warning'} /></Td><Td>{formatDate(p.date)}</Td></tr>)}</Table></div>;
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  useEffect(() => { void adminService.getSubscriptions().then(setSubscriptions); }, []);
  const cards = [['Active Pro', subscriptions.filter((s) => s.plan === 'pro' && s.status === 'active').length], ['Expiring', subscriptions.filter((s) => s.status === 'expiring').length], ['Failed', subscriptions.filter((s) => s.status === 'failed').length], ['Lite', subscriptions.filter((s) => s.plan === 'lite').length]] as const;
  return <div><Header title="Subscriptions" description="Plan health without a heavyweight billing dashboard." /><div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value]) => <div className="card p-4" key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div><Table headings={['Business', 'Plan', 'Status', 'Expiry', 'Amount', 'Auto renew']}>{subscriptions.map((s) => <tr key={s.id}><Td><span className="font-semibold">{s.businessName}</span></Td><Td><StatusBadge status={s.plan} /></Td><Td><StatusBadge status={s.status} variant={s.status === 'active' ? 'success' : s.status === 'failed' ? 'error' : 'warning'} /></Td><Td>{formatDate(s.expiryDate)}</Td><Td>{formatCurrency(s.amount)}</Td><Td>{s.autoRenew ? 'Yes' : 'No'}</Td></tr>)}</Table></div>;
}

function Content() {
  const contentRows = [
    { id: 'post_1', type: 'Post', business: 'Cafe Aroma', preview: 'Freshly brewed mornings at Cafe Aroma', status: 'Published' },
    { id: 'story_2', type: 'Story', business: 'Urban Threads', preview: 'Weekend collection announcement', status: 'Published' },
    { id: 'deal_1', type: 'Deal', business: 'Cafe Aroma', preview: 'Buy 1 Get 1 Free', status: 'Reported' },
    { id: 'video_1', type: 'Deal Clip', business: 'FitZone Gym', preview: 'Annual membership offer', status: 'Published' },
    { id: 'review_2', type: 'Review', business: 'Glow Studio', preview: 'Great service and staff', status: 'Reported' },
  ];
  return <div><Header title="Content" description="A compact moderation queue for posts, stories, deals, videos, and reviews." /><Table headings={['Type', 'Business', 'Preview', 'Status', 'Action']}>{contentRows.map((item) => <tr key={item.id}><Td>{item.type}</Td><Td>{item.business}</Td><Td>{item.preview}</Td><Td><StatusBadge status={item.status} variant={item.status === 'Reported' ? 'warning' : 'success'} /></Td><Td><Actions labels={['Review']} /></Td></tr>)}</Table></div>;
}

function Reports() {
  const [filter, setFilter] = useState('all'); const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => { void adminService.getReports().then(setReports); }, []);
  const rows = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  return <div><Header title="Reports" description="Review spam, fake businesses, fake offers, abuse, and misleading content." /><div className="mb-4"><select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All reports</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="actioned">Actioned</option></select></div>{rows.length ? <Table headings={['Reason', 'Type', 'Preview', 'Reporter', 'Status', 'Actions']}>{rows.map((r) => <tr key={r.id}><Td><span className="capitalize">{r.reason.replace(/_/g, ' ')}</span></Td><Td><span className="capitalize">{r.entityType}</span></Td><Td>{r.entityPreview}</Td><Td>{r.reporterName}</Td><Td><StatusBadge status={r.status} variant={r.status === 'pending' ? 'warning' : 'neutral'} /></Td><Td><Actions labels={['Review', 'Dismiss']} /></Td></tr>)}</Table> : <div className="card p-10 text-center"><Check className="mx-auto text-brand-600" /><h2 className="mt-3 font-semibold">No reports</h2><p className="mt-1 text-sm text-gray-500">Nothing matches this status.</p></div>}</div>;
}

function AdminSettings() {
  const [saved, setSaved] = useState(false);
  return <div className="max-w-2xl"><Header title="Admin settings" description="Small, safe controls for platform operations." /><div className="card space-y-5 p-5"><label><span className="label">Support email</span><input className="input" defaultValue="support@founder.env" /></label><label><span className="label">Grace period after Pro expiry</span><select className="input"><option>7 days</option><option>14 days</option><option>30 days</option></select></label><label className="flex items-center justify-between rounded-xl border p-4"><span><span className="block text-sm font-semibold">New business review</span><span className="text-xs text-gray-500">Require manual review before verification</span></span><input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-600" /></label><button onClick={() => setSaved(true)} className="btn-primary"><Settings size={16} />{saved ? 'Settings saved locally' : 'Save settings'}</button><p className="text-xs text-gray-400">Persistence and staff authorization require Supabase.</p></div></div>;
}

function Toolbar({ query, setQuery, children }: { query: string; setQuery: (value: string) => void; children?: React.ReactNode }) { return <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." /></div>{children}</div>; }
function Table({ headings, children }: { headings: string[]; children: React.ReactNode }) { return <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60"><tr>{headings.map((h) => <th className="px-4 py-3 font-semibold" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div></div>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{children}</td>; }
function Actions({ labels }: { labels: string[] }) { return <div className="flex gap-2">{labels.map((label) => <button key={label} onClick={() => window.alert(`${label} requires backend authorization.`)} className="text-xs font-medium text-brand-600 hover:underline">{label}</button>)}</div>; }
