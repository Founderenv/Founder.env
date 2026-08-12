import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { PostCard } from '@/components/social/PostCard';
import { CommentSheet } from '@/components/social/CommentSheet';
import { ErrorState, FeedSkeleton } from '@/components/ui/States';
import { postService } from '@/services';
import type { Post } from '@/types';

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentPost, setCommentPost] = useState<Post | null>(null);

  useEffect(() => {
    let active = true;
    void postService.getById(postId)
      .then((result) => {
        if (!active) return;
        if (!result) setError('This post is unavailable or is no longer public.');
        else setPost(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'This post could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [postId]);

  if (loading) return <div className="mx-auto max-w-feed"><FeedSkeleton /></div>;
  if (error || !post) return <ErrorState title="Post unavailable" description={error || 'This post could not be found.'} />;

  return (
    <div className="mx-auto max-w-feed pb-8">
      <Link to={`/business/${post.businessUsername}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ChevronLeft size={18} /> {post.businessName}
      </Link>
      <PostCard post={post} onComment={setCommentPost} />
      <CommentSheet open={!!commentPost} onClose={() => setCommentPost(null)} post={commentPost} />
    </div>
  );
}
