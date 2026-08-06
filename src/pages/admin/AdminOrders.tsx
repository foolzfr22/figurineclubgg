import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, X, ShoppingBag, Phone, Mail, MapPin, Gift,
  Palette, Clock, ChevronDown, Package, StickyNote, MessageCircle,
  Trash2, Archive, RotateCcw, StickyNote as NoteIcon, Save,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, OrderStatus } from '@/types';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice, formatDateTime, downloadCSV, cn } from '@/lib/utils';

export default function AdminOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [internalNote, setInternalNote] = useState('');

  const fetchOrders = async () => {
    let query = supabase.from('orders').select('*, order_items(*), order_timeline(*)').order('created_at', { ascending: false });
    if (!showArchived) {
      query = query.eq('is_archived', false);
    }
    const { data } = await query;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [showArchived]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.full_name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.whatsapp_number.includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) {
      toast('Failed to update status', 'error');
    } else {
      toast(`Order marked as ${ORDER_STATUS_LABELS[status]}`, 'success');
      // Add timeline entry
      await supabase.from('order_timeline').insert({
        order_id: order.id,
        status: ORDER_STATUS_LABELS[status],
        admin_email: user?.email ?? null,
      });
      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_email: user?.email ?? 'admin',
        action: `Updated order ${order.order_number} status to ${ORDER_STATUS_LABELS[status]}`,
        entity_type: 'order',
        entity_id: order.id,
      });
      const { data: timeline } = await supabase
        .from('order_timeline')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status, order_timeline: (timeline as Order['order_timeline']) ?? o.order_timeline } : o
        )
      );
      setSelected((prev) =>
        prev?.id === order.id ? { ...prev, status, order_timeline: (timeline as Order['order_timeline']) ?? prev.order_timeline } : prev
      );
    }
    setUpdating(false);
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(`Permanently delete order ${order.order_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      toast('Failed to delete order', 'error');
    } else {
      toast('Order deleted permanently', 'info');
      await supabase.from('admin_activity_log').insert({
        admin_email: user?.email ?? 'admin',
        action: `Deleted order ${order.order_number}`,
        entity_type: 'order',
        entity_id: order.id,
      });
      setSelected(null);
      fetchOrders();
    }
  };

  const handleArchive = async (order: Order) => {
    const { error } = await supabase.from('orders').update({ is_archived: !order.is_archived }).eq('id', order.id);
    if (error) {
      toast('Failed to archive order', 'error');
    } else {
      toast(order.is_archived ? 'Order restored' : 'Order archived', 'success');
      await supabase.from('admin_activity_log').insert({
        admin_email: user?.email ?? 'admin',
        action: `${order.is_archived ? 'Restored' : 'Archived'} order ${order.order_number}`,
        entity_type: 'order',
        entity_id: order.id,
      });
      setSelected(null);
      fetchOrders();
    }
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    const { error } = await supabase.from('orders').update({ internal_notes: internalNote }).eq('id', selected.id);
    if (error) {
      toast('Failed to save note', 'error');
    } else {
      toast('Internal note saved', 'success');
      setSelected({ ...selected, internal_notes: internalNote });
      fetchOrders();
    }
  };

  const handleExport = () => {
    downloadCSV(
      'orders.csv',
      filtered.map((o) => ({
        order_number: o.order_number,
        customer: o.full_name,
        phone: o.phone,
        whatsapp: o.whatsapp_number,
        email: o.email,
        total: o.grand_total,
        status: ORDER_STATUS_LABELS[o.status],
        archived: o.is_archived ? 'Yes' : 'No',
        date: formatDateTime(o.created_at),
      }))
    );
    toast('Orders exported', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn('btn-secondary inline-flex items-center gap-2 text-sm', showArchived && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400')}
          >
            <Archive className="w-4 h-4" /> {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, email, phone, notes..."
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="input-field appearance-none pr-10"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">{showArchived ? 'No archived orders' : 'No orders found'}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium hidden md:table-cell">Contact</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => { setSelected(order); setInternalNote(order.internal_notes ?? ''); }}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                    order.is_archived && 'opacity-60'
                  )}
                >
                  <td className="p-3 font-mono text-xs">{order.order_number}</td>
                  <td className="p-3 font-medium">{order.full_name}</td>
                  <td className="p-3 hidden md:table-cell text-slate-500">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.phone}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{order.whatsapp_number}</span>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">{formatPrice(order.grand_total)}</td>
                  <td className="p-3">
                    <span className={cn('badge', ORDER_STATUS_COLORS[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-slate-500 text-xs">
                    {formatDateTime(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex justify-end"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-lg h-full overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selected.order_number}</h2>
                  <p className="text-sm text-slate-500">{formatDateTime(selected.created_at)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => handleArchive(selected)}
                  className="btn-secondary text-xs inline-flex items-center gap-1"
                >
                  {selected.is_archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  {selected.is_archived ? 'Restore' : 'Archive'}
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  className="text-xs inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {/* Status changer */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-1.5 block">Order Status</label>
                <div className="relative">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected, e.target.value as OrderStatus)}
                    disabled={updating}
                    className="input-field appearance-none pr-10"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Customer info */}
              <div className="card p-4 mb-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">Customer</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-base">{selected.full_name}</p>
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{selected.email}</p>
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{selected.phone}</p>
                  <p className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" />{selected.whatsapp_number}</p>
                </div>
              </div>

              {/* Address */}
              <div className="card p-4 mb-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">Shipping Address</h3>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{selected.address}</p>
                    <p>{selected.city}, {selected.state} - {selected.pin_code}</p>
                    {selected.landmark && <p className="text-slate-500">Landmark: {selected.landmark}</p>}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="card p-4 mb-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">Items ({selected.order_items?.length ?? 0})</h3>
                <div className="space-y-3">
                  {selected.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                      </div>
                      <p className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 mt-4 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatPrice(selected.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{formatPrice(selected.shipping)}</span></div>
                  {selected.discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount{selected.coupon_code ? ` (${selected.coupon_code})` : ''}</span><span>-{formatPrice(selected.discount)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>{formatPrice(selected.grand_total)}</span></div>
                </div>
              </div>

              {/* Internal Notes (admin only) */}
              <div className="card p-4 mb-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  <NoteIcon className="w-4 h-4" /> Internal Notes (Admin Only)
                </h3>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add internal notes here. These are never visible to customers."
                  className="input-field min-h-[80px] resize-y text-sm"
                />
                <button onClick={handleSaveNote} className="btn-primary text-sm mt-2 inline-flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Note
                </button>
              </div>

              {/* Extras */}
              {(selected.gift_wrap || selected.custom_paint_request || selected.notes) && (
                <div className="card p-4 mb-4 space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-500">Extras</h3>
                  {selected.gift_wrap && (
                    <div className="flex items-center gap-2 text-sm">
                      <Gift className="w-4 h-4 text-primary-500" /> Gift wrap requested
                    </div>
                  )}
                  {selected.custom_paint_request && (
                    <div className="flex items-start gap-2 text-sm">
                      <Palette className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Custom paint request</p>
                        <p className="text-slate-500">{selected.custom_paint_request}</p>
                      </div>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Customer Notes</p>
                        <p className="text-slate-500">{selected.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              {selected.order_timeline && selected.order_timeline.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-slate-500">Timeline</h3>
                  <div className="space-y-4">
                    {[...selected.order_timeline].reverse().map((entry) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          {entry !== selected.order_timeline![selected.order_timeline!.length - 1] && (
                            <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="font-medium text-sm">{entry.status}</p>
                          {entry.note && <p className="text-sm text-slate-500">{entry.note}</p>}
                          {entry.admin_email && <p className="text-xs text-primary-500 mt-0.5">by {entry.admin_email}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
