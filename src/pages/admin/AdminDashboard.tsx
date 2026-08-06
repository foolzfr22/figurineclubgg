import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Clock, CheckCircle, Users, Eye,
  Package, Star, TrendingUp, AlertTriangle, ArrowRight, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Stats {
  revenue: number;
  ordersToday: number;
  pendingOrders: number;
  completedOrders: number;
  customers: number;
  visitors: number;
  products: number;
  reviews: number;
  bestSeller?: { name: string; count: number };
  lowStock: { id: string; name: string; stock: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  weeklyOrders: { day: string; orders: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, products, reviews, profiles, lowStock] = await Promise.all([
        supabase.from('orders').select('grand_total, status, created_at'),
        supabase.from('products').select('id, name, stock, review_count, is_hidden'),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, stock').lt('stock', 5).limit(5),
      ]);

      const allOrders = (orders.data as { grand_total: number; status: string; created_at: string }[]) ?? [];
      const today = new Date().toISOString().split('T')[0];
      const ordersToday = allOrders.filter((o) => o.created_at.startsWith(today)).length;
      const revenue = allOrders.filter((o => o.status !== 'cancelled' && o.status !== 'refunded')).reduce((sum, o) => sum + Number(o.grand_total), 0);
      const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;
      const completedOrders = allOrders.filter((o) => o.status === 'delivered').length;

      const allProducts = (products.data as { id: string; name: string; stock: number; review_count: number; is_hidden: boolean }[]) ?? [];
      const bestSeller = allProducts.sort((a, b) => b.review_count - a.review_count)[0];

      // Visitors: count distinct customers who placed orders (real data, not seeded)
      const visitors = profiles.count ?? 0;

      // Monthly revenue (last 6 months)
      const monthlyMap = new Map<string, number>();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        months.push(key);
        monthlyMap.set(key, 0);
      }
      allOrders.forEach((o) => {
        if (o.status === 'cancelled' || o.status === 'refunded') return;
        const month = new Date(o.created_at).toLocaleString('default', { month: 'short' });
        if (monthlyMap.has(month)) {
          monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + Number(o.grand_total));
        }
      });
      const monthlyRevenue = months.map((m) => ({ month: m, revenue: monthlyMap.get(m) ?? 0 }));

      // Weekly orders (last 7 days)
      const weeklyMap = new Map<string, number>();
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleString('default', { weekday: 'short' });
        days.push(key);
        weeklyMap.set(key, 0);
      }
      allOrders.forEach((o) => {
        const day = new Date(o.created_at).toLocaleString('default', { weekday: 'short' });
        if (weeklyMap.has(day)) weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
      });
      const weeklyOrders = days.map((d) => ({ day: d, orders: weeklyMap.get(d) ?? 0 }));

      setStats({
        revenue,
        ordersToday,
        pendingOrders,
        completedOrders,
        customers: profiles.count ?? 0,
        visitors,
        products: allProducts.length,
        reviews: reviews.count ?? 0,
        bestSeller: bestSeller ? { name: bestSeller.name, count: bestSeller.review_count } : undefined,
        lowStock: (lowStock.data as { id: string; name: string; stock: number }[]) ?? [],
        monthlyRevenue,
        weeklyOrders,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="space-y-6">{[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}</div>;
  }

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats?.revenue ?? 0), icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { label: 'Orders Today', value: stats?.ordersToday ?? 0, icon: ShoppingCart, color: 'from-blue-500 to-cyan-500' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? 0, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Completed Orders', value: stats?.completedOrders ?? 0, icon: CheckCircle, color: 'from-green-500 to-teal-500' },
    { label: 'Customers', value: stats?.customers ?? 0, icon: Users, color: 'from-purple-500 to-pink-500' },
    { label: 'Total Visitors', value: stats?.visitors ?? 0, icon: Eye, color: 'from-indigo-500 to-blue-500' },
    { label: 'Products', value: stats?.products ?? 0, icon: Package, color: 'from-slate-500 to-slate-600' },
    { label: 'Reviews', value: stats?.reviews ?? 0, icon: Star, color: 'from-yellow-500 to-amber-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" /> Monthly Revenue
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats?.monthlyRevenue ?? []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(v) => formatPrice(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-500" /> Weekly Orders
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.weeklyOrders ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cancellation Requests */}
      <CancellationRequests />

      {/* Best Seller & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Best Selling Product
          </h2>
          {stats?.bestSeller ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <p className="font-medium">{stats.bestSeller.name}</p>
                <p className="text-sm text-slate-500">{stats.bestSeller.count} reviews</p>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">No data available</p>}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Low Stock Products
            </h2>
            <Link to="/admin/inventory" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.lowStock.length ? (
            <div className="space-y-2">
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">{p.stock} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">All products well stocked</p>}
        </div>
      </div>
    </div>
  );
}

function CancellationRequests() {
  const [requests, setRequests] = useState<Array<{ id: string; order_number: string; full_name: string; cancellation_reason: string | null; created_at: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, full_name, cancellation_reason, created_at, status')
        .eq('cancellation_requested', true)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      setRequests(data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (id: string) => {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
    setRequests(requests.filter((r) => r.id !== id));
  };

  const handleReject = async (id: string) => {
    await supabase.from('orders').update({ cancellation_requested: false, cancellation_reason: null }).eq('id', id);
    setRequests(requests.filter((r) => r.id !== id));
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="card p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-orange-500" /> Cancellation Requests ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div>
              <p className="font-medium text-sm">{req.order_number} - {req.full_name}</p>
              <p className="text-xs text-slate-500">{req.cancellation_reason ?? 'No reason provided'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">Approve Cancel</button>
              <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}