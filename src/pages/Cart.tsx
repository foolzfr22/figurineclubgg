import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, ArrowRight, ShoppingBag as CartIcon } from 'lucide-react';
import { useState } from 'react';
import { useCart, type LocalCartItem } from '@/contexts/CartContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatPrice, getEffectivePrice } from '@/lib/utils';
import type { Coupon, CartItem } from '@/types';
import UIMediaRenderer from '@/components/UIMediaRenderer';

export default function Cart() {
  const navigate = useNavigate();
  const { items, loading, updateItem, removeItem, subtotal, totalItems } = useCart();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const shipping = subtotal >= (settings?.shipping_free_over ?? 5000) ? 0 : (settings?.shipping_flat ?? 199);
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percent'
      ? Math.round((subtotal * appliedCoupon.discount_value) / 100)
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  const grandTotal = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      const coupon = data as Coupon;
      if (coupon.min_order && subtotal < coupon.min_order) {
        toast(`Minimum order of ${formatPrice(coupon.min_order)} required`, 'error');
      } else {
        setAppliedCoupon(coupon);
        toast('Coupon applied!', 'success');
      }
    } else {
      toast('Invalid coupon code', 'error');
    }
    setCouponLoading(false);
  };

  // Helper to get product from either cart item type
  const getProduct = (item: CartItem | LocalCartItem) => {
    return 'product' in item ? item.product : null;
  };

  if (loading) {
    return (
      <div className="section-padding py-12 min-h-screen">
        <div className="h-8 skeleton w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
          </div>
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="section-padding py-20 text-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <UIMediaRenderer mediaKey="empty_cart" size="xl" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
          <p className="text-slate-500 mb-8">Discover our premium collectibles and start your collection.</p>
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
            Browse Collection <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="section-padding py-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({totalItems})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map((item) => {
              const product = getProduct(item);
              if (!product) return null;
              const price = getEffectivePrice(product.price, product.discount_price);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="card p-4 flex gap-4"
                >
                  <Link to={`/product/${product.slug}`} className="flex-shrink-0">
                    <img src={product.product_images?.[0]?.image_url} alt={product.name} className="w-24 h-24 rounded-xl object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="font-medium line-clamp-1 mb-1">{product.name}</h3>
                    </Link>
                    <p className="text-sm text-slate-500 mb-2">{formatPrice(price)} each</p>
                    {item.gift_wrap && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 mb-2">Gift Wrap</span>}
                    {item.custom_paint_request && <p className="text-xs text-slate-500 mb-2">Custom paint: {item.custom_paint_request}</p>}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                        <button onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, { quantity: Math.min(product.stock, item.quantity + 1) })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatPrice(price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>

            {/* Coupon */}
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">{appliedCoupon.code}</span>
                </div>
                <button onClick={() => setAppliedCoupon(null)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="input-field flex-1 text-sm"
                />
                <button type="submit" disabled={couponLoading} className="btn-secondary px-4 text-sm">
                  Apply
                </button>
              </form>
            )}

            <div className="space-y-2 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-6 inline-flex items-center justify-center gap-2">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>

            <Link to="/shop" className="block text-center text-sm text-slate-500 hover:text-primary-600 mt-4">
              Continue Shopping
            </Link>
          </div>

          {/* Shipping Calculator */}
          <div className="card p-4 mt-4">
            <h3 className="font-medium text-sm mb-2">Shipping Calculator</h3>
            <p className="text-xs text-slate-500">
              {shipping === 0
                ? 'You qualify for FREE shipping!'
                : `Add ${formatPrice((settings?.shipping_free_over ?? 5000) - subtotal)} more for FREE shipping`}
            </p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (subtotal / (settings?.shipping_free_over ?? 5000)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
