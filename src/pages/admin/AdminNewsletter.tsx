import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Mail, Search, Send, X, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { NewsletterSubscriber } from '@/types';
import { formatDate, downloadCSV } from '@/lib/utils';

export default function AdminNewsletter() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchSubscribers = async () => {
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    setSubscribers((data as NewsletterSubscriber[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscribers();

    const channel = supabase
      .channel('admin-newsletter')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'newsletter_subscribers' }, () => {
        fetchSubscribers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleExport = () => {
    downloadCSV(
      'newsletter-subscribers.csv',
      subscribers.map((s) => ({
        email: s.email,
        subscribed_date: formatDate(s.created_at),
      }))
    );
    toast('Subscribers exported', 'success');
  };

  const handleSendNewsletter = async () => {
    if (!compose.subject.trim() || !compose.body.trim()) {
      toast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      const subscriberIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'newsletter',
          subject: compose.subject.trim(),
          body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #6366f1;">Figure Club Newsletter</h2>
  <div style="white-space: pre-wrap; line-height: 1.6;">${compose.body.trim()}</div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">You received this email because you subscribed to the Figure Club newsletter.</p>
</div>`,
          subscriberIds,
        },
      });
      if (error) {
        toast('Newsletter saved, but email service may not be configured', 'info');
      } else {
        toast(`Newsletter sent to ${selectedIds.size > 0 ? selectedIds.size : subscribers.length} subscriber(s)`, 'success');
      }
      setShowCompose(false);
      setCompose({ subject: '', body: '' });
      setSelectedIds(new Set());
    } catch {
      toast('Failed to send newsletter', 'error');
    }
    setSending(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Newsletter</h1>
          {subscribers.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">{subscribers.length} subscriber{subscribers.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowCompose(!showCompose)}
            disabled={subscribers.length === 0}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      {/* Compose form */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6 mb-6 space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Compose Newsletter</h2>
              <button onClick={() => setShowCompose(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <input
                value={compose.subject}
                onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                placeholder="Newsletter subject..."
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <textarea
                value={compose.body}
                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                placeholder="Write your newsletter content here..."
                className="input-field min-h-[160px] resize-y text-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4" />
              <span>
                Sending to {selectedIds.size > 0 ? selectedIds.size : subscribers.length} subscriber{selectedIds.size === 1 ? '' : 's'}
                {selectedIds.size > 0 && ' (selected only)'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendNewsletter}
                disabled={sending || !compose.subject.trim() || !compose.body.trim()}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Newsletter</>
                )}
              </button>
              <button onClick={() => setShowCompose(false)} className="btn-secondary">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="input-field pl-10"
        />
      </div>

      {/* Selection bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 text-sm">
          <button onClick={toggleSelectAll} className="text-primary-600 hover:underline font-medium">
            {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-slate-500">{selectedIds.size} selected</span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No subscribers found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Subscribed Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    selectedIds.has(sub.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelect(sub.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">{sub.email}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
