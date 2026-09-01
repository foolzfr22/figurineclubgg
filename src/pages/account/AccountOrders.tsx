import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Order } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import UIMediaRenderer from '@/components/UIMediaRenderer';

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

export default function AccountOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleRequestCancellation = async (orderId: string) => {
    if (!cancelReason.trim()) {
      toast('Please provide a reason for cancellation', 'error');
      return;
    }
    const { error } = await supabase
      .from('orders')
      .update({ cancellation_requested: true, cancellation_reason: cancelReason.trim() })
      .eq('id', orderId);

    if (error) {
      toast('Failed to request cancellation', 'error');
    } else {
      toast('Cancellation request submitted', 'success');
      setOrders(orders.map(o => o.id === orderId ? { ...o, cancellation_requested: true, cancellation_reason: cancelReason.trim() } : o));
      setCancelingId(null);
      setCancelReason('');
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-8 skeleton w-48 mb-6" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-32 skeleton mb-4 rounded-xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">No orders yet</h2>
        <p className="text-slate-500 mb-6">When you place an order, it will appear here.</p>
        <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
          Start Shopping <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Order History</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="card p-5">
            <Link to={`/account/orders/${order.order_number}`} className="block">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.cancellation_requested && (
                    <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Cancellation Requested
                    </span>
                  )}
                  <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {order.order_items?.slice(0, 3).map((item) => (
                  item.product_image && <img key={item.id} src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ))}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {order.order_items?.length ?? 0} item(s)
                  </p>
                  {order.estimated_delivery && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Est. delivery: {formatDate(order.estimated_delivery)}
                    </p>
                  )}
                </div>
                <span className="font-bold">{formatPrice(order.grand_total)}</span>
              </div>
            </Link>

            {/* Cancellation Request */}
            {CANCELLABLE_STATUSES.includes(order.status) && !order.cancellation_requested && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <AnimatePresence>
                  {cancelingId === order.id ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2"
                    >
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Reason for cancellation..."
                        className="input-field min-h-[60px] resize-y text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestCancellation(order.id)}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Submit Request
                        </button>
                        <button
                          onClick={() => { setCancelingId(null); setCancelReason(''); }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setCancelingId(order.id)}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Request Cancellation
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}

            {order.cancellation_requested && order.cancellation_reason && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                <UIMediaRenderer mediaKey="cancellation" size="md" className="mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  <span className="font-medium">Cancellation reason:</span> {order.cancellation_reason}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
