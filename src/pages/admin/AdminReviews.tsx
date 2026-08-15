import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, Trash2, MessageSquare, X, Send, Clock, ShieldCheck, Pin, PinOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Review } from '@/types';
import { formatDate, cn } from '@/lib/utils';

type FilterType = 'pending' | 'approved' | 'all';

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles:profiles(*)')
      .order('created_at', { ascending: false });
    setReviews((data as Review[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'pending') return reviews.filter((r) => !r.is_approved);
    if (filter === 'approved') return reviews.filter((r) => r.is_approved);
    return reviews;
  }, [reviews, filter]);

  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  const handleApprove = async (review: Review) => {
    const { error } = await supabase.from('reviews').update({ is_approved: true }).eq('id', review.id);
    if (error) {
      toast('Failed to approve review', 'error');
    } else {
      toast('Review approved', 'success');
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_approved: true } : r)));
    }
  };

  const handleReject = async (review: Review) => {
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    if (error) {
      toast('Failed to reject review', 'error');
    } else {
      toast('Review rejected', 'info');
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    }
  };

  const handlePin = async (review: Review) => {
    const { error } = await supabase.from('reviews').update({ is_pinned: !review.is_pinned }).eq('id', review.id);
    if (error) {
      toast('Failed to update pin status', 'error');
    } else {
      toast(review.is_pinned ? 'Review unpinned' : 'Review pinned', 'success');
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_pinned: !r.is_pinned } : r)));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from('reviews').delete().eq('id', confirmDelete.id);
    if (error) {
      toast('Failed to delete review', 'error');
    } else {
      toast('Review deleted', 'info');
      setReviews((prev) => prev.filter((r) => r.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  };

  const handleReply = async (review: Review) => {
    if (!replyText.trim()) return;
    const { error } = await supabase.from('reviews').update({ admin_reply: replyText.trim() }).eq('id', review.id);
    if (error) {
      toast('Failed to save reply', 'error');
    } else {
      toast('Reply saved', 'success');
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, admin_reply: replyText.trim() } : r)));
    }
    setReplyingTo(null);
    setReplyText('');
  };

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: reviews.filter((r) => r.is_approved).length },
    { key: 'all', label: 'All', count: reviews.length },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Reviews</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === tab.key
                ? 'bg-primary-600 text-white'
                : 'glass hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {tab.label}
            <span className={cn('ml-2 text-xs', filter === tab.key ? 'opacity-80' : 'text-slate-500')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No reviews found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'w-4 h-4',
                          star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                        )}
                      />
                    ))}
                  </div>
                  {!review.is_approved && (
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {review.is_approved && (
                    <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Approved
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
              </div>

              {/* Content */}
              {review.title && <h3 className="font-semibold mb-1">{review.title}</h3>}
              {review.body && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{review.body}</p>}

              {/* Images */}
              {review.image_urls && review.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {review.image_urls.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {/* User */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                  {(review.profiles?.full_name ?? '?')[0]?.toUpperCase()}
                </div>
                <span>{review.profiles?.full_name ?? 'Anonymous'}</span>
                {review.is_verified_purchase && (
                  <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                    Verified
                  </span>
                )}
              </div>

              {/* Admin reply */}
              {review.admin_reply && (
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-primary-700 dark:text-primary-400 mb-1">Admin Reply</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{review.admin_reply}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {!review.is_approved && (
                  <>
                    <button
                      onClick={() => handleApprove(review)}
                      className="btn-secondary text-xs inline-flex items-center gap-1.5 !py-2 !px-3"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(review)}
                      className="text-xs inline-flex items-center gap-1.5 !py-2 !px-3 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {review.is_approved && (
                  <button
                    onClick={() => handlePin(review)}
                    className={cn(
                      'text-xs inline-flex items-center gap-1.5 !py-2 !px-3 rounded-lg transition-colors',
                      review.is_pinned
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {review.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    {review.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setReplyingTo(replyingTo === review.id ? null : review.id);
                    setReplyText(review.admin_reply ?? '');
                  }}
                  className="btn-ghost text-xs inline-flex items-center gap-1.5 !py-2 !px-3"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> {review.admin_reply ? 'Edit Reply' : 'Reply'}
                </button>
                <button
                  onClick={() => setConfirmDelete(review)}
                  className="text-xs inline-flex items-center gap-1.5 !py-2 !px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {/* Reply box */}
              <AnimatePresence>
                {replyingTo === review.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="input-field min-h-[80px] resize-y text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReply(review)}
                          className="btn-primary text-xs inline-flex items-center gap-1.5 !py-2 !px-4"
                        >
                          <Send className="w-3.5 h-3.5" /> Save Reply
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          className="btn-secondary text-xs !py-2 !px-4"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Delete Review?</h3>
              <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
