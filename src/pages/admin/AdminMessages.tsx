import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Send, Clock, CheckCheck, Inbox, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Message } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';

export default function AdminMessages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.subject ?? '').toLowerCase().includes(q)
    );
  }, [messages, search]);

  const handleSelect = async (message: Message) => {
    setSelected(message);
    setReply(message.admin_reply ?? '');
    if (!message.is_read) {
      await supabase.from('messages').update({ is_read: true }).eq('id', message.id);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
    }
  };

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('messages')
      .update({ admin_reply: reply.trim() })
      .eq('id', selected.id);
    if (error) {
      toast('Failed to save reply', 'error');
    } else {
      toast('Reply saved', 'success');
      setMessages((prev) =>
        prev.map((m) => (m.id === selected.id ? { ...m, admin_reply: reply.trim() } : m))
      );
      setSelected((prev) => (prev ? { ...prev, admin_reply: reply.trim() } : prev));
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
        {unreadCount > 0 && (
          <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 h-[calc(100vh-200px)] min-h-[500px]">
        {/* List */}
        <div className="flex flex-col min-h-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="input-field pl-10"
            />
          </div>
          <div className="card flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 skeleton rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-slate-500 text-sm">No messages</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleSelect(message)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3',
                      selected?.id === message.id && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                        {message.name[0]?.toUpperCase()}
                      </div>
                      {!message.is_read && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white dark:border-slate-900" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm truncate', !message.is_read && 'font-bold')}>{message.name}</p>
                        <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(message.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{message.email}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {message.subject ?? '(no subject)'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="card p-6 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500">Select a message to view</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                    {selected.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.is_read ? (
                    <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> Read
                    </span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> New
                    </span>
                  )}
                </div>
              </div>

              {/* Subject */}
              {selected.subject && (
                <h3 className="font-semibold text-lg mb-2">{selected.subject}</h3>
              )}

              {/* Body */}
              <div className="flex-1 mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selected.body}</p>
              </div>

              <p className="text-xs text-slate-400 mb-4">{formatDateTime(selected.created_at)}</p>

              {/* Reply */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="text-sm font-medium mb-1.5 block">Reply</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="input-field min-h-[100px] resize-y text-sm"
                />
                <button
                  onClick={handleReply}
                  disabled={saving || !reply.trim()}
                  className="btn-primary inline-flex items-center gap-2 text-sm mt-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Reply'}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  Note: Replies are saved to the database. Connect an email service to send them automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
