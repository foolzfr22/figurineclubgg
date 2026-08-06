import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, Palette, Check, ArrowRight, ShieldCheck, MapPin, Edit2, Trash2, Plus, CheckCircle } from 'lucide-react';
import { useCart, type LocalCartItem } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatPrice, getEffectivePrice, generateOrderNumber } from '@/lib/utils';
import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import type { CartItem, Order, Address } from '@/types';
import GuestCheckoutPopup from '@/components/GuestCheckoutPopup';
import OrderSuccessPopup from '@/components/OrderSuccessPopup';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [customPaint, setCustomPaint] = useState('');
  const [showCustomPaint, setShowCustomPaint] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const [guestPopupDismissed, setGuestPopupDismissed] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? user?.user_metadata?.full_name ?? '',
    phone: profile?.phone ?? '',
    whatsapp_number: '',
    email: user?.email ?? '',
    address: '',
    state: '',
    city: '',
    pin_code: '',
    landmark: '',
    notes: '',
  });

  const shipping = calculateShipping(subtotal, form.state, form.city);
  const grandTotal = subtotal + shipping;

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAddresses((data as Address[]) ?? []);
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Show guest popup once per session for non-logged-in users
  useEffect(() => {
    if (!user && !guestPopupDismissed && items.length > 0) {
      const dismissed = sessionStorage.getItem('fc_guest_popup_dismissed');
      if (!dismissed) {
        setShowGuestPopup(true);
      }
    }
  }, [user, guestPopupDismissed, items.length]);

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setForm({
      ...form,
      full_name: addr.full_name,
      phone: addr.phone,
      address: addr.address,
      state: addr.state,
      city: addr.city,
      pin_code: addr.pin_code,
      landmark: addr.landmark ?? '',
    });
    if (editingAddressId) setEditingAddressId(null);
  };

  const handleDeleteAddress = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    if (selectedAddressId === id) setSelectedAddressId(null);
    loadAddresses();
    toast('Address deleted', 'info');
  };

  const handleSaveEditedAddress = async () => {
    if (!editingAddressId || !user) return;
    await supabase.from('addresses').update({
      full_name: form.full_name,
      phone: form.phone,
      address: form.address,
      state: form.state,
      city: form.city,
      pin_code: form.pin_code,
      landmark: form.landmark || null,
    }).eq('id', editingAddressId);
    setEditingAddressId(null);
    loadAddresses();
    toast('Address updated', 'success');
  };

  const handleGuestPopupClose = () => {
    setShowGuestPopup(false);
    setGuestPopupDismissed(true);
    sessionStorage.setItem('fc_guest_popup_dismissed', 'true');
  };

  const handleContinueAsGuest = () => {
    setShowGuestPopup(false);
    setGuestPopupDismissed(true);
    sessionStorage.setItem('fc_guest_popup_dismissed', 'true');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getProduct = (item: CartItem | LocalCartItem) => {
    return 'product' in item ? item.product : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      toast('Please accept the terms and conditions', 'error');
      return;
    }
    if (items.length === 0) {
      toast('Your cart is empty', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();

      const productionDays = items.reduce((max, item) => {
        const product = getProduct(item);
        const days = product?.production_time ? parseInt(product.production_time) || 14 : 14;
        return Math.max(max, days);
      }, 14);
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + productionDays + 5);
      const estimatedDelivery = deliveryDate.toISOString().split('T')[0];

      const orderData: Record<string, unknown> = {
        order_number: orderNumber,
        full_name: form.full_name,
        phone: form.phone,
        whatsapp_number: form.whatsapp_number,
        email: form.email,
        address: form.address,
        state: form.state,
        city: form.city,
        pin_code: form.pin_code,
        landmark: form.landmark || null,
        notes: form.notes || null,
        gift_wrap: giftWrap,
        custom_paint_request: showCustomPaint && customPaint ? customPaint : null,
        save_address: saveAddress,
        create_account: false,
        subtotal,
        shipping,
        discount: 0,
        grand_total: grandTotal,
        status: 'pending',
        estimated_delivery: estimatedDelivery,
      };

      if (user) {
        orderData.user_id = user.id;
      }

      const { data: order, error } = await supabase.from('orders').insert(orderData).select('id').single();

      if (error || !order) {
        throw new Error('Failed to create order. Please try again.');
      }

      const orderItems = items.map((item) => {
        const product = getProduct(item);
        return {
          order_id: order.id,
          product_id: product?.id ?? null,
          product_name: product?.name ?? 'Unknown Product',
          product_image: product?.product_images?.[0]?.image_url ?? null,
          quantity: item.quantity,
          price: getEffectivePrice(product?.price ?? 0, product?.discount_price ?? null),
        };
      });
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        console.error('Order items insert failed:', itemsError);
      }

      if (saveAddress && user && !selectedAddressId) {
        await supabase.from('addresses').insert({
          user_id: user.id,
          full_name: form.full_name,
          phone: form.phone,
          address: form.address,
          state: form.state,
          city: form.city,
          pin_code: form.pin_code,
          landmark: form.landmark || null,
        });
      }

      // Build the order for the success popup from data we already have —
      // don't re-query `orders` here, since guests no longer have blanket
      // SELECT access (see track_guest_order for guest lookups instead).
      const fullOrder = { ...orderData, id: order.id, order_items: orderItems } as unknown as Order;

      await clearCart();
      setPlacedOrder(fullOrder);
      setShowSuccessPopup(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !showSuccessPopup) {
    return (
      <div className="section-padding py-20 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
          Shop Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="section-padding py-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Saved Addresses */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" /> Saved Addresses
              </h2>
              {addresses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No saved addresses yet.</p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{addr.full_name}</p>
                      <div className="flex gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedAddressId(addr.id); setEditingAddressId(addr.id); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{addr.address}, {addr.city}, {addr.state} - {addr.pin_code}</p>
                    <p className="text-xs text-slate-500 mt-1">{addr.phone}</p>
                  </div>
                ))}
              </div>
              )}
              {editingAddressId && (
                <button type="button" onClick={handleSaveEditedAddress} className="btn-primary text-sm mt-3 inline-flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save Edited Address
                </button>
              )}
              {!editingAddressId && selectedAddressId && (
                <button type="button" onClick={() => { setSelectedAddressId(null); setForm({ ...form, address: '', state: '', city: '', pin_code: '', landmark: '' }); }} className="btn-secondary text-sm mt-3 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Use New Address
                </button>
              )}
            </motion.div>
          )}

          {/* Contact Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <h2 className="font-bold text-lg mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} required />
              <Field label="Phone Number" name="phone" value={form.phone} onChange={handleChange} required type="tel" />
              <Field label="WhatsApp Number" name="whatsapp_number" value={form.whatsapp_number} onChange={handleChange} required type="tel" />
              <Field label="Email" name="email" value={form.email} onChange={handleChange} required type="email" />
            </div>
          </motion.div>

          {/* Shipping Address */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <h2 className="font-bold text-lg mb-4">Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Address" name="address" value={form.address} onChange={handleChange} required />
              </div>
              <Field label="State" name="state" value={form.state} onChange={handleChange} required />
              <Field label="City" name="city" value={form.city} onChange={handleChange} required />
              <Field label="PIN Code" name="pin_code" value={form.pin_code} onChange={handleChange} required />
              <Field label="Landmark" name="landmark" value={form.landmark} onChange={handleChange} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium mb-1.5 block">Order Notes (optional)</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any special delivery instructions..."
                className="input-field min-h-[80px] resize-y"
              />
            </div>
          </motion.div>

          {/* Options */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 space-y-3">
            <h2 className="font-bold text-lg mb-2">Additional Options</h2>
            <button
              type="button"
              onClick={() => setGiftWrap(!giftWrap)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${giftWrap ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <p className="font-medium text-sm">Gift Wrapping</p>
                  <p className="text-xs text-slate-500">Premium wrapping with personalized note</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${giftWrap ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                {giftWrap && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowCustomPaint(!showCustomPaint)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${showCustomPaint ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <p className="font-medium text-sm">Custom Paint Request</p>
                  <p className="text-xs text-slate-500">Request a custom paint job</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${showCustomPaint ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                {showCustomPaint && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
            {showCustomPaint && (
              <textarea value={customPaint} onChange={(e) => setCustomPaint(e.target.value)} placeholder="Describe your custom paint request..." className="input-field min-h-[80px] resize-y" />
            )}
          </motion.div>

          {/* Checkboxes */}
          <div className="card p-6 space-y-3">
            {user && !selectedAddressId && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="mt-1 w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm">Save this address for future orders</span>
              </label>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm">I accept the <Link to="/page/terms" className="text-primary-600 hover:underline">Terms & Conditions</Link> and <Link to="/page/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</Link></span>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const product = getProduct(item);
                const price = getEffectivePrice(product?.price ?? 0, product?.discount_price ?? null);
                return (
                  <div key={item.id} className="flex gap-3">
                    <img src={product?.product_images?.[0]?.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{product?.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatPrice(price)}</p>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(price * item.quantity)}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                {shipping === 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">FREE 🎉</span>
                ) : (
                  <span>{formatPrice(shipping)}</span>
                )}
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>{formatPrice(0)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                <span>Grand Total</span><span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
            {shipping > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-2 text-center">
                Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for FREE shipping!
              </p>
            )}
            <p className="text-xs text-slate-500 mt-3 text-center">
              Shipping charges are estimated and may vary slightly depending on your final delivery location and package size.
            </p>
            <button type="submit" disabled={submitting || !acceptTerms} className="btn-primary w-full mt-4 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing Order...</>
              ) : (
                <>Place Order <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure checkout. No payment required.</span>
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              We will contact you via WhatsApp or phone within 24 hours to confirm your order.
            </p>
          </div>
        </div>
      </form>

      <GuestCheckoutPopup
        open={showGuestPopup}
        onClose={handleGuestPopupClose}
        onContinueAsGuest={handleContinueAsGuest}
      />
      <OrderSuccessPopup
        open={showSuccessPopup}
        onClose={() => {
          setShowSuccessPopup(false);
          navigate('/');
        }}
        order={placedOrder}
        whatsappNumber={settings?.whatsapp_number?.replace(/\D/g, '') ?? ''}
      />
    </div>
  );
}

function Field({ label, name, value, onChange, required, type = 'text' }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} className="input-field" />
    </div>
  );
}
