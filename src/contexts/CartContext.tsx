import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Product, CartItem } from '@/types';

// Sound playback helper - avoids circular dependency with UIMediaContext
function playCartSound(key: 'add_to_cart' | 'remove_from_cart') {
  try {
    const stored = localStorage.getItem('fc_ui_sounds');
    if (!stored) return;
    const config = JSON.parse(stored);
    if (!config.master_enabled) return;
    const entry = config.sounds?.[key];
    if (!entry?.enabled || !entry?.url) return;
    const volume = (entry.volume / 100) * (config.master_volume / 100);
    const audio = new Audio(entry.url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {});
  } catch { /* noop */ }
}

export interface LocalCartItem {
  id: string;
  product: Product;
  quantity: number;
  gift_wrap: boolean;
  custom_paint_request: string | null;
}

interface CartContextType {
  items: CartItem[] | LocalCartItem[];
  loading: boolean;
  addItem: (product: Product, quantity?: number, giftWrap?: boolean, customPaint?: string) => Promise<void>;
  updateItem: (id: string, updates: { quantity?: number; gift_wrap?: boolean; custom_paint_request?: string | null }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = 'figure_club_guest_cart';

function loadGuestCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as LocalCartItem[]) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: LocalCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[] | LocalCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems(loadGuestCart());
      setCartId(null);
      return;
    }
    setLoading(true);
    const { data: cart } = await supabase.from('cart').select('id').eq('user_id', user.id).maybeSingle();

    let cId = cart?.id;
    if (!cId) {
      const { data: newCart } = await supabase.from('cart').insert({ user_id: user.id }).select('id').single();
      cId = newCart?.id;
    }
    setCartId(cId ?? null);

    if (cId) {
      const { data: cartItems } = await supabase
        .from('cart_items')
        .select('*, product:products(*, category:categories(*), product_images(*))')
        .eq('cart_id', cId)
        .order('created_at', { ascending: false });
      setItems((cartItems as unknown as CartItem[]) ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [user]);

  // Load cart on mount and when user changes
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Merge guest cart into Supabase when user logs in
  useEffect(() => {
    if (user && cartId) {
      const guestItems = loadGuestCart();
      if (guestItems.length > 0) {
        (async () => {
          for (const item of guestItems) {
            const { data: existing } = await supabase
              .from('cart_items')
              .select('id, quantity')
              .eq('cart_id', cartId)
              .eq('product_id', item.product.id)
              .maybeSingle();
            if (existing) {
              await supabase
                .from('cart_items')
                .update({ quantity: (existing as { quantity: number }).quantity + item.quantity })
                .eq('id', (existing as { id: string }).id);
            } else {
              await supabase.from('cart_items').insert({
                cart_id: cartId,
                product_id: item.product.id,
                quantity: item.quantity,
                gift_wrap: item.gift_wrap,
                custom_paint_request: item.custom_paint_request || null,
              });
            }
          }
          localStorage.removeItem(GUEST_CART_KEY);
          refreshCart();
        })();
      }
    }
  }, [user, cartId, refreshCart]);

  const addItem = async (product: Product, quantity = 1, giftWrap = false, customPaint = '') => {
    playCartSound('add_to_cart');
    if (user && cartId) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: (existing as { quantity: number }).quantity + quantity })
          .eq('id', (existing as { id: string }).id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id: cartId,
          product_id: product.id,
          quantity,
          gift_wrap: giftWrap,
          custom_paint_request: customPaint || null,
        });
      }
      await refreshCart();
    } else {
      // Guest cart - localStorage
      const guestItems = loadGuestCart();
      const existing = guestItems.find((i) => i.product.id === product.id);
      if (existing) {
        existing.quantity += quantity;
        if (giftWrap) existing.gift_wrap = true;
        if (customPaint) existing.custom_paint_request = customPaint;
      } else {
        guestItems.unshift({
          id: `guest-${Date.now()}-${product.id}`,
          product,
          quantity,
          gift_wrap: giftWrap,
          custom_paint_request: customPaint || null,
        });
      }
      saveGuestCart(guestItems);
      setItems(guestItems);
    }
  };

  const updateItem = async (id: string, updates: { quantity?: number; gift_wrap?: boolean; custom_paint_request?: string | null }) => {
    if (user && cartId) {
      await supabase.from('cart_items').update(updates).eq('id', id);
      await refreshCart();
    } else {
      const guestItems = loadGuestCart();
      const item = guestItems.find((i) => i.id === id);
      if (item) {
        if (updates.quantity !== undefined) item.quantity = updates.quantity;
        if (updates.gift_wrap !== undefined) item.gift_wrap = updates.gift_wrap;
        if (updates.custom_paint_request !== undefined) item.custom_paint_request = updates.custom_paint_request;
        saveGuestCart(guestItems);
        setItems([...guestItems]);
      }
    }
  };

  const removeItem = async (id: string) => {
    playCartSound('remove_from_cart');
    if (user && cartId) {
      await supabase.from('cart_items').delete().eq('id', id);
      await refreshCart();
    } else {
      const guestItems = loadGuestCart().filter((i) => i.id !== id);
      saveGuestCart(guestItems);
      setItems(guestItems);
    }
  };

  const clearCart = async () => {
    if (user && cartId) {
      await supabase.from('cart_items').delete().eq('cart_id', cartId);
      await refreshCart();
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
      setItems([]);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const product = 'product' in item ? item.product : null;
    const price = product?.discount_price && product.discount_price < product.price
      ? product.discount_price
      : product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{ items, loading, addItem, updateItem, removeItem, clearCart, totalItems, subtotal, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
