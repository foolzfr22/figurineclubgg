import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/types';
import ProductCard from '@/components/ProductCard';
import UIMediaRenderer from '@/components/UIMediaRenderer';
import { formatPrice } from '@/lib/utils';

type SortOption = 'newest' | 'best_selling' | 'highest_rated' | 'price_low' | 'price_high';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');

  const selectedCategory = searchParams.get('category') ?? '';
  const filterType = searchParams.get('filter') ?? '';
  const sort = (searchParams.get('sort') as SortOption) ?? 'newest';
  const maxPrice = Number(searchParams.get('max_price') ?? '20000');

  useEffect(() => {
    (async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, category:categories(*), product_images(*)').eq('is_hidden', false),
        supabase.from('categories').select('*').order('sort_order'),
      ]);
      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (cat) result = result.filter((p) => p.category_id === cat.id);
    }

    if (filterType === 'new') result = result.filter((p) => p.is_new_arrival);
    if (filterType === 'bestseller') result = result.filter((p) => p.is_best_seller);
    if (filterType === 'limited') result = result.filter((p) => p.is_limited_edition);
    if (filterType === 'trending') result = result.filter((p) => p.is_trending);
    if (filterType === 'featured') result = result.filter((p) => p.is_featured);

    result = result.filter((p) => {
      const price = p.discount_price && p.discount_price < p.price ? p.discount_price : p.price;
      return price <= maxPrice;
    });

    switch (sort) {
      case 'best_selling':
        result.sort((a, b) => b.review_count - a.review_count);
        break;
      case 'highest_rated':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        result.sort((a, b) => {
          const aPrice = a.discount_price && a.discount_price < a.price ? a.discount_price : a.price;
          const bPrice = b.discount_price && b.discount_price < b.price ? b.discount_price : b.price;
          return aPrice - bPrice;
        });
        break;
      case 'price_high':
        result.sort((a, b) => {
          const aPrice = a.discount_price && a.discount_price < a.price ? a.discount_price : a.price;
          const bPrice = b.discount_price && b.discount_price < b.price ? b.discount_price : b.price;
          return bPrice - aPrice;
        });
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [products, categories, searchQuery, selectedCategory, filterType, sort, maxPrice]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="section-padding py-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Shop</h1>
        <p className="text-slate-600 dark:text-slate-400">{filtered.length} products available</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search figures..."
          className="input-field pl-12"
        />
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`fixed lg:sticky lg:top-20 inset-y-0 left-0 z-40 w-72 lg:w-64 flex-shrink-0 glass-strong lg:glass rounded-2xl p-6 overflow-y-auto transition-transform duration-300 ${
          showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="font-semibold">Filters</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-sm mb-3">Categories</h4>
            <div className="space-y-1">
              <button
                onClick={() => updateParam('category', '')}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !selectedCategory ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam('category', cat.slug)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.slug ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-sm mb-3">Price Range</h4>
            <input
              type="range"
              min="500"
              max="20000"
              step="500"
              value={maxPrice}
              onChange={(e) => updateParam('max_price', e.target.value)}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Rs. 500</span>
              <span>Up to {formatPrice(maxPrice)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-sm mb-3">Quick Filters</h4>
            <div className="space-y-1">
              {[
                { key: 'new', label: 'New Arrivals' },
                { key: 'bestseller', label: 'Best Sellers' },
                { key: 'limited', label: 'Limited Editions' },
                { key: 'trending', label: 'Trending' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateParam('filter', filterType === f.key ? '' : f.key)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterType === f.key ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-4">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden btn-ghost flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-slate-500 hidden sm:block">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="input-field py-2 px-3 text-sm w-auto"
              >
                <option value="newest">Newest</option>
                <option value="best_selling">Best Selling</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="aspect-[3/4] skeleton" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 skeleton w-3/4" />
                    <div className="h-4 skeleton w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <UIMediaRenderer mediaKey="no_results" size="xl" className="mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No products found matching your filters.</p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setShowFilters(false)} />
      )}
    </div>
  );
}
