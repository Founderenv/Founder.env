import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Repeat2, MoreHorizontal, MapPin, Tag } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import { FollowButton } from '@/components/ui/FollowButton';
import { ShareButton } from '@/components/ui/ShareSheet';
import { formatNumber, timeAgo, cn } from '@/utils/format';
import type { Post } from '@/types';
import { postService } from '@/services';

interface PostCardProps {
  post: Post;
  onComment?: (post: Post) => void;
}

export function PostCard({ post: initialPost, onComment }: PostCardProps) {
  const [post, setPost] = useState(initialPost);

  const toggleLike = () => {
    postService.toggleLike(post.id).then((updated) => updated && setPost(updated));
  };
  const toggleSave = () => {
    postService.toggleSave(post.id).then((updated) => updated && setPost(updated));
  };
  const toggleRepost = () => {
    postService.toggleRepost(post.id).then((updated) => updated && setPost(updated));
  };

  return (
    <article className="card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3 p-3">
        <Link to={`/business/${post.businessUsername}`}>
          <Avatar src={post.businessAvatar} alt={post.businessName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link to={`/business/${post.businessUsername}`} className="text-sm font-semibold text-gray-900 hover:underline dark:text-gray-100 truncate">
              {post.businessName}
            </Link>
            <VerifiedBadge size={14} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {post.businessCategory} • {post.businessLocation}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!post.isFollowing && (
            <FollowButton isFollowing={post.isFollowing} onToggle={() => setPost((current) => ({ ...current, isFollowing: true }))} size="sm" />
          )}
          <button onClick={() => window.alert('Content reporting options will be submitted through the backend.')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="More">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800" onClick={toggleLike}>
        <img src={post.media[0]?.url} alt={post.caption} className="h-full w-full object-cover" loading="lazy" />
        {post.type !== 'standard' && (
          <span className="absolute top-3 left-3 badge bg-black/60 text-white">
            <Tag size={12} /> {post.type.replace('_', ' ')}
          </span>
        )}
        {post.dealId && (
          <Link
            to={`/business/${post.businessUsername}/deals`}
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 backdrop-blur-sm hover:bg-white"
          >
            <Tag size={14} /> View Deal
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="flex items-center gap-1.5 no-tap" aria-label="Like">
            <Heart
              size={22}
              className={cn(
                'transition-transform active:scale-90',
                post.isLiked ? 'fill-error-500 text-error-500' : 'text-gray-700 dark:text-gray-300'
              )}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatNumber(post.likeCount)}</span>
          </button>
          <button onClick={() => onComment?.(post)} className="flex items-center gap-1.5 no-tap" aria-label="Comment">
            <MessageCircle size={22} className="text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatNumber(post.commentCount)}</span>
          </button>
          <button onClick={toggleRepost} className="flex items-center gap-1.5 no-tap" aria-label="Repost">
            <Repeat2
              size={22}
              className={cn(
                'transition-transform active:scale-90',
                post.isReposted ? 'text-brand-600' : 'text-gray-700 dark:text-gray-300'
              )}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatNumber(post.repostCount)}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton title={`${post.businessName} on Founder.env`} url={`/#/business/${post.businessUsername}`} />
          <button onClick={toggleSave} className="no-tap" aria-label="Save">
            <Bookmark
              size={22}
              className={cn(
                'transition-transform active:scale-90',
                post.isSaved ? 'fill-gray-900 text-gray-900 dark:fill-white dark:text-white' : 'text-gray-700 dark:text-gray-300'
              )}
            />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.caption}</p>
        {post.location && (
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin size={12} /> {post.location}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.createdAt)}</span>
          {post.ctaLabel && (
            <Link
              to={post.ctaLink || `/business/${post.businessUsername}`}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-500"
            >
              {post.ctaLabel} →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
