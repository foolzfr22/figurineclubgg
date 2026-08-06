import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingBag, Zap } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatPrice, getEffectivePrice, getDiscountPercent } from '@/lib/utils';
import BuyNowModal from '@/components/BuyNowModal';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);

  const effectivePrice = getEffectivePrice(product.price, product.discount_price);
  const discount = getDiscountPercent(product.price, product.discount_price);
  const imageUrl = product.product_images?.[0]?.image_url;
  const isBestSeller = product.is_best_seller;
  const isTopRated = product.rating >= 4.5 && product.review_count >= 5;
  const isLimited = product.is_limited_edition;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createRipple(e);
    await addItem(product, 1);
    toast('Added to cart', 'success');
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createRipple(e);
    setBuyNowOpen(true);
  };

  const createRipple = (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Please login to save to wishlist', 'info');
      return;
    }
    if (isWishlisted) {
      const { data: existing } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('wishlist').delete().eq('id', (existing as { id: string }).id);
      }
      setIsWishlisted(false);
      toast('Removed from wishlist', 'info');
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
      setIsWishlisted(true);
      toast('Added to wishlist', 'success');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '50px' }}
        transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
        whileHover={{ y: -6 }}
        className="group h-full"
      >
        <Link to={`/product/${product.slug}`} className="block h-full">
          <div className="card overflow-hidden h-full relative group/card transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:ring-1 hover:ring-primary-500/20 flex flex-col">
            {/* Glass reflection overlay */}
            <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none z-20">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 translate-y-[-100%] group-hover/card:translate-y-[200%] transition-transform duration-1000" />
            </div>

            <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-12 h-12" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
                {discount > 0 && (
                  <span className="badge bg-red-500 text-white shadow-lg text-[10px] sm:text-xs">-{discount}%</span>
                )}
                {isBestSeller && (
                  <span className="badge bg-orange-500 text-white shadow-lg text-[10px] sm:text-xs">Best Seller</span>
                )}
                {isTopRated && (
                  <span className="badge bg-amber-500 text-white shadow-lg text-[10px] sm:text-xs">Top Rated</span>
                )}
                {isLimited && (
                  <span className="badge bg-indigo-500 text-white shadow-lg text-[10px] sm:text-xs">Limited</span>
                )}
                {product.is_new_arrival && !isBestSeller && (
                  <span className="badge bg-primary-600 text-white shadow-lg text-[10px] sm:text-xs">New</span>
                )}
              </div>

              {/* Wishlist button */}
              <button
                onClick={handleWishlist}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-strong flex items-center justify-center hover:scale-110 transition-transform z-10"
                aria-label="Add to wishlist"
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              {/* Stock indicators */}
              {product.stock <= 5 && product.stock > 0 && (
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-10">
                  <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 w-full justify-center py-1 text-[10px] sm:text-xs">
                    Only {product.stock} left!
                  </span>
                </div>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                  <span className="text-white font-semibold text-base sm:text-lg">Out of Stock</span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 relative z-10 flex flex-col flex-1">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[11px] sm:text-xs text-slate-500">{product.rating.toFixed(1)} ({product.review_count})</span>
              </div>
              <h3 className="font-medium text-xs sm:text-sm line-clamp-2 mb-2 group-hover/card:text-primary-600 transition-colors flex-1">
                {product.name}
              </h3>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="font-bold text-sm sm:text-base">{formatPrice(effectivePrice)}</span>
                {discount > 0 && (
                  <span className="text-[11px] sm:text-xs text-slate-400 line-through">{formatPrice(product.price)}</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 sm:gap-2 mt-auto">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="ripple-btn flex-1 py-2 rounded-lg bg-primary-600 text-white text-[11px] sm:text-xs font-medium hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  aria-label="Add to cart"
                >
                  <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="ripple-btn px-2.5 sm:px-3 py-2 rounded-lg bg-gradient-to-r from-accent-500 to-primary-600 text-white text-[11px] sm:text-xs font-medium hover:from-accent-600 hover:to-primary-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  aria-label="Buy now"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <BuyNowModal
        product={buyNowOpen ? product : null}
        quantity={1}
        giftWrap={false}
        customPaint=""
        onClose={() => setBuyNowOpen(false)}
      />
    </>
  );
}
