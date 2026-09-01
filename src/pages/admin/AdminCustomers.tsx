import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Users, X, Mail, Phone, ShoppingBag, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Order, Profile } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice, formatDate, formatDateTime, downloadCSV, cn } from '@/lib/utils';

interface CustomerWithStats extends Profile {
  order_count: number;
  total_spent: number;
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchCustomers = async () => {
    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, user_id, grand_total, status'),
    ]);
    const profiles = (profilesRes.data as Profile[]) ?? [];
    const orders = (ordersRes.data as { id: string; user_id: string | null; grand_total: number; status: string }[]) ?? [];

    const statsMap = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      if (!o.user_id) continue;
      const cur = statsMap.get(o.user_id) ?? { count: 0, total: 0 };
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        cur.total += Number(o.grand_total);
      }
      cur.count += 1;
      statsMap.set(o.user_id, cur);
    }

    const enriched = profiles.map((p) => ({
      ...p,
      order_count: statsMap.get(p.id)?.count ?? 0,
      total_spent: statsMap.get(p.id)?.total ?? 0,
    }));

    setCustomers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.full_name ?? '').toLowerCase().includes(q) ||
        (c.id).toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Guest orders by email/phone
  const handleSelect = async (customer: CustomerWithStats) => {
    setSelected(customer);
    setOrdersLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false });
    setCustomerOrders((data as Order[]) ?? []);
    setOrdersLoading(false);
  };

  const handleExport = () => {
    downloadCSV(
      'customers.csv',
      customers.map((c) => ({
        name: c.full_name ?? '',
        email: c.id,
        phone: c.phone ?? '',
        orders: c.order_count,
        total_spent: c.total_spent,
        joined: formatDate(c.created_at),
      }))
    );
    toast('Customers exported', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Customers</h1>
        <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="input-field pl-10"
        />
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
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No customers found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium hidden sm:table-cell">Email</th>
                <th className="p-3 font-medium hidden md:table-cell">Phone</th>
                <th className="p-3 font-medium text-center">Orders</th>
                <th className="p-3 font-medium">Total Spent</th>
                <th className="p-3 font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(customer.full_name ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{customer.full_name ?? 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-slate-500">{customer.id}</td>
                  <td className="p-3 hidden md:table-cell text-slate-500">{customer.phone ?? '—'}</td>
                  <td className="p-3 text-center font-medium">{customer.order_count}</td>
                  <td className="p-3 font-semibold">{formatPrice(customer.total_spent)}</td>
                  <td className="p-3 hidden lg:table-cell text-slate-500 text-xs">{formatDate(customer.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-lg font-bold">
                    {(selected.full_name ?? '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selected.full_name ?? 'Unknown'}</h2>
                    <p className="text-sm text-slate-500">Customer since {formatDate(selected.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="card p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Email</p>
                  <p className="flex items-center gap-2 text-sm font-medium break-all">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />{selected.id}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />{selected.phone ?? '—'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="card p-4 text-center">
                  <ShoppingBag className="w-5 h-5 mx-auto text-primary-500 mb-1" />
                  <p className="text-2xl font-bold">{selected.order_count}</p>
                  <p className="text-xs text-slate-500">Total Orders</p>
                </div>
                <div className="card p-4 text-center">
                  <Calendar className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold">{formatPrice(selected.total_spent)}</p>
                  <p className="text-xs text-slate-500">Total Spent</p>
                </div>
              </div>

              {/* Orders */}
              <div>
                <h3 className="font-bold mb-3">Order History</h3>
                {ordersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 skeleton rounded-xl" />
                    ))}
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="card p-3 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs font-medium">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{formatPrice(order.grand_total)}</span>
                          <span className={cn('badge text-xs', ORDER_STATUS_COLORS[order.status])}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
