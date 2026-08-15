import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import UIMediaRenderer from '@/components/UIMediaRenderer';

export default function AccountWishlist() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('wishlist')
        .select('product:products(*, category:categories(*), product_images(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setProducts((data?.map((w) => (w as unknown as { product: Product }).product).filter(Boolean) as Product[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="card p-6">{[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton mb-3 rounded-xl" />)}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
      {products.length === 0 ? (
        <div className="card p-12 text-center">
          <UIMediaRenderer mediaKey="empty_wishlist" size="xl" className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-slate-500 mb-6">Save items you love for later.</p>
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Browse Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
