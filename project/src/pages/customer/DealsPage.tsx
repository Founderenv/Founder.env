import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { DealCard } from '@/components/social/DealCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/Sheet';
import { dealService } from '@/services';
import type { Deal } from '@/types';

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    dealService.getAll().then((d) => {
      setDeals(d);
      setLoading(false);
    });
  }, []);

  const filtered = deals.filter((d) => {
    if (query && !d.title.toLowerCase().includes(query.toLowerCase()) && !d.businessName.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'food') return ['Cafe', 'Food'].includes(d.category);
    if (filter === 'fashion') return d.category === 'Fashion';
    if (filter === 'fitness') return d.category === 'Fitness';
    if (filter === 'salon') return d.category === 'Salon';
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Deals</h1>
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals..." className="input pl-11" />
      </div>
      <div className="mb-4 overflow-x-auto scrollbar-hide">
        <SegmentedControl
          options={[
            { id: 'all', label: 'All' },
            { id: 'food', label: 'Food & Cafe' },
            { id: 'fashion', label: 'Fashion' },
            { id: 'fitness', label: 'Fitness' },
            { id: 'salon', label: 'Salon' },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-80 w-full rounded-2xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">{filtered.map((d) => <DealCard key={d.id} deal={d} />)}</div>
      ) : (
        <EmptyState icon="Tag" title="No deals found" description="Try a different filter or search." />
      )}
    </div>
  );
}
