import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Trash2, Download, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice, formatDateTime, downloadCSV } from '@/lib/utils';
import type { LocalSale, Product } from '@/types';

export default function AdminLocalSales() {
  const { toast } = useToast();
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    quantity: 1,
    selling_price: '',
    customer_name: '',
    notes: '',
  });

  const fetchSales = async () => {
    const { data } = await supabase.from('local_sales').select('*').order('created_at', { ascending: false });
    setSales((data as LocalSale[]) ?? []);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_hidden', false).order('name');
    setProducts((data as Product[]) ?? []);
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const selectedProduct = useMemo(() => products.find((p) => p.id === form.product_id), [products, form.product_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !selectedProduct) {
      toast('Please select a product', 'error');
      return;
    }
    const price = parseFloat(form.selling_price) || selectedProduct.price;
    const total = price * form.quantity;

    const { error } = await supabase.from('local_sales').insert({
      product_id: form.product_id,
      product_name: selectedProduct.name,
      quantity: form.quantity,
      selling_price: price,
      customer_name: form.customer_name || null,
      notes: form.notes || null,
      total,
    });

    if (error) {
      toast('Failed to record sale', 'error');
      return;
    }

    // Decrease inventory
    const newStock = Math.max(0, selectedProduct.stock - form.quantity);
    await supabase.from('products').update({ stock: newStock }).eq('id', selectedProduct.id);

    // Log inventory history
    await supabase.from('inventory_history').insert({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      old_stock: selectedProduct.stock,
      new_stock: newStock,
      change_amount: -form.quantity,
      reason: 'Local Sale',
    });

    toast('Local sale recorded and inventory updated', 'success');
    setForm({ product_id: '', quantity: 1, selling_price: '', customer_name: '', notes: '' });
    setShowForm(false);
    fetchSales();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('local_sales').delete().eq('id', id);
    if (error) {
      toast('Failed to delete', 'error');
    } else {
      toast('Sale deleted', 'info');
      fetchSales();
    }
  };

  const handleExport = () => {
    downloadCSV('local_sales.csv', sales.map((s) => ({
      product: s.product_name,
      quantity: s.quantity,
      price: s.selling_price,
      total: s.total,
      customer: s.customer_name ?? '',
      notes: s.notes ?? '',
      date: formatDateTime(s.created_at),
    })));
    toast('Exported', 'success');
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Store className="w-7 h-7 text-primary-500" /> Local Sales
          </h1>
          <p className="text-sm text-slate-500 mt-1">Record offline sales made locally</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Record Sale
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-slate-500">Total Local Revenue</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
            <Store className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{sales.length}</p>
          <p className="text-xs text-slate-500">Total Local Sales</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{sales.length > 0 ? formatPrice(totalRevenue / sales.length) : 'Rs. 0'}</p>
          <p className="text-xs text-slate-500">Average Sale Value</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="card p-6 mb-6 space-y-4 overflow-hidden"
        >
          <h2 className="font-bold">Record New Local Sale</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Product</label>
              <select
                value={form.product_id}
                onChange={(e) => {
                  const prod = products.find((p) => p.id === e.target.value);
                  setForm({ ...form, product_id: e.target.value, selling_price: prod ? String(prod.price) : '' });
                }}
                className="input-field"
                required
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.name} ({p.stock} in stock)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quantity</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Selling Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                className="input-field"
                placeholder="Leave blank to use product price"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Customer Name (optional)</label>
              <input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field min-h-[60px] resize-y text-sm"
              />
            </div>
          </div>
          {selectedProduct && (
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-sm">
              <span className="text-slate-500">Total: </span>
              <span className="font-bold">{formatPrice((parseFloat(form.selling_price) || selectedProduct.price) * form.quantity)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Save Sale</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : sales.length === 0 ? (
        <div className="card p-12 text-center">
          <Store className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No local sales recorded yet</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Qty</th>
                <th className="p-3 font-medium hidden sm:table-cell">Price</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium hidden md:table-cell">Customer</th>
                <th className="p-3 font-medium hidden lg:table-cell">Date</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="p-3 font-medium">{sale.product_name}</td>
                  <td className="p-3">{sale.quantity}</td>
                  <td className="p-3 hidden sm:table-cell">{formatPrice(sale.selling_price)}</td>
                  <td className="p-3 font-semibold">{formatPrice(sale.total)}</td>
                  <td className="p-3 hidden md:table-cell text-slate-500">{sale.customer_name ?? '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-slate-500 text-xs">{formatDateTime(sale.created_at)}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(sale.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
