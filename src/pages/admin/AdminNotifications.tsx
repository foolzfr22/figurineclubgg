import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, Package, Star, AlertTriangle, Mail, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime, cn } from '@/lib/utils';
import type { AdminNotification } from '@/types';

const ICON_MAP: Record<string, typeof Bell> = {
  new_order: Package,
  whatsapp_confirmation: Package,
  new_review: Star,
  cancellation_request: XCircle,
  refund_request: XCircle,
  low_stock: AlertTriangle,
  out_of_stock: AlertTriangle,
  new_message: Mail,
  damage_claim: AlertTriangle,
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setNotifications((data as AdminNotification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    for (const n of unread) {
      await supabase.from('admin_notifications').update({ is_read: true }).eq('id', n.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('admin_notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary-500" /> Notifications
          </h1>
          {unreadCount > 0 && <p className="text-sm text-primary-600 mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm inline-flex items-center gap-2">
            <Check className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = ICON_MAP[n.type] ?? Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'card p-4 flex items-start gap-3',
                  !n.is_read && 'ring-1 ring-primary-500/20 bg-primary-50/50 dark:bg-primary-900/10'
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', n.is_read ? 'bg-slate-100 dark:bg-slate-800' : 'bg-primary-100 dark:bg-primary-900/30')}>
                  <Icon className={cn('w-5 h-5', n.is_read ? 'text-slate-400' : 'text-primary-600 dark:text-primary-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.message && <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <button onClick={() => handleMarkRead(n.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Mark as read">
                      <Check className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(n.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
