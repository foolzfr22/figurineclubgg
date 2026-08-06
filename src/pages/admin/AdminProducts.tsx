import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Copy, Eye, EyeOff, Star, X, Save,
  Search, Upload, Package, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Product, Category } from '@/types';
import { formatPrice, getEffectivePrice, slugify, downloadCSV } from '@/lib/utils';

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const blankForm = {
    name: '', description: '', price: '', discount_price: '', category_id: '',
    material: '', weight: '', height: '', edition: '', sku: '', stock: '',
    is_featured: false, is_best_seller: false, is_limited_edition: false,
    is_new_arrival: false, is_trending: false, is_hidden: false, is_preorder: false,
    production_time: '', tags: '',
  };
  const [form, setForm] = useState(blankForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, category:categories(*), product_images(*)').order('created_at', { ascending: false });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
      setCategories((cats as Category[]) ?? []);
      fetchProducts();
    })();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      discount_price: product.discount_price ? String(product.discount_price) : '',
      category_id: product.category_id ?? '',
      material: product.material ?? '',
      weight: product.weight ?? '',
      height: product.height ?? '',
      edition: product.edition ?? '',
      sku: product.sku ?? '',
      stock: String(product.stock),
      is_featured: product.is_featured,
      is_best_seller: product.is_best_seller,
      is_limited_edition: product.is_limited_edition,
      is_new_arrival: product.is_new_arrival,
      is_trending: product.is_trending,
      is_hidden: product.is_hidden,
      is_preorder: product.is_preorder,
      production_time: product.production_time ?? '',
      tags: product.tags.join(', '),
    });
    setImageUrls(product.product_images?.map((img) => img.image_url) ?? []);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(blankForm);
    setImageUrls([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const uploaded: string[] = [];
    for (const file of files) {
      const path = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
    }
    setImageUrls([...imageUrls, ...uploaded]);
    toast(`${uploaded.length} image(s) uploaded`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = slugify(form.name);
    const productData = {
      name: form.name,
      slug,
      description: form.description || null,
      price: parseFloat(form.price) || 0,
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      category_id: form.category_id || null,
      material: form.material || null,
      weight: form.weight || null,
      height: form.height || null,
      edition: form.edition || null,
      sku: form.sku || null,
      stock: parseInt(form.stock) || 0,
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
      is_limited_edition: form.is_limited_edition,
      is_new_arrival: form.is_new_arrival,
      is_trending: form.is_trending,
      is_hidden: form.is_hidden,
      is_preorder: form.is_preorder,
      production_time: form.production_time || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    if (editing) {
      const { error } = await supabase.from('products').update(productData).eq('id', editing.id);
      if (error) { toast('Failed to update product', 'error'); setSaving(false); return; }
      // Update images: delete old, insert new
      await supabase.from('product_images').delete().eq('product_id', editing.id);
      if (imageUrls.length) {
        await supabase.from('product_images').insert(imageUrls.map((url, i) => ({ product_id: editing.id, image_url: url, sort_order: i })));
      }
      toast('Product updated', 'success');
    } else {
      const { data: newProduct, error } = await supabase.from('products').insert(productData).select('id').single();
      if (error) { toast('Failed to create product', 'error'); setSaving(false); return; }
      if (imageUrls.length) {
        await supabase.from('product_images').insert(imageUrls.map((url, i) => ({ product_id: newProduct!.id, image_url: url, sort_order: i })));
      }
      toast('Product created', 'success');
    }
    resetForm();
    fetchProducts();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from('products').delete().eq('id', confirmDelete.id);
    toast('Product deleted', 'info');
    setConfirmDelete(null);
    fetchProducts();
  };

  const handleDuplicate = async (product: Product) => {
    const { name, description, price, discount_price, category_id, material, weight, height, edition, stock, tags } = product;
    const { error } = await supabase.from('products').insert({
      name: `${name} (Copy)`,
      slug: `${slugify(name)}-copy-${Date.now().toString(36)}`,
      description, price, discount_price, category_id, material, weight, height, edition,
      stock, tags, is_hidden: true,
    });
    if (error) toast('Failed to duplicate', 'error');
    else { toast('Product duplicated', 'success'); fetchProducts(); }
  };

  const toggleFlag = async (product: Product, flag: keyof Product) => {
    const updates = { [flag]: !product[flag as keyof Product] };
    await supabase.from('products').update(updates).eq('id', product.id);
    fetchProducts();
  };

  const handleExport = () => {
    downloadCSV('products.csv', products.map((p) => ({
      name: p.name, sku: p.sku, price: p.price, discount_price: p.discount_price,
      stock: p.stock, category: p.category?.name, rating: p.rating, review_count: p.review_count,
      is_featured: p.is_featured, is_best_seller: p.is_best_seller, is_hidden: p.is_hidden,
    })));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm">Export CSV</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="input-field pl-10 max-w-md" />
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium hidden sm:table-cell">Price</th>
                <th className="p-3 font-medium hidden md:table-cell">Stock</th>
                <th className="p-3 font-medium hidden lg:table-cell">Category</th>
                <th className="p-3 font-medium">Flags</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {product.product_images?.[0] ? (
                        <img src={product.product_images[0].image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><Package className="w-4 h-4 text-slate-400" /></div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku ?? 'No SKU'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">{formatPrice(getEffectivePrice(product.price, product.discount_price))}</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={product.stock < 5 ? 'text-red-600 font-medium' : ''}>{product.stock}</span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">{product.category?.name ?? 'N/A'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => toggleFlag(product, 'is_featured')} className={`w-6 h-6 rounded flex items-center justify-center ${product.is_featured ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'text-slate-300'}`} title="Featured"><Star className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleFlag(product, 'is_hidden')} className={`w-6 h-6 rounded flex items-center justify-center ${product.is_hidden ? 'bg-slate-200 text-slate-600 dark:bg-slate-700' : 'text-slate-300'}`} title="Hidden">{product.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(product)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicate(product)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Duplicate"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete(product)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-slate-500 py-8">No products found</p>}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editing ? 'Edit Product' : 'New Product'}</h2>
                <button onClick={resetForm}><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Product Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px] resize-y" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Price (Rs.)</label>
                    <input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Discount Price (Rs.)</label>
                    <input type="number" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Category</label>
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">SKU</label>
                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Stock</label>
                    <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Material</label>
                    <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Weight</label>
                    <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Height</label>
                    <input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Edition</label>
                    <input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Production Time</label>
                    <input value={form.production_time} onChange={(e) => setForm({ ...form, production_time: e.target.value })} placeholder="e.g. 2-3 weeks" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tags (comma-separated)</label>
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="anime, figure, limited" className="input-field" />
                </div>

                {/* Images */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Product Images</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Flags */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    ['is_featured', 'Featured'],
                    ['is_best_seller', 'Best Seller'],
                    ['is_limited_edition', 'Limited Edition'],
                    ['is_new_arrival', 'New Arrival'],
                    ['is_trending', 'Trending'],
                    ['is_preorder', 'Pre-order'],
                    ['is_hidden', 'Hidden'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 flex-1 justify-center">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Delete Product?</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete "{confirmDelete.name}"? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
