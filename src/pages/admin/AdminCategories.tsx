import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Save, Tags, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Category } from '@/types';
import { slugify } from '@/lib/utils';

interface CategoryWithCount extends Category {
  product_count: number;
}

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryWithCount | null>(null);
  const [saving, setSaving] = useState(false);

  const blankForm = { name: '', slug: '', description: '', sort_order: '0' };
  const [form, setForm] = useState(blankForm);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*, products(count)')
      .order('sort_order', { ascending: true });
    const mapped = ((data as unknown as (Category & { products: { count: number }[] })[]) ?? []).map((c) => ({
      ...c,
      product_count: c.products?.[0]?.count ?? 0,
    }));
    setCategories(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      sort_order: String(category.sort_order),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(blankForm);
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const categoryData = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      sort_order: parseInt(form.sort_order) || 0,
    };

    if (editing) {
      const { error } = await supabase.from('categories').update(categoryData).eq('id', editing.id);
      if (error) {
        toast('Failed to update category', 'error');
        setSaving(false);
        return;
      }
      toast('Category updated', 'success');
    } else {
      const { error } = await supabase.from('categories').insert(categoryData);
      if (error) {
        toast('Failed to create category', 'error');
        setSaving(false);
        return;
      }
      toast('Category created', 'success');
    }
    resetForm();
    fetchCategories();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from('categories').delete().eq('id', confirmDelete.id);
    if (error) {
      toast('Failed to delete category. It may have products assigned.', 'error');
    } else {
      toast('Category deleted', 'info');
      fetchCategories();
    }
    setConfirmDelete(null);
  };

  const moveSort = async (category: CategoryWithCount, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c) => c.id === category.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from('categories').update({ sort_order: other.sort_order }).eq('id', category.id),
      supabase.from('categories').update({ sort_order: category.sort_order }).eq('id', other.id),
    ]);
    fetchCategories();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center">
          <Tags className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No categories yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...categories]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((category, index, arr) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4 flex items-center gap-4"
              >
                {/* Sort controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveSort(category, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSort(category, 'down')}
                    disabled={index === arr.length - 1}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{category.name}</h3>
                    <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs">
                      {category.product_count} products
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{category.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">/{category.slug}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(category)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
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
              className="glass-strong rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editing ? 'Edit Category' : 'New Category'}</h2>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                    className="input-field"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="input-field"
                    placeholder="auto-generated from name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input-field min-h-[80px] resize-y"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary inline-flex items-center gap-2 flex-1 justify-center"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Delete Category?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Delete "{confirmDelete.name}"?
                {confirmDelete.product_count > 0 && (
                  <span className="block mt-1 text-red-500 font-medium">
                    It has {confirmDelete.product_count} product(s) assigned.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
