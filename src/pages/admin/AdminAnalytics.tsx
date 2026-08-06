import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Clock, CheckCircle, XCircle, RotateCcw,
  TrendingUp, AlertTriangle, Star, Mail, Package, Users, Award,
  Heart, Eye, BarChart3, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

interface AnalyticsData {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  bestSellingProduct: { name: string; count: number } | null;
  topCategory: { name: string; count: number } | null;
  returningCustomers: number;
  newCustomers: number;
  lowStock: { id: string; name: string; stock: number }[];
  outOfStock: { id: string; name: string }[];
  cancellationRate: number;
  refundRate: number;
  newsletterSubscribers: number;
  totalReviews: number;
  avgRating: number;
  topRatedProducts: { id: string; name: string; rating: number }[];
  mostViewedProducts: { id: string; name: string; views: number }[];
  mostWishlistedProducts: { id: string; name: string; count: number }[];
  localSalesRevenue: number;
  monthlyData: { month: string; revenue: number; orders: number }[];
  dailyData: { day: string; revenue: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, orderItems, products, reviews, profiles, localSales, newsletter, lowStock, outOfStock, categories] = await Promise.all([
        supabase.from('orders').select('id, grand_total, status, created_at, user_id, email'),
        supabase.from('order_items').select('product_id, product_name, quantity, price'),
        supabase.from('products').select('id, name, stock, rating, review_count, category_id, category:categories(name)'),
        supabase.from('reviews').select('rating, product_id'),
        supabase.from('profiles').select('id, created_at'),
        supabase.from('local_sales').select('total, created_at'),
        supabase.from('newsletter').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, stock').lt('stock', 5).gt('stock', 0).limit(10),
        supabase.from('products').select('id, name').eq('stock', 0).limit(10),
        supabase.from('categories').select('id, name'),
      ]);

      const allOrders = (orders.data as { id: string; grand_total: number; status: string; created_at: string; user_id: string | null; email: string }[]) ?? [];
      const allItems = (orderItems.data as { product_id: string; product_name: string; quantity: number; price: number }[]) ?? [];
      const allProducts = (products.data as { id: string; name: string; stock: number; rating: number; review_count: number; category_id: string; category: { name: string } | null }[]) ?? [];
      const allReviews = (reviews.data as { rating: number; product_id: string }[]) ?? [];
      const allProfiles = (profiles.data as { id: string; created_at: string }[]) ?? [];
      const allLocalSales = (localSales.data as { total: number; created_at: string }[]) ?? [];
      const allCategories = (categories.data as { id: string; name: string }[]) ?? [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const validOrders = allOrders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
      const todayRevenue = validOrders.filter((o) => o.created_at >= todayStart).reduce((s, o) => s + Number(o.grand_total), 0);
      const weeklyRevenue = validOrders.filter((o) => o.created_at >= weekStart).reduce((s, o) => s + Number(o.grand_total), 0);
      const monthlyRevenue = validOrders.filter((o) => o.created_at >= monthStart).reduce((s, o) => s + Number(o.grand_total), 0);
      const localSalesRevenue = allLocalSales.reduce((s, ls) => s + Number(ls.total), 0);

      const ordersToday = allOrders.filter((o) => o.created_at >= todayStart).length;
      const ordersThisWeek = allOrders.filter((o) => o.created_at >= weekStart).length;
      const ordersThisMonth = allOrders.filter((o) => o.created_at >= monthStart).length;

      const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;
      const confirmedOrders = allOrders.filter((o) => o.status === 'confirmed' || o.status === 'payment_verified').length;
      const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length;
      const refundedOrders = allOrders.filter((o) => o.status === 'refunded').length;
      const completedOrders = allOrders.filter((o) => o.status === 'delivered').length;

      const totalRevenue = validOrders.reduce((s, o) => s + Number(o.grand_total), 0);
      const avgOrderValue = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

      // Best selling product
      const productSales = new Map<string, { name: string; count: number }>();
      allItems.forEach((item) => {
        const existing = productSales.get(item.product_id) ?? { name: item.product_name, count: 0 };
        existing.count += item.quantity;
        productSales.set(item.product_id, existing);
      });
      const bestSellingProduct = [...productSales.entries()].sort((a, b) => b[1].count - a[1].count)[0]?.[1] ?? null;

      // Top category
      const categorySales = new Map<string, { name: string; count: number }>();
      allItems.forEach((item) => {
        const product = allProducts.find((p) => p.id === item.product_id);
        const catName = product?.category?.name ?? 'Uncategorized';
        const existing = categorySales.get(catName) ?? { name: catName, count: 0 };
        existing.count += item.quantity;
        categorySales.set(catName, existing);
      });
      const topCategory = [...categorySales.entries()].sort((a, b) => b[1].count - a[1].count)[0]?.[1] ?? null;

      // Returning vs new customers
      const customerOrderCounts = new Map<string, number>();
      allOrders.forEach((o) => {
        const key = o.user_id ?? o.email;
        customerOrderCounts.set(key, (customerOrderCounts.get(key) ?? 0) + 1);
      });
      const returningCustomers = [...customerOrderCounts.values()].filter((c) => c > 1).length;
      const newCustomers = [...customerOrderCounts.values()].filter((c) => c === 1).length;

      const cancellationRate = allOrders.length > 0 ? (cancelledOrders / allOrders.length) * 100 : 0;
      const refundRate = allOrders.length > 0 ? (refundedOrders / allOrders.length) * 100 : 0;

      const totalReviews = allReviews.length;
      const avgRating = totalReviews > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;

      // Top rated products
      const topRatedProducts = [...allProducts]
        .filter((p) => p.review_count > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map((p) => ({ id: p.id, name: p.name, rating: p.rating }));

      // Most wishlisted - fetch wishlist counts
      const { data: wishlistData } = await supabase.from('wishlist').select('product_id');
      const wishlistCounts = new Map<string, number>();
      (wishlistData ?? []).forEach((w: { product_id: string }) => {
        wishlistCounts.set(w.product_id, (wishlistCounts.get(w.product_id) ?? 0) + 1);
      });
      const mostWishlistedProducts = [...wishlistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({ id, name: allProducts.find((p) => p.id === id)?.name ?? 'Unknown', count }));

      // Most viewed (using recently_viewed as proxy)
      const { data: viewedData } = await supabase.from('recently_viewed').select('product_id');
      const viewCounts = new Map<string, number>();
      (viewedData ?? []).forEach((v: { product_id: string }) => {
        viewCounts.set(v.product_id, (viewCounts.get(v.product_id) ?? 0) + 1);
      });
      const mostViewedProducts = [...viewCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, views]) => ({ id, name: allProducts.find((p) => p.id === id)?.name ?? 'Unknown', views }));

      // Monthly data (last 6 months)
      const monthlyMap = new Map<string, { revenue: number; orders: number }>();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        months.push(key);
        monthlyMap.set(key, { revenue: 0, orders: 0 });
      }
      allOrders.forEach((o) => {
        if (o.status === 'cancelled' || o.status === 'refunded') return;
        const month = new Date(o.created_at).toLocaleString('default', { month: 'short' });
        if (monthlyMap.has(month)) {
          const entry = monthlyMap.get(month)!;
          entry.revenue += Number(o.grand_total);
          entry.orders += 1;
        }
      });
      const monthlyData = months.map((m) => ({ month: m, ...monthlyMap.get(m)! }));

      // Daily data (last 7 days)
      const dailyMap = new Map<string, number>();
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleString('default', { weekday: 'short' });
        days.push(key);
        dailyMap.set(key, 0);
      }
      validOrders.forEach((o) => {
        const day = new Date(o.created_at).toLocaleString('default', { weekday: 'short' });
        if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(o.grand_total));
      });
      const dailyData = days.map((d) => ({ day: d, revenue: dailyMap.get(d) ?? 0 }));

      // Status breakdown for pie chart
      const statusCounts = new Map<string, number>();
      allOrders.forEach((o) => {
        statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
      });
      const statusColors: Record<string, string> = {
        pending: '#f59e0b', confirmed: '#3b82f6', payment_verified: '#10b981',
        printing: '#6366f1', painting: '#a855f7', quality_check: '#06b6d4',
        packaging: '#14b8a6', ready_to_ship: '#f97316', shipped: '#0ea5e9',
        delivered: '#22c55e', cancelled: '#ef4444', refunded: '#f43f5e',
      };
      const statusBreakdown = [...statusCounts.entries()].map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count,
        color: statusColors[status] ?? '#94a3b8',
      }));

      setData({
        todayRevenue, weeklyRevenue, monthlyRevenue,
        ordersToday, ordersThisWeek, ordersThisMonth,
        pendingOrders, confirmedOrders, cancelledOrders, refundedOrders, completedOrders,
        avgOrderValue, bestSellingProduct, topCategory,
        returningCustomers, newCustomers,
        lowStock: (lowStock.data as { id: string; name: string; stock: number }[]) ?? [],
        outOfStock: (outOfStock.data as { id: string; name: string }[]) ?? [],
        cancellationRate, refundRate,
        newsletterSubscribers: newsletter.count ?? 0,
        totalReviews, avgRating,
        topRatedProducts, mostViewedProducts, mostWishlistedProducts,
        localSalesRevenue,
        monthlyData, dailyData, statusBreakdown,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="space-y-6">{[...Array(6)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}</div>;
  }

  const revenueCards = [
    { label: "Today's Revenue", value: formatPrice(data?.todayRevenue ?? 0), icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { label: 'Weekly Revenue', value: formatPrice(data?.weeklyRevenue ?? 0), icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
    { label: 'Monthly Revenue', value: formatPrice(data?.monthlyRevenue ?? 0), icon: Calendar, color: 'from-indigo-500 to-purple-500' },
    { label: 'Local Sales Revenue', value: formatPrice(data?.localSalesRevenue ?? 0), icon: Package, color: 'from-orange-500 to-red-500' },
    { label: 'Avg Order Value', value: formatPrice(data?.avgOrderValue ?? 0), icon: BarChart3, color: 'from-teal-500 to-green-500' },
    { label: 'Newsletter Subscribers', value: data?.newsletterSubscribers ?? 0, icon: Mail, color: 'from-pink-500 to-rose-500' },
  ];

  const orderCards = [
    { label: 'Orders Today', value: data?.ordersToday ?? 0, icon: ShoppingCart, color: 'from-blue-500 to-cyan-500' },
    { label: 'This Week', value: data?.ordersThisWeek ?? 0, icon: Calendar, color: 'from-indigo-500 to-blue-500' },
    { label: 'This Month', value: data?.ordersThisMonth ?? 0, icon: Calendar, color: 'from-purple-500 to-indigo-500' },
    { label: 'Pending', value: data?.pendingOrders ?? 0, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Confirmed', value: data?.confirmedOrders ?? 0, icon: CheckCircle, color: 'from-green-500 to-teal-500' },
    { label: 'Completed', value: data?.completedOrders ?? 0, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { label: 'Cancelled', value: data?.cancelledOrders ?? 0, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Refunded', value: data?.refundedOrders ?? 0, icon: RotateCcw, color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Business Analytics</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {revenueCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Order Cards */}
      <h2 className="text-lg font-bold mb-4">Order Statistics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {orderCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" /> Monthly Revenue & Orders
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.monthlyData ?? []}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(v, name) => name === 'revenue' ? formatPrice(Number(v)) : v} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" /> Daily Revenue (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.dailyData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(v) => formatPrice(Number(v))} />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Breakdown Pie */}
      {data?.statusBreakdown && data.statusBreakdown.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" /> Order Status Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {data.statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Best Seller
          </h2>
          {data?.bestSellingProduct ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">{data.bestSellingProduct.name}</p>
                <p className="text-xs text-slate-500">{data.bestSellingProduct.count} units sold</p>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Top Category
          </h2>
          {data?.topCategory ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">{data.topCategory.name}</p>
                <p className="text-xs text-slate-500">{data.topCategory.count} units sold</p>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Review Stats
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Reviews</span>
              <span className="font-medium">{data?.totalReviews ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Avg Rating</span>
              <span className="font-medium flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {(data?.avgRating ?? 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{(data?.returningCustomers ?? 0) + (data?.newCustomers ?? 0)}</p>
          <p className="text-xs text-slate-500">Total Customers</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{data?.returningCustomers ?? 0}</p>
          <p className="text-xs text-slate-500">Returning Customers</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{data?.newCustomers ?? 0}</p>
          <p className="text-xs text-slate-500">New Customers</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{(data?.cancellationRate ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Cancellation Rate</p>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Rated */}
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Top Rated Products
          </h2>
          {data?.topRatedProducts.length ? (
            <div className="space-y-2">
              {data.topRatedProducts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="text-sm font-medium">{i + 1}. {p.name}</span>
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        {/* Most Wishlisted */}
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> Most Wishlisted
          </h2>
          {data?.mostWishlistedProducts.length ? (
            <div className="space-y-2">
              {data.mostWishlistedProducts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="text-sm font-medium">{i + 1}. {p.name}</span>
                  <span className="text-sm text-slate-500">{p.count} wishes</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        {/* Most Viewed */}
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> Most Viewed Products
          </h2>
          {data?.mostViewedProducts.length ? (
            <div className="space-y-2">
              {data.mostViewedProducts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="text-sm font-medium">{i + 1}. {p.name}</span>
                  <span className="text-sm text-slate-500">{p.views} views</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        {/* Low Stock + Out of Stock */}
        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Stock Alerts
          </h2>
          <div className="space-y-2">
            {data?.outOfStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs">Out of stock</span>
              </div>
            ))}
            {data?.lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-xs">{p.stock} left</span>
              </div>
            ))}
            {(!data?.lowStock.length && !data?.outOfStock.length) && <p className="text-slate-500 text-sm">All products well stocked</p>}
          </div>
        </div>
      </div>

      {/* Refund Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-2xl font-bold">{(data?.cancellationRate ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Cancellation Rate</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-bold">{(data?.refundRate ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Refund Rate</p>
        </div>
      </div>
    </div>
  );
}
