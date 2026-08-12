import { useState, useEffect, useRef } from 'react';
import { Send, Heart } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, timeAgo, formatNumber } from '@/utils/format';
import type { Comment, Post } from '@/types';
import { postService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import { useAuth } from '@/auth/AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';

interface CommentSheetProps {
  open: boolean;
  onClose: () => void;
  post: Post | null;
}

export function CommentSheet({ open, onClose, post }: CommentSheetProps) {
  const currentCustomer = useCurrentCustomer();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && post) {
      setLoading(true);
      setError('');
      postService.getComments(post.id).then(setComments).catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Comments could not be loaded.');
      }).finally(() => setLoading(false));
    }
  }, [open, post]);

  const submit = async () => {
    if (!text.trim() || !post) return;
    if (auth.isBackendMode && !auth.user) {
      onClose();
      navigate('/auth', { state: { returnTo: location.pathname } });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const c = await postService.addComment(
        post.id, text.trim(), currentCustomer.id, currentCustomer.displayName, currentCustomer.avatarUrl,
        auth.profile?.role === 'business_owner' ? 'owner' : 'customer'
      );
      setComments((prev) => [...prev, c]);
      setText('');
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Your comment could not be posted.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Comments">
      <div ref={listRef} className="space-y-4 min-h-[200px] max-h-[400px] overflow-y-auto mb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState icon="MessageCircle" title="No comments yet" description="Be the first to share your thoughts." />
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar src={c.authorAvatar} alt={c.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.authorName}</span>
                  {c.authorRole === 'owner' && (
                    <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-500">Owner</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{c.text}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                  <button onClick={() => window.alert('Comment reaction saved for preview. Backend persistence is pending.')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-error-500">
                    <Heart size={12} /> {formatNumber(c.likeCount)}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {error && <p className="mb-3 rounded-lg bg-error-50 p-2 text-xs text-error-600 dark:bg-error-500/10">{error}</p>}
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <Avatar src={currentCustomer.avatarUrl} alt={currentCustomer.displayName} size="sm" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          placeholder="Add a comment..."
          className="flex-1 input py-2"
        />
        <button
          onClick={() => void submit()}
          disabled={!text.trim() || submitting}
          className={cn('rounded-xl p-2.5 transition-colors', text.trim() ? 'text-brand-600' : 'text-gray-300 dark:text-gray-600')}
          aria-label="Send comment"
        >
          <Send size={20} />
        </button>
      </div>
    </Sheet>
  );
}
