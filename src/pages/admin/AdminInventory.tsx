import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, AlertTriangle, Package, Save, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types';
import { downloadCSV, cn } from '@/lib/utils';

export default function AdminInventory() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('stock', { ascending: true });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter((p) => p.stock < 5);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditValue(String(product.stock));
  };

  const saveEdit = async (product: Product) => {
    const newStock = parseInt(editValue);
    if (isNaN(newStock) || newStock < 0) {
      toast('Please enter a valid number', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
    if (error) {
      toast('Failed to update stock', 'error');
    } else {
      toast('Stock updated', 'success');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p)));
    }
    setEditingId(null);
    setSaving(false);
  };

  const handleExport = () => {
    downloadCSV(
      'inventory.csv',
      products.map((p) => ({
        name: p.name,
        sku: p.sku ?? '',
        stock: p.stock,
        status: p.stock === 0 ? 'Out of stock' : p.stock < 5 ? 'Low stock' : 'In stock',
        category: p.category?.name ?? '',
        price: p.price,
      }))
    );
    toast('Inventory exported', 'success');
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock < 5) return { label: 'Low Stock', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
        <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 border-l-4 border-amber-500"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {lowStock.length} product{lowStock.length > 1 ? 's' : ''} with low stock
              </p>
              <p className="text-xs text-slate-500">Items with less than 5 units in stock need attention.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
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
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No products found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium hidden sm:table-cell">SKU</th>
                <th className="p-3 font-medium hidden md:table-cell">Category</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const status = getStockStatus(product.stock);
                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.product_images?.[0] ? (
                          <img src={product.product_images[0].image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-slate-500 font-mono text-xs">{product.sku ?? '—'}</td>
                    <td className="p-3 hidden md:table-cell text-slate-500">{product.category?.name ?? '—'}</td>
                    <td className="p-3">
                      {editingId === product.id ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(product);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="input-field !py-1.5 w-20 text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(product)}
                          className={cn(
                            'font-semibold hover:underline',
                            product.stock < 5 && 'text-red-600'
                          )}
                        >
                          {product.stock}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={cn('badge', status.className)}>{status.label}</span>
                    </td>
                    <td className="p-3 text-right">
                      {editingId === product.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(product)}
                            disabled={saving}
                            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product)}
                          className="btn-ghost text-xs !py-1.5 !px-3"
                        >
                          Edit Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
