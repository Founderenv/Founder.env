import { useState, useEffect, useRef } from 'react';
import { VideoCard } from '@/components/social/VideoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { videoService } from '@/services';
import type { VideoClip } from '@/types';

export function ClipsPage() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    videoService.getAll().then((c) => {
      setClips(c);
      setLoading(false);
    });
  }, []);

  const onScroll = () => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('[data-clip]');
    const containerTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;
    let closest = 0;
    let minDist = Infinity;
    items.forEach((item, i) => {
      const el = item as HTMLElement;
      const dist = Math.abs(el.offsetTop - containerTop - containerHeight / 2 + el.offsetHeight / 2);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setActiveIndex(closest);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" /></div>;
  }

  if (clips.length === 0) {
    return <div className="flex h-screen items-center justify-center"><EmptyState icon="Video" title="No clips available" description="Businesses haven't posted any clips yet." /></div>;
  }

  return (
    <div ref={containerRef} onScroll={onScroll} className="h-[calc(100vh-0px)] lg:h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide bg-black">
      {clips.map((clip, i) => (
        <div key={clip.id} data-clip className="h-screen w-full snap-center flex items-center justify-center">
          <div className="relative h-full w-full max-w-md mx-auto">
            <VideoCard clip={clip} />
            {i !== activeIndex && <div className="absolute inset-0 bg-black/30" />}
          </div>
        </div>
      ))}
    </div>
  );
}
