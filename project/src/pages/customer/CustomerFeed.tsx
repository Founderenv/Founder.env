import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StoryRing } from '@/components/social/StoryRing';
import { StoryViewer } from '@/components/social/StoryViewer';
import { PostCard } from '@/components/social/PostCard';
import { DealCard } from '@/components/social/DealCard';
import { VideoCard } from '@/components/social/VideoCard';
import { CommentSheet } from '@/components/social/CommentSheet';
import { Tabs } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedSkeleton } from '@/components/ui/States';
import { Logo } from '@/components/layout/Navigation';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import { storyService, postService, dealService, videoService } from '@/services';
import type { Story, Post, Deal, VideoClip } from '@/types';

export function CustomerFeed() {
  const currentCustomer = useCurrentCustomer();
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState('all');
  const [commentPost, setCommentPost] = useState<Post | null>(null);

  useEffect(() => {
    Promise.all([
      storyService.getAll(),
      postService.getFeed(),
      dealService.getTrending(),
      videoService.getAll(),
    ]).then(([s, p, d, v]) => {
      setStories(s);
      setPosts(p);
      setDeals(d);
      setVideos(v);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-feed mx-auto pb-4">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between py-2">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/explore" className="rounded-lg p-2 text-gray-600 dark:text-gray-400"><Search size={22} /></Link>
          <Link to="/notifications" className="relative rounded-lg p-2 text-gray-600 dark:text-gray-400">
            <Bell size={22} /><span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error-500" />
          </Link>
          <Link to="/account"><Avatar src={currentCustomer.avatarUrl} alt={currentCustomer.displayName} size="sm" /></Link>
        </div>
      </div>

      {/* Stories */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide py-3 -mx-3 px-3">
        {stories.map((story, i) => (
          <StoryRing
            key={story.id}
            story={story}
            businessName={story.businessName}
            businessAvatar={story.businessLogo}
            hasUnseen={story.hasUnseen}
            onClick={() => setStoryIndex(i)}
          />
        ))}
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <>
          {/* Recommended Deals */}
          <div className="mb-4">
            <h2 className="section-title mb-3">Recommended Deals For You</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-3 px-3 pb-2">
              {deals.slice(0, 4).map((deal) => (
                <div key={deal.id} className="w-64 shrink-0">
                  <DealCard deal={deal} compact />
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'deals', label: 'Deals' },
              { id: 'posts', label: 'Posts' },
              { id: 'videos', label: 'Videos' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            className="mb-4 sticky top-14 lg:top-16 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm z-10 -mx-3 px-3"
          />

          {activeTab === 'all' && (
            <div className="space-y-4">
              {posts.map((p) => <PostCard key={p.id} post={p} onComment={setCommentPost} />)}
            </div>
          )}
          {activeTab === 'deals' && (
            deals.length > 0 ? (
              <div className="space-y-4">{deals.map((d) => <DealCard key={d.id} deal={d} />)}</div>
            ) : <EmptyState icon="Tag" title="No deals available" description="Check back later for exclusive offers." />
          )}
          {activeTab === 'posts' && (
            posts.length > 0 ? (
              <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} onComment={setCommentPost} />)}</div>
            ) : <EmptyState icon="Image" title="No posts yet" />
          )}
          {activeTab === 'videos' && (
            videos.length > 0 ? (
              <div className="space-y-4">
                {videos.map((v) => (
                  <div key={v.id} className="card overflow-hidden">
                    <div className="aspect-[9/16] max-h-[600px]">
                      <VideoCard clip={v} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="Video" title="No videos yet" />
          )}
        </>
      )}

      {storyIndex >= 0 && stories[storyIndex] && (
        <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(-1)} />
      )}
      <CommentSheet open={!!commentPost} onClose={() => setCommentPost(null)} post={commentPost} />
    </div>
  );
}
