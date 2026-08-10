import { useState, useEffect } from 'react';
import { PostCard } from '@/components/social/PostCard';
import { DealCard } from '@/components/social/DealCard';
import { BusinessCard } from '@/components/business/BusinessCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Sheet';
import { LoadingSpinner } from '@/components/ui/States';
import { postService, dealService, followService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import type { Post, Deal, Business } from '@/types';

export function SavedPage() {
  const currentCustomer = useCurrentCustomer();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [following, setFollowing] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      postService.getSaved(),
      dealService.getSaved(),
      followService.getFollowing(currentCustomer.id),
    ]).then(([p, d, f]) => {
      setPosts(p);
      setDeals(d);
      setFollowing(f);
      setLoading(false);
    });
  }, [currentCustomer.id]);

  if (loading) return <LoadingSpinner size={32} className="py-12" />;

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Saved</h1>
      <Tabs
        tabs={[
          { id: 'posts', label: `Posts (${posts.length})` },
          { id: 'deals', label: `Deals (${deals.length})` },
          { id: 'businesses', label: `Following (${following.length})` },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />
      {tab === 'posts' && (posts.length > 0 ? (
        <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      ) : <EmptyState icon="Bookmark" title="No saved posts" description="Save posts to find them here later." />)}

      {tab === 'deals' && (deals.length > 0 ? (
        <div className="space-y-4">{deals.map((d) => <DealCard key={d.id} deal={d} />)}</div>
      ) : <EmptyState icon="Tag" title="No saved deals" description="Save deals to find them here later." />)}

      {tab === 'businesses' && (following.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">{following.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
      ) : <EmptyState icon="Users" title="Not following anyone" description="Follow businesses to see them here." />)}
    </div>
  );
}
