import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Factory, ChevronDown, Flag, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/types';
import { formatDateTime, formatDate, cn } from '@/lib/utils';

type SortBy = 'newest' | 'oldest' | 'priority' | 'deadline';

const PRODUCTION_STATUSES = ['confirmed', 'payment_verified', 'printing', 'painting', 'quality_check', 'packaging'];

export default function AdminProductionQueue() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [painters, setPainters] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<Record<string, 'low' | 'normal' | 'high'>>({});

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', PRODUCTION_STATUSES)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const sorted = useMemo(() => {
    const arr = [...orders];
    if (sortBy === 'newest') arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'oldest') arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === 'priority') {
      const pri = { high: 0, normal: 1, low: 2 };
      arr.sort((a, b) => (pri[priorities[a.id] ?? 'normal'] - pri[priorities[b.id] ?? 'normal']));
    }
    if (sortBy === 'deadline') arr.sort((a, b) => (a.estimated_delivery ?? '').localeCompare(b.estimated_delivery ?? ''));
    return arr;
  }, [orders, sortBy, priorities]);

  const handleAssignPainter = async (orderId: string, painter: string) => {
    setPainters((prev) => ({ ...prev, [orderId]: painter }));
    toast('Painter assigned', 'success');
    await supabase.from('admin_activity_log').insert({
      admin_email: user?.email ?? 'admin',
      action: `Assigned painter ${painter} to order`,
      entity_type: 'order',
      entity_id: orderId,
    });
  };

  const handleSetPriority = async (orderId: string, priority: 'low' | 'normal' | 'high') => {
    setPriorities((prev) => ({ ...prev, [orderId]: priority }));
    toast(`Priority set to ${priority}`, 'success');
  };

  const daysRemaining = (estimatedDelivery: string | null) => {
    if (!estimatedDelivery) return null;
    const diff = new Date(estimatedDelivery).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Factory className="w-7 h-7 text-primary-500" /> Production Queue
        </h1>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="input-field appearance-none pr-10 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority</option>
            <option value="deadline">Deadline</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <Factory className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No orders in production</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((order, i) => {
            const days = daysRemaining(order.estimated_delivery);
            const priority = priorities[order.id] ?? 'normal';
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">{order.order_number}</span>
                      <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs">{order.status.replace(/_/g, ' ')}</span>
                      <span className={cn(
                        'badge text-xs',
                        priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        priority === 'low' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      )}>
                        {priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{order.full_name} - {order.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                      {order.order_items?.map((item) => (
                        <span key={item.id} className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.product_name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {days !== null && (
                      <span className={cn(
                        'text-xs font-medium flex items-center gap-1',
                        days < 0 ? 'text-red-500' : days < 3 ? 'text-amber-500' : 'text-slate-500'
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                      </span>
                    )}
                    {order.estimated_delivery && (
                      <span className="text-xs text-slate-400">Due: {formatDate(order.estimated_delivery)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <input
                    placeholder="Assign painter..."
                    value={painters[order.id] ?? ''}
                    onChange={(e) => handleAssignPainter(order.id, e.target.value)}
                    className="input-field text-xs py-1.5 px-3 max-w-[180px]"
                  />
                  <select
                    value={priority}
                    onChange={(e) => handleSetPriority(order.id, e.target.value as 'low' | 'normal' | 'high')}
                    className="input-field text-xs py-1.5 px-3 appearance-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
