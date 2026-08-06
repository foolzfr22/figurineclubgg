import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompareArrows, Star, ShoppingBag, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

const MAX_COMPARE = 4;

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const idsParam = searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*), product_images(*)')
        .in('id', ids);
      // Preserve order matching the URL
      const ordered = (ids
        .map((id) => (data as Product[])?.find((p) => p.id === id))
        .filter(Boolean) as Product[]);
      setProducts(ordered);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  const removeProduct = (id: string) => {
    const remaining = ids.filter((i) => i !== id);
    const next = new URLSearchParams(searchParams);
    if (remaining.length > 0) next.set('ids', remaining.join(','));
    else next.delete('ids');
    setSearchParams(next);
  };

  const getPrimaryImage = (p: Product): string | null => {
    if (!p.product_images || p.product_images.length === 0) return null;
    return [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0].image_url;
  };

  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    {
      label: 'Price',
      render: (p) => (
        <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
          {p.discount_price && p.discount_price < p.price ? (
            <span className="flex flex-col items-center">
              {formatPrice(p.discount_price)}
              <span className="text-xs text-slate-400 line-through font-normal">{formatPrice(p.price)}</span>
            </span>
          ) : (
            formatPrice(p.price)
          )}
        </span>
      ),
    },
    {
      label: 'Rating',
      render: (p) => (
        <span className="inline-flex items-center gap-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="font-medium">{p.rating.toFixed(1)}</span>
          <span className="text-xs text-slate-400">({p.review_count})</span>
        </span>
      ),
    },
    {
      label: 'Category',
      render: (p) => <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{p.category?.name ?? '—'}</span>,
    },
    {
      label: 'Material',
      render: (p) => <span>{p.material ?? '—'}</span>,
    },
    {
      label: 'Weight',
      render: (p) => <span>{p.weight ?? '—'}</span>,
    },
    {
      label: 'Height',
      render: (p) => <span>{p.height ?? '—'}</span>,
    },
    {
      label: 'Edition',
      render: (p) => <span>{p.edition ?? '—'}</span>,
    },
    {
      label: 'Stock',
      render: (p) =>
        p.stock > 0 ? (
          <span className="text-green-600 dark:text-green-400 font-medium">In Stock ({p.stock})</span>
        ) : (
          <span className="text-red-500 font-medium">Out of Stock</span>
        ),
    },
  ];

  return (
    <div className="section-padding py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <GitCompareArrows className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Compare Products</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {products.length > 0 ? `Comparing ${products.length} of ${MAX_COMPARE} products` : 'Add products to compare side by side'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card p-6 overflow-x-auto">
            <div className="flex gap-4">
              {[...Array(Math.max(ids.length, 2))].map((_, i) => (
                <div key={i} className="flex-1 min-w-[200px] space-y-3">
                  <div className="aspect-square skeleton rounded-xl" />
                  <div className="h-5 skeleton w-3/4" />
                  <div className="h-4 skeleton w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full glass flex items-center justify-center mx-auto mb-4">
              <GitCompareArrows className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No products to compare</h2>
            <p className="text-slate-500 mb-6">Browse the shop and add products to your comparison list.</p>
            <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Go to Shop
            </Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-slate-500 w-32 align-top">Product</th>
                  {products.map((p) => {
                    const img = getPrimaryImage(p);
                    return (
                      <th key={p.id} className="p-4 align-top min-w-[200px] border-l border-slate-100 dark:border-slate-800">
                        <div className="relative group">
                          <button
                            onClick={() => removeProduct(p.id)}
                            className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                            aria-label="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <Link to={`/product/${p.slug}`} className="block">
                            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
                              {img ? (
                                <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageOff className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-sm leading-tight line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                              {p.name}
                            </p>
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-4 text-sm font-medium text-slate-500 whitespace-nowrap">{row.label}</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-4 text-center text-sm border-l border-slate-100 dark:border-slate-800">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4"></td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-center border-l border-slate-100 dark:border-slate-800">
                      <Link
                        to={`/product/${p.slug}`}
                        className="btn-secondary inline-flex items-center gap-2 text-sm w-full justify-center"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {products.length > 0 && products.length < MAX_COMPARE && (
          <div className="mt-6 text-center">
            <Link to="/shop" className="btn-ghost inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Add more products ({products.length}/{MAX_COMPARE})
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
