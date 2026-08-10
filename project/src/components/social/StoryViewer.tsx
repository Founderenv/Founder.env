import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, ExternalLink, Tag, Eye, Heart, Pause, Play } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import type { Story } from '@/types';
import { formatNumber } from '@/utils/format';

interface StoryViewerProps {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  isOwner?: boolean;
}

export function StoryViewer({ stories, startIndex, onClose, isOwner }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const story = stories[currentIndex];

  const next = useCallback(() => {
    if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
    else onClose();
  }, [currentIndex, stories.length, onClose]);

  const prev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  useEffect(() => {
    setProgress(0);
    if (paused) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentIndex, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col select-none">
      <div className="absolute top-0 left-0 right-0 z-10 p-3 pt-4">
        <div className="flex gap-1.5 mb-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar src={story.businessLogo} alt={story.businessName} size="sm" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-white">{story.businessName}</span>
                <VerifiedBadge size={14} />
              </div>
              <span className="text-xs text-white/60">@{story.businessUsername}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-full p-2 text-white/80 hover:bg-white/10"
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative flex-1 flex items-center justify-center"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 3) prev();
          else next();
        }}
      >
        <img src={story.mediaUrl} alt={story.caption || story.businessName} className="max-h-full max-w-full object-contain" />

        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {story.caption && (
        <div className="absolute bottom-20 left-0 right-0 px-4 text-center">
          <p className="text-sm text-white/90 max-w-md mx-auto">{story.caption}</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
        {isOwner ? (
          <div className="flex items-center justify-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-1.5">
              <Eye size={18} />
              {formatNumber(story.viewCount)} views
            </div>
            <div className="flex items-center gap-1.5">
              <Heart size={18} />
              {formatNumber(story.interactionCount)} interactions
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5">
              <Send size={16} className="text-white/60" />
              <input
                placeholder={`Reply to ${story.businessName}...`}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
                onClick={(e) => { e.stopPropagation(); window.alert('Deal claimed in frontend preview. Server-side verification is pending.'); }}
              />
            </div>
            {story.dealId && (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                onClick={(e) => e.stopPropagation()}
              >
                <Tag size={16} /> Claim Deal
              </button>
            )}
            <a
              href={`/#/business/${story.businessUsername}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
              aria-label="Visit business"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
