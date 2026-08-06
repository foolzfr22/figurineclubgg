import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Truck, MapPin, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus, OrderTimelineEntry } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES } from '@/types';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';

const FULFILLMENT_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'printing',
  'painting',
  'quality_check',
  'packaging',
  'ready_to_ship',
  'shipped',
  'delivered',
];

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const num = orderNumber.trim();
    if (!num) {
      setError('Please enter an order number.');
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('*, order_items(*), order_timeline(*)')
      .eq('order_number', num)
      .maybeSingle();
    setLoading(false);
    if (queryError) {
      setError('Something went wrong. Please try again.');
      setOrder(null);
      return;
    }
    if (!data) {
      setError(`No order found with number "${num}". Please check and try again.`);
      setOrder(null);
      return;
    }
    setOrder(data as Order);
  };

  const isCancelled = order?.status === 'cancelled' || order?.status === 'refunded';

  const currentIndex = order ? FULFILLMENT_FLOW.indexOf(order.status) : -1;

  const timelineMap = new Map<string, OrderTimelineEntry>();
  order?.order_timeline?.forEach((entry) => {
    if (!timelineMap.has(entry.status)) timelineMap.set(entry.status, entry);
  });

  return (
    <div className="section-padding py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gradient">Track Your Order</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your order number to see the latest status and estimated delivery.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. FC1A2B3C4"
              className="input-field pl-12"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            Track
          </button>
        </form>

        {/* Error */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card p-6 text-center mb-8 border-red-200 dark:border-red-900/40"
          >
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="card p-6 space-y-4">
            <div className="h-6 skeleton w-1/3" />
            <div className="h-4 skeleton w-1/2" />
            <div className="h-32 skeleton rounded-xl" />
          </div>
        )}

        {/* Order found */}
        {order && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Order header */}
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Order Number</p>
                  <p className="text-xl font-bold">{order.order_number}</p>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Placed:</span>
                  <span className="font-medium">{formatDateTime(order.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Est. Delivery:</span>
                  <span className="font-medium">{order.estimated_delivery ? formatDate(order.estimated_delivery) : 'TBD'}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {!isCancelled ? (
              <div className="card p-6">
                <h2 className="font-semibold mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  Order Progress
                </h2>
                <div className="relative">
                  {FULFILLMENT_FLOW.map((status, i) => {
                    const isComplete = currentIndex > i;
                    const isCurrent = currentIndex === i;
                    const entry = timelineMap.get(status);
                    return (
                      <div key={status} className="flex gap-4 pb-8 last:pb-0 relative">
                        {/* Connector line */}
                        {i < FULFILLMENT_FLOW.length - 1 && (
                          <div
                            className={`absolute left-5 top-10 bottom-0 w-0.5 ${
                              isComplete ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        )}
                        {/* Dot */}
                        <div
                          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isComplete
                              ? 'bg-primary-600 text-white'
                              : isCurrent
                              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 ring-4 ring-primary-100 dark:ring-primary-900/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-current" />
                          )}
                        </div>
                        {/* Label */}
                        <div className="pt-1.5">
                          <p className={`font-medium ${isComplete || isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                            {ORDER_STATUS_LABELS[status]}
                          </p>
                          {entry && (
                            <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(entry.created_at)}</p>
                          )}
                          {isCurrent && !entry && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">In progress</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="card p-6 border-red-200 dark:border-red-900/40">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h2 className="font-semibold text-red-600 dark:text-red-400">{ORDER_STATUS_LABELS[order.status]}</h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This order was {order.status === 'cancelled' ? 'cancelled' : 'refunded'}. If you have questions, please contact support.
                </p>
                {order.order_timeline && order.order_timeline.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {order.order_timeline.map((entry) => (
                      <div key={entry.id} className="text-sm flex gap-3">
                        <span className="text-slate-400">{formatDateTime(entry.created_at)}</span>
                        <span className="font-medium">{ORDER_STATUS_LABELS[entry.status as OrderStatus] ?? entry.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Items</h2>
              <div className="space-y-3">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(order.grand_total)}</span>
              </div>
            </div>

            {/* Shipping address */}
            <div className="card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Shipping Address
              </h2>
              <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                <p className="font-medium text-slate-900 dark:text-slate-100">{order.full_name}</p>
                <p>{order.address}</p>
                <p>{order.city}, {order.state} - {order.pin_code}</p>
                {order.landmark && <p>Landmark: {order.landmark}</p>}
                <p>Phone: {order.phone}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty initial state */}
        {!searched && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full glass flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-slate-500">Enter your order number above to track your shipment.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
