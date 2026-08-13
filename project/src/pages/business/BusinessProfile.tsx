import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Star, Edit, Plus, BarChart3, QrCode, Instagram, Globe, Navigation, ChevronLeft, WandSparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge, StatusBadge } from '@/components/ui/StatusBadge';
import { FollowButton } from '@/components/ui/FollowButton';
import { RatingStars } from '@/components/ui/RatingStars';
import { Tabs } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileSkeleton, ErrorState, LoadingSpinner } from '@/components/ui/States';
import { ShareButton } from '@/components/ui/ShareSheet';
import { PostCard } from '@/components/social/PostCard';
import { DealCard } from '@/components/social/DealCard';
import { VideoCard } from '@/components/social/VideoCard';
import { ReviewCard } from '@/components/social/ReviewCard';
import { CommentSheet } from '@/components/social/CommentSheet';
import { StoryRing } from '@/components/social/StoryRing';
import { StoryViewer } from '@/components/social/StoryViewer';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/hooks/useTheme';
import { useBusiness } from '@/hooks/useBusiness';
import { storyService, postService, dealService, reviewService, videoService, followService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import { dataMode } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { founderV2Service } from '@/services/v2Service';
import { AIOrb } from '@/components/ai/AIOrb';
import { formatNumber, cn, timeAgo } from '@/utils/format';
import type { Story, Post, Deal, Review, VideoClip, StoryHighlight } from '@/types';

export function BusinessProfile() {
  const currentCustomer = useCurrentCustomer();
  const auth = useAuth();
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const { business, loading, error } = useBusiness(username);
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState(location.pathname.endsWith('/deals') ? 'deals' : 'page');
  const [stories, setStories] = useState<Story[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [storyIndex, setStoryIndex] = useState(-1);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);
  const [followDelta, setFollowDelta] = useState(0);
  const [followError, setFollowError] = useState('');
  const billRequestPending = useRef(false);
  const followPending = useRef(false);

  const activeUserId = dataMode === 'supabase' ? auth.user?.id : currentCustomer.id;
  const isOwner = role === 'owner' && (dataMode === 'mock' || business?.ownerId === activeUserId);

  useEffect(() => {
    if (!business) return;
    setDataLoaded(false);
    Promise.all([
      storyService.getByBusiness(business.id),
      storyService.getHighlights(business.id),
      postService.getByBusiness(business.id),
      dealService.getByBusiness(business.id),
      reviewService.getByBusiness(business.id),
      videoService.getByBusiness(business.id),
      auth.profile?.role === 'customer' && activeUserId
        ? followService.isFollowing(business.id, activeUserId)
        : Promise.resolve(false),
    ]).then(([s, h, p, d, r, v, following]) => {
      setStories(s);
      setHighlights(h);
      setPosts(p);
      setDeals(d);
      setReviews(r);
      setVideos(v);
      setIsFollowing(following);
      setDataLoaded(true);
    });
  }, [business, currentCustomer.id, activeUserId, auth.profile?.role]);

  if (loading) return <div className="max-w-2xl mx-auto"><ProfileSkeleton /></div>;
  if (error || !business) return <ErrorState title="Business unavailable" description={error || 'This business could not be found.'} />;

  const handleFollow = async () => {
    if (!dataLoaded) return;
    if (dataMode === 'supabase' && (!auth.user || auth.profile?.role !== 'customer')) {
      navigate('/auth');
      return;
    }
    if (followPending.current) return;
    followPending.current = true;
    setFollowError('');
    try {
      if (isFollowing) {
        await followService.unfollow(business.id, currentCustomer.id);
        setIsFollowing(false);
        setFollowDelta((value) => value - 1);
      } else {
        await followService.follow(business.id, currentCustomer.id, currentCustomer.displayName, currentCustomer.avatarUrl, 'profile');
        setIsFollowing(true);
        setFollowDelta((value) => value + 1);
      }
    } catch (caught: unknown) {
      setFollowError(caught instanceof Error ? caught.message : 'Follow could not be updated.');
    } finally {
      followPending.current = false;
    }
  };

  const handleRequestBill = async () => {
    if (!auth.user || auth.profile?.role !== 'customer') { navigate('/auth'); return; }
    if (!isFollowing) return;
    if (billRequestPending.current) return;
    billRequestPending.current = true;
    setRequestingBill(true);
    try {
      await founderV2Service.requestBill(business.id);
      window.alert('Bill requested. The business can now add your digital bill.');
    } catch (caught: unknown) {
      window.alert(caught instanceof Error ? caught.message : 'Could not request a bill.');
    } finally {
      billRequestPending.current = false;
      setRequestingBill(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[calc(100vw-1.5rem)] overflow-x-hidden pb-4 sm:max-w-2xl">
      {/* Cover */}
      <div className="relative aspect-[5/2] min-h-40 max-h-56 overflow-hidden rounded-b-2xl">
        <img src={business.coverUrl} alt={business.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Link to="/" className="absolute top-3 left-3 rounded-xl bg-white/90 p-2 text-gray-700 backdrop-blur-sm hover:bg-white">
          <ChevronLeft size={20} />
        </Link>
        <div className="absolute top-3 right-3 flex gap-2">
          <ShareButton title={business.name} url={`/business/${business.username}`} className="rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white" />
        </div>
      </div>

      {/* Header */}
      <div className="px-4">
        <div className="relative z-20 -mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="shrink-0 rounded-full bg-white p-1 shadow-sm dark:bg-gray-950"><Avatar src={business.logoUrl} alt={business.name} size="xl" ring /></div>
          <div className="flex w-full flex-wrap gap-2 pb-1 sm:w-auto sm:max-w-none sm:justify-end">
            {isOwner ? (
              <>
                <Link to="/owner/edit" className="btn-outline text-xs px-3 py-2"><Edit size={14} /> Edit Profile</Link>
                <Link to="/owner/qr" className="btn-outline text-xs px-3 py-2"><QrCode size={14} /> QR</Link>
                <Link to="/owner/analytics" className="btn-outline text-xs px-3 py-2"><BarChart3 size={14} /> Analytics</Link>
              </>
            ) : (
              <>
                {role !== 'owner' && <FollowButton isFollowing={isFollowing} onToggle={() => void handleFollow()} size="sm" disabled={!dataLoaded} />}
                {dataMode === 'supabase' && auth.profile?.role === 'customer' && <button type="button" className="btn-primary text-xs px-3 py-2" disabled={!isFollowing || requestingBill} onClick={() => void handleRequestBill()}>{requestingBill ? 'Requesting...' : 'Request Bill'}</button>}
                <Link to="/messages" className="btn-outline text-xs px-3 py-2"><MessageCircle size={14} /> Message</Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{business.name}</h1>
            {business.isVerified && <VerifiedBadge size={18} />}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{business.username}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{business.category} • {business.location}</p>

          <div className="mt-2 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button onClick={() => setShowFollowersModal(true)} className="justify-self-start text-sm">
              <span className="font-bold text-gray-900 dark:text-white">{formatNumber(Math.max(0, business.followerCount + followDelta))}</span>
              <span className="text-gray-500 dark:text-gray-400"> followers</span>
            </button>
            <button onClick={() => setActiveTab('reviews')} className="justify-self-start text-sm">
              <span className="font-bold text-gray-900 dark:text-white">{business.reviewCount}</span>
              <span className="text-gray-500 dark:text-gray-400"> reviews</span>
            </button>
            <RatingStars rating={business.rating} size={14} showValue className="justify-self-start" />
            <StatusBadge status={business.isOpenNow ? 'Open Now' : 'Closed'} variant={business.isOpenNow ? 'success' : 'error'} className="justify-self-start" />
          </div>

          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{business.bio}</p>
          {followError && <p className="mt-2 rounded-lg bg-error-50 p-2 text-xs text-error-600 dark:bg-error-500/10">{followError}</p>}

          {!isOwner && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`https://wa.me/${business.whatsapp.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs px-3 py-2">
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a href={`tel:${business.phone}`} className="btn-outline text-xs px-3 py-2">
                <Phone size={14} /> Call
              </a>
              <a href={`https://maps.google.com?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs px-3 py-2">
                <Navigation size={14} /> Directions
              </a>
            </div>
          )}
          {isOwner && (
            <><div className="mt-3 flex flex-wrap gap-2"><Link to="/owner/create?type=story" className="btn-primary text-xs px-3 py-2"><Plus size={14} /> Add Story</Link><Link to="/owner/ai-content" className="btn-outline text-xs px-3 py-2"><WandSparkles size={14} /> AI Studio</Link><Link to="/owner/create" className="btn-outline text-xs px-3 py-2"><Plus size={14} /> Create Post</Link></div><Link to="/owner/ai-content" className="mt-4 flex items-center justify-between overflow-hidden rounded-2xl bg-[#06100c] p-4 text-white"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand-300">Founder.env AI</p><p className="mt-1 font-semibold">Create today's post</p><p className="mt-1 text-xs text-white/45">Ready with your business memory.</p></div><AIOrb compact/></Link></>
          )}
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide">
            {highlights.map((h) => (
              <div key={h.id} className="flex flex-col items-center gap-1">
                <div className="rounded-full p-[2px] bg-gray-200 dark:bg-gray-700">
                  <div className="rounded-full bg-white p-[2px] dark:bg-gray-950">
                    <img src={h.coverUrl} alt={h.title} className="h-14 w-14 rounded-full object-cover" />
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{h.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stories */}
        {stories.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide">
            {stories.map((story, i) => (
              <StoryRing
                key={story.id}
                story={story}
                businessName={story.businessName}
                businessAvatar={story.businessLogo}
                hasUnseen={story.hasUnseen}
                onClick={() => setStoryIndex(i)}
                size="sm"
              />
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      {(location.state as { notice?: string } | null)?.notice && <div className="mx-4 mt-4 rounded-lg bg-success-50 p-3 text-sm font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">{(location.state as { notice: string }).notice}</div>}
      <div className="mt-4 px-4 sticky top-14 lg:top-16 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm z-10 -mx-0">
        <Tabs
          tabs={[
            { id: 'page', label: 'Page' },
            { id: 'deals', label: 'Deals' },
            { id: 'posts', label: 'Posts' },
            { id: 'videos', label: 'Videos' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'about', label: 'About' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="px-4 mt-4">
        {!dataLoaded ? (
          <LoadingSpinner size={32} className="py-12" />
        ) : activeTab === 'page' ? (
          <BusinessPageTab business={business} reviews={reviews} deals={deals.filter((deal) => Date.parse(deal.startDate) <= Date.now() && Date.parse(deal.endDate) >= Date.now())} posts={posts} onComment={setCommentPost} />
        ) : activeTab === 'deals' ? (
          deals.some((deal) => Date.parse(deal.startDate) <= Date.now() && Date.parse(deal.endDate) >= Date.now()) ? (
            <div className="space-y-4">{deals.filter((deal) => Date.parse(deal.startDate) <= Date.now() && Date.parse(deal.endDate) >= Date.now()).map((d) => <DealCard key={d.id} deal={d} />)}</div>
          ) : (
            <EmptyState icon="Tag" title="No deals available" description="Check back later for exclusive offers." />
          )
        ) : activeTab === 'posts' ? (
          posts.length > 0 ? (
            <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} onComment={setCommentPost} />)}</div>
          ) : (
            <EmptyState icon="Image" title="No posts yet" />
          )
        ) : activeTab === 'videos' ? (
          videos.length > 0 ? (
            <div className="space-y-4">
              {videos.map((v) => (
                <div key={v.id} className="card overflow-hidden">
                  <div className="aspect-[9/16] max-h-[500px]"><VideoCard clip={v} /></div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="Video" title="No videos yet" />
          )
        ) : activeTab === 'reviews' ? (
          <ReviewsTab reviews={reviews} isOwner={isOwner} onWriteReview={() => setShowReviewModal(true)} businessId={business.id} />
        ) : activeTab === 'about' ? (
          <AboutTab business={business} />
        ) : null}
      </div>

      {storyIndex >= 0 && stories[storyIndex] && (
        <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(-1)} isOwner={isOwner} />
      )}
      <CommentSheet open={!!commentPost} onClose={() => setCommentPost(null)} post={commentPost} />
      <WriteReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} businessId={business.id} businessName={business.name} onSubmitted={() => {
        reviewService.getByBusiness(business.id).then(setReviews);
      }} />
      <FollowersModal open={showFollowersModal} onClose={() => setShowFollowersModal(false)} businessId={business.id} isOwner={isOwner} />
    </div>
  );
}

function BusinessPageTab({ business, reviews, deals, posts, onComment }: { business: import('@/types').Business; reviews: Review[]; deals: Deal[]; posts: Post[]; onComment: (post: Post) => void }) {
  return (
    <div className="space-y-6">
      {business.todayOffer && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-4 text-white">
          <p className="text-xs uppercase tracking-wider text-white/70">Today's Offer</p>
          <p className="mt-1 text-base font-semibold">{business.todayOffer}</p>
        </div>
      )}

      {deals.length > 0 && <section><h2 className="section-title mb-3">Featured Deals</h2><div className="space-y-4">{deals.slice(0, 2).map((deal) => <DealCard key={deal.id} deal={deal} />)}</div></section>}

      {posts.length > 0 && <section><h2 className="section-title mb-3">Recent Posts</h2><div className="space-y-4">{posts.slice(0, 2).map((post) => <PostCard key={post.id} post={post} onComment={onComment} />)}</div></section>}

      {business.featuredProducts.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Featured Products</h2>
          <div className="grid grid-cols-2 gap-3">
            {business.featuredProducts.map((p) => (
              <div key={p.name} className="card overflow-hidden">
                <img src={p.image} alt={p.name} className="h-32 w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>}
                  <p className="mt-1.5 text-sm font-bold text-brand-600 dark:text-brand-500">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {business.popularItems.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Popular Items</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {business.popularItems.map((item) => (
              <div key={item.name} className="w-32 shrink-0 card overflow-hidden">
                <img src={item.image} alt={item.name} className="h-24 w-full object-cover" loading="lazy" />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-500">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {business.galleryImages.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Gallery</h2>
          <div className="grid grid-cols-3 gap-2">
            {business.galleryImages.map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl">
                <img src={img} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="section-title">Reviews</h2><RatingStars rating={business.rating} showValue reviewCount={business.reviewCount} /></div>
        {reviews.length ? <div className="space-y-3">{reviews.slice(0, 2).map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <EmptyState icon="Star" title="No reviews yet" className="card py-8" />}
      </section>

      <div className="text-center pb-4">
        <p className="text-xs text-gray-400">Built with Founder.env</p>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, isOwner, onWriteReview, businessId }: { reviews: Review[]; isOwner: boolean; onWriteReview: () => void; businessId: string }) {
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [visibleReviews, setVisibleReviews] = useState(reviews);
  useEffect(() => setVisibleReviews(reviews), [reviews]);
  const average = visibleReviews.length ? visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length : 0;

  const submitReply = () => {
    if (!replyTarget || !replyText.trim()) return;
    reviewService.reply(replyTarget.id, replyText.trim()).then((reply) => {
      reviewService.getByBusiness(businessId).then((updated) => {
        setVisibleReviews(updated.map((review) => review.id === replyTarget.id ? { ...review, reply } : review));
        setReplyTarget(null);
        setReplyText('');
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-4"><div className="text-center"><p className="text-3xl font-bold">{average.toFixed(1)}</p><RatingStars rating={average} size={14} /><p className="mt-1 text-xs text-gray-400">{visibleReviews.length} ratings</p></div><div className="flex-1 space-y-1">{[5, 4, 3, 2, 1].map((star) => { const count = visibleReviews.filter((review) => review.rating === star).length; const width = visibleReviews.length ? count / visibleReviews.length * 100 : 0; return <div key={star} className="flex items-center gap-2 text-xs"><span className="w-3 text-gray-500">{star}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} /></div><span className="w-5 text-right text-gray-400">{count}</span></div>; })}</div></div>
      </div>
      {!isOwner && (
        <button onClick={onWriteReview} className="btn-primary w-full">
          <Star size={16} /> Write a Review
        </button>
      )}
      {visibleReviews.length > 0 ? (
        visibleReviews.map((r) => (
          <ReviewCard key={r.id} review={r} isOwner={isOwner} onReply={(rev) => setReplyTarget(rev)} />
        ))
      ) : (
        <EmptyState icon="Star" title="No reviews yet" description="Be the first to share your experience." />
      )}

      <Modal open={!!replyTarget} onClose={() => setReplyTarget(null)} title="Reply to Review" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">{replyTarget?.text}</p>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            rows={3}
            className="input resize-none"
          />
          <button onClick={submitReply} disabled={!replyText.trim()} className="btn-primary w-full">Post Reply</button>
        </div>
      </Modal>
    </div>
  );
}

function AboutTab({ business }: { business: import('@/types').Business }) {
  const websiteUrl = business.socialLinks.website
    ? (/^https?:\/\//i.test(business.socialLinks.website) ? business.socialLinks.website : `https://${business.socialLinks.website}`)
    : '';
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Description</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{business.description || business.bio}</p>
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Business Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Category</span><span className="text-gray-900 dark:text-gray-100">{business.category}</span></div>
          <div className="flex gap-4"><span className="shrink-0 text-gray-500 dark:text-gray-400">Address</span><span className="ml-auto text-right text-gray-900 dark:text-gray-100">{business.address || business.location}</span></div>
        </div>
      </div>
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Contact</h3>
        <div className="space-y-3 text-sm">
          {business.phone && <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300"><Phone size={17} />{business.phone}</a>}
          {business.whatsapp && <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300"><MessageCircle size={17} />WhatsApp</a>}
          {business.socialLinks.instagram && <a href={`https://instagram.com/${business.socialLinks.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300"><Instagram size={17} />Instagram</a>}
          {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-gray-700 hover:text-brand-600 dark:text-gray-300"><Globe size={17} className="shrink-0" />{business.socialLinks.website}</a>}
          <a href={`https://maps.google.com?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300"><Navigation size={17} />Directions</a>
        </div>
      </div>
      <div className="card overflow-hidden">
        <h3 className="px-4 pt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Opening Hours</h3>
        <div className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">{business.openingHours.map((hours) => <div key={hours.day} className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-gray-500 dark:text-gray-400">{hours.day}</span><span className={cn('font-medium', hours.closed ? 'text-error-500' : 'text-gray-900 dark:text-gray-100')}>{hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}</span></div>)}</div>
      </div>
    </div>
  );
}

function WriteReviewModal({ open, onClose, businessId, businessName, onSubmitted }: { open: boolean; onClose: () => void; businessId: string; businessName: string; onSubmitted: () => void }) {
  const currentCustomer = useCurrentCustomer();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [hover, setHover] = useState(0);

  const submit = () => {
    if (!text.trim()) return;
    reviewService.add(businessId, currentCustomer.id, currentCustomer.displayName, currentCustomer.avatarUrl, rating, text.trim()).then(() => {
      onSubmitted();
      setText('');
      setRating(5);
      onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Review ${businessName}`} size="sm">
      <div className="space-y-4">
        <div>
          <p className="label">Your rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)} className="no-tap">
                <Star size={32} className={cn((hover || rating) >= s ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700')} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Your experience</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your experience..." rows={4} className="input resize-none" />
        </div>
        <button onClick={submit} disabled={!text.trim()} className="btn-primary w-full">Submit Review</button>
        <p className="text-xs text-gray-400 text-center">Demo only. Reviews will be verified with Google login in production.</p>
      </div>
    </Modal>
  );
}

function FollowersModal({ open, onClose, businessId, isOwner }: { open: boolean; onClose: () => void; businessId: string; isOwner: boolean }) {
  const [followers, setFollowers] = useState<import('@/types').BusinessFollower[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      followService.getFollowers(businessId).then((f) => {
        setFollowers(f);
        setLoading(false);
      });
    }
  }, [open, businessId]);

  return (
    <Modal open={open} onClose={onClose} title="Followers" size="sm">
      {loading ? <LoadingSpinner size={24} className="py-8" /> : followers.length === 0 ? (
        <EmptyState icon="Users" title="No followers yet" />
      ) : (
        <div className="space-y-2">
          {followers.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Avatar src={f.avatarUrl} alt={f.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.displayName}</p>
                {isOwner && (
                  <p className="text-xs text-gray-400">
                    Followed {timeAgo(f.followedAt)} via {f.source}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {isOwner && <p className="mt-3 text-xs text-gray-400 text-center">Customer emails are private and not visible to business owners.</p>}
    </Modal>
  );
}
