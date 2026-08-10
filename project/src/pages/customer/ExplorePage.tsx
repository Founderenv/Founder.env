import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Shirt, UtensilsCrossed, Coffee, Scissors, Dumbbell, Smartphone, GraduationCap, Wrench, Store, type LucideIcon } from 'lucide-react';
import { BusinessCard } from '@/components/business/BusinessCard';
import { DealCard } from '@/components/social/DealCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, SegmentedControl } from '@/components/ui/Sheet';
import { businessService, dealService, categoryService } from '@/services';
import { cn } from '@/utils/format';
import type { Business, Deal, Category } from '@/types';

export function ExplorePage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('businesses');
  const [sort, setSort] = useState('trending');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    categoryService.getAll().then(setCategories);
    dealService.getTrending().then(setDeals);
  }, []);

  const loadBusinesses = useCallback(() => {
    if (sort === 'trending') businessService.getTrending().then(setBusinesses);
    else if (sort === 'rated') businessService.getTopRated().then(setBusinesses);
    else if (sort === 'new') businessService.getNew().then(setBusinesses);
    else businessService.getAll().then(setBusinesses);
  }, [sort]);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  const filteredBusinesses = activeCategory === 'all'
    ? businesses
    : businesses.filter((b) => b.category.toLowerCase() === activeCategory);

  const searchedBusinesses = query
    ? filteredBusinesses.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.category.toLowerCase().includes(query.toLowerCase()) ||
        b.city.toLowerCase().includes(query.toLowerCase())
      )
    : filteredBusinesses;

  const searchedDeals = query
    ? deals.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.businessName.toLowerCase().includes(query.toLowerCase()))
    : deals;

  return (
    <div className="max-w-3xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Explore</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses, deals, categories..."
          className="input pl-11"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Filters"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 animate-slide-up">
          <p className="text-xs font-medium text-gray-500 mb-2">Sort by</p>
          <SegmentedControl
            options={[
              { id: 'trending', label: 'Trending' },
              { id: 'rated', label: 'Top Rated' },
              { id: 'new', label: 'New' },
            ]}
            active={sort}
            onChange={setSort}
          />
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}
        >All</button>
        {categories.map((cat) => {
          const categoryIcons: Record<string, LucideIcon> = { Shirt, UtensilsCrossed, Coffee, Scissors, Dumbbell, Smartphone, GraduationCap, Wrench };
          const Icon = categoryIcons[cat.icon] || Store;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                activeCategory === cat.slug ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              <Icon size={16} /> {cat.name}
            </button>
          );
        })}
      </div>

      <Tabs
        tabs={[
          { id: 'businesses', label: 'Businesses' },
          { id: 'deals', label: 'Deals' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-4"
      />

      {activeTab === 'businesses' ? (
        searchedBusinesses.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {searchedBusinesses.map((b) => <BusinessCard key={b.id} business={b} />)}
          </div>
        ) : (
          <EmptyState icon="Search" title="No businesses found" description="Try a different search or category." />
        )
      ) : (
        searchedDeals.length > 0 ? (
          <div className="space-y-4">
            {searchedDeals.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        ) : (
          <EmptyState icon="Tag" title="No deals found" />
        )
      )}
    </div>
  );
}
