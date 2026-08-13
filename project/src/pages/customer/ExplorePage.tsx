import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

  const selectedCategory = categories.find((category) => category.slug === activeCategory);
  const categoryTerms = activeCategory === 'all'
    ? []
    : [activeCategory, selectedCategory?.name.toLowerCase() ?? '', activeCategory === 'fitness' ? 'gym' : '', activeCategory === 'fashion' ? 'clothing' : ''].filter(Boolean);
  const matchesCategory = (value: string) => categoryTerms.some((term) => value.toLowerCase().includes(term));
  const filteredBusinesses = activeCategory === 'all' ? businesses : businesses.filter((business) => matchesCategory(business.category));

  const searchedBusinesses = query
    ? filteredBusinesses.filter((b) => fuzzyMatch(`${b.name} ${b.username} ${b.category} ${b.description} ${b.city} ${b.location}`, query))
    : filteredBusinesses;

  const categoryDeals = activeCategory === 'all' ? deals : deals.filter((deal) => matchesCategory(deal.category));
  const searchedDeals = query
    ? categoryDeals.filter((deal) => fuzzyMatch(`${deal.title} ${deal.description} ${deal.businessName} ${deal.businessUsername} ${deal.category}`, query))
    : categoryDeals;
  const suggestedCategories=query?categories.filter((category)=>fuzzyMatch(`${category.name} ${category.slug} ${category.slug==='fashion'?'clothing apparel':''} ${category.slug==='fitness'?'gym workout':''}`,query)).slice(0,4):[];

  return (
    <div className="max-w-3xl mx-auto pb-4">
      <div className="mb-4"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Founder.env</h1><p className="mt-1 text-sm text-gray-500">Find local businesses, categories, and current deals.</p></div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses, deals, categories..."
          aria-label="Search Founder.env"
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

      {query.trim() && (
        <div className="card relative z-10 -mt-2 mb-4 max-h-80 overflow-y-auto p-3 shadow-lg animate-slide-up">
          {searchedBusinesses.length > 0 && <SuggestionGroup title="Businesses">{searchedBusinesses.slice(0,5).map((business)=><Link key={business.id} to={`/business/${business.username}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-800"><img src={business.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover"/><div className="min-w-0"><p className="truncate text-sm font-semibold">{business.name}</p><p className="truncate text-xs text-gray-500">@{business.username} · {business.category}</p></div></Link>)}</SuggestionGroup>}
          {suggestedCategories.length > 0 && <SuggestionGroup title="Categories">{suggestedCategories.map((category)=><button key={category.id} onClick={()=>{setActiveCategory(category.slug);setQuery('');}} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">{category.name}</button>)}</SuggestionGroup>}
          {searchedDeals.length > 0 && <SuggestionGroup title="Deals">{searchedDeals.slice(0,4).map((deal)=><Link key={deal.id} to={`/business/${deal.businessUsername}/deals`} className="block rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"><p className="text-sm font-medium">{deal.title}</p><p className="text-xs text-gray-500">{deal.businessName}</p></Link>)}</SuggestionGroup>}
          {!searchedBusinesses.length&&!suggestedCategories.length&&!searchedDeals.length&&<p className="p-3 text-center text-sm text-gray-500">No matching businesses found</p>}
        </div>
      )}

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
              aria-pressed={activeCategory === cat.slug}
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

function normalize(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,' ');}
function editDistance(a:string,b:string){const matrix=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)matrix[0][j]=j;for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)matrix[i][j]=b[i-1]===a[j-1]?matrix[i-1][j-1]:1+Math.min(matrix[i-1][j-1],matrix[i][j-1],matrix[i-1][j]);return matrix[b.length][a.length];}
function fuzzyMatch(value:string,query:string){const haystack=normalize(value),needle=normalize(query);if(!needle)return true;if(haystack.includes(needle))return true;const words=haystack.split(' '),terms=needle.split(' ');return terms.every((term)=>words.some((word)=>word.startsWith(term)||(term.length>=3&&Math.abs(word.length-term.length)<=2&&editDistance(word,term)<=2)));}
function SuggestionGroup({title,children}:{title:string;children:ReactNode}){return <section className="mb-2 last:mb-0"><h2 className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</h2>{children}</section>}
