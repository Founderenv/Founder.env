import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { DealCard } from '@/components/social/DealCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PostCard } from '@/components/social/PostCard';
import { StoryRing } from '@/components/social/StoryRing';
import { StoryViewer } from '@/components/social/StoryViewer';
import { businessService, dealService, ownerService, postService, storyService } from '@/services';
import type { Business, Deal, Post, Story } from '@/types';

export function OwnerHomePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const owner = await ownerService.getCurrent();
      const owned = await businessService.getByOwner(owner.id);
      const current = owned[0] ?? null;
      setBusiness(current);
      if (!current) return;
      const [nextStories, nextPosts, nextDeals] = await Promise.all([
        storyService.getByBusiness(current.id),
        postService.getByBusiness(current.id),
        dealService.getByBusiness(current.id),
      ]);
      setStories(nextStories);
      setPosts(nextPosts);
      const now = Date.now();
      setDeals(nextDeals.filter((deal) => Date.parse(deal.startDate) <= now && Date.parse(deal.endDate) >= now));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="card mx-auto max-w-feed p-8 text-center text-sm text-gray-500">Loading your business home…</div>;
  if (!business) return <EmptyState icon="Store" title="No business profile yet" description="Complete your business setup to publish content." />;

  return (
    <div className="mx-auto max-w-feed pb-8">
      <header className="card flex items-center justify-between gap-4 p-4">
        <Link to="/owner/profile" className="flex min-w-0 items-center gap-3">
          <Avatar src={business.logoUrl} alt={business.name} size="md" />
          <div className="min-w-0"><p className="truncate font-semibold">{business.name}</p><p className="truncate text-sm text-gray-500">@{business.username}</p></div>
        </Link>
        <Link to="/owner/profile" className="btn-outline text-sm">View profile</Link>
      </header>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h1 className="section-title">Stories</h1><Link to="/owner/create" className="text-sm font-medium text-brand-600">Add story</Link></div>
        {stories.length ? <div className="flex gap-3 overflow-x-auto pb-1">{stories.map((story, index) => <StoryRing key={story.id} story={story} businessName={story.businessName} businessAvatar={story.businessLogo} hasUnseen={story.hasUnseen} onClick={() => setStoryIndex(index)} />)}</div> : <EmptyState icon="Image" title="No active stories" description="Publish a story to share a timely update." />}
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between"><h2 className="section-title">Active deals</h2><Link to="/owner/create" className="text-sm font-medium text-brand-600">Create deal</Link></div>
        {deals.length ? <div className="flex gap-3 overflow-x-auto pb-2">{deals.map((deal) => <div key={deal.id} className="w-64 shrink-0"><DealCard deal={deal} compact /></div>)}</div> : <EmptyState icon="Tag" title="No active deals" description="Create an offer for customers to discover." />}
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between"><h2 className="section-title">Recent posts</h2><Link to="/owner/create" className="btn-primary text-sm"><Plus size={16} /> Create post</Link></div>
        {posts.length ? <div className="space-y-4">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div> : <EmptyState icon="Image" title="No posts yet" description="Create your first post to appear on your business home and profile." />}
      </section>

      {storyIndex >= 0 && stories[storyIndex] && <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(-1)} isOwner />}
    </div>
  );
}
