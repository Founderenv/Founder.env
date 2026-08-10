import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Repeat2, Share2, Tag, Music2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import { cn, formatNumber } from '@/utils/format';
import type { VideoClip } from '@/types';
import { videoService } from '@/services';

export function VideoCard({ clip: initialClip }: { clip: VideoClip }) {
  const [clip, setClip] = useState(initialClip);

  const toggleLike = () => videoService.toggleLike(clip.id).then((u) => u && setClip(u));
  const toggleSave = () => videoService.toggleSave(clip.id).then((u) => u && setClip(u));

  return (
    <div className="relative h-full w-full snap-center overflow-hidden bg-black">
      <img src={clip.thumbnailUrl} alt={clip.caption} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link to={`/business/${clip.businessUsername}`} className="flex items-center gap-2 mb-3">
              <Avatar src={clip.businessLogo} alt={clip.businessName} size="sm" />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-white">{clip.businessName}</span>
                  <VerifiedBadge size={14} />
                </div>
                <p className="text-xs text-white/60">{clip.businessCategory}</p>
              </div>
            </Link>
            <p className="text-sm text-white/90 mb-2 line-clamp-2">{clip.caption}</p>
            {clip.music && (
              <div className="flex items-center gap-1.5 text-xs text-white/60 mb-2">
                <Music2 size={12} /> {clip.music}
              </div>
            )}
            {clip.dealTitle && (
              <Link to={`/business/${clip.businessUsername}/deals`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                <Tag size={14} /> {clip.dealTitle}
              </Link>
            )}
          </div>
          <div className="flex flex-col items-center gap-4 pb-2">
            <button onClick={toggleLike} className="flex flex-col items-center no-tap" aria-label="Like">
              <Heart size={28} className={cn(clip.isLiked ? 'fill-error-500 text-error-500' : 'text-white')} />
              <span className="text-xs text-white mt-1">{formatNumber(clip.likeCount)}</span>
            </button>
            <button onClick={() => window.alert('Deal Clip comments will open after the backend conversation store is connected.')} className="flex flex-col items-center no-tap" aria-label="Comment">
              <MessageCircle size={28} className="text-white" />
              <span className="text-xs text-white mt-1">{formatNumber(clip.commentCount)}</span>
            </button>
            <button onClick={() => window.alert('Reposted in this frontend preview. Persistence requires Supabase.')} className="flex flex-col items-center no-tap" aria-label="Repost">
              <Repeat2 size={28} className="text-white" />
              <span className="text-xs text-white mt-1">{formatNumber(clip.shareCount)}</span>
            </button>
            <button onClick={toggleSave} className="flex flex-col items-center no-tap" aria-label="Save">
              <Bookmark size={28} className={cn(clip.isSaved ? 'fill-white text-white' : 'text-white')} />
              <span className="text-xs text-white mt-1">{formatNumber(clip.saveCount)}</span>
            </button>
            <ShareButtonDark title={clip.caption} url={`/#/business/${clip.businessUsername}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareButtonDark({ title, url }: { title: string; url: string }) {
  return (
    <a
      href={url}
      onClick={(e) => {
        e.preventDefault();
        if (navigator.share) navigator.share({ title, url });
        else navigator.clipboard?.writeText(url).then(() => window.alert('Link copied.'));
      }}
      className="flex flex-col items-center no-tap"
      aria-label="Share"
    >
      <Share2 size={28} className="text-white" />
    </a>
  );
}
