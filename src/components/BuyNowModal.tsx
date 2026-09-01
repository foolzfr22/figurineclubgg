import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, CheckCircle, User, Mail, Phone, MessageCircle, MapPin, Building, Hash, StickyNote, Gift, Palette, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import type { Product, Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPrice, getEffectivePrice, generateOrderNumber } from '@/lib/utils';
import { calculateShipping, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import GuestCheckoutPopup from '@/components/GuestCheckoutPopup';
import OrderSuccessPopup from '@/components/OrderSuccessPopup';
import { Link } from 'react-router-dom';

interface BuyNowModalProps {
  product: Product | null;
  quantity: number;
  giftWrap: boolean;
  customPaint: string;
  onClose: () => void;
}

export default function BuyNowModal({ product, quantity, giftWrap, customPaint, onClose }: BuyNowModalProps) {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? user?.user_metadata?.full_name ?? '',
    email: user?.email ?? '',
    whatsapp_number: profile?.phone ?? '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    notes: '',
  });

  if (!product) return null;

  const effectivePrice = getEffectivePrice(product.price, product.discount_price);
  const subtotal = effectivePrice * quantity;
  const shipping = calculateShipping(subtotal, form.state, form.city);
  const grandTotal = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      toast('You must accept the Terms & Conditions before placing an order.', 'error');
      return;
    }

    // Show guest popup if not logged in (once per session)
    if (!user) {
      const dismissed = sessionStorage.getItem('fc_guest_popup_dismissed');
      if (!dismissed) {
        setShowGuestPopup(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderNum = generateOrderNumber();
      const deliveryDate = new Date();
      const productionDays = product.production_time ? parseInt(product.production_time) || 14 : 14;
      deliveryDate.setDate(deliveryDate.getDate() + productionDays + 5);
      const estimatedDelivery = deliveryDate.toISOString().split('T')[0];

      const orderData: Record<string, unknown> = {
        order_number: orderNum,
        full_name: form.full_name,
        phone: form.whatsapp_number,
        whatsapp_number: form.whatsapp_number,
        email: form.email,
        address: form.address,
        state: form.state,
        city: form.city,
        pin_code: form.pin_code,
        notes: form.notes || null,
        gift_wrap: giftWrap,
        custom_paint_request: customPaint || null,
        save_address: false,
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

      const { error: itemsError } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.product_images?.[0]?.image_url ?? null,
        quantity,
        price: effectivePrice,
      });

      if (itemsError) {
        console.error('Order items insert failed:', itemsError);
      }

      // Fetch complete order for success popup
      const { data: fullOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order.id)
        .maybeSingle();

      setOrderNumber(orderNum);
      setPlacedOrder(fullOrder as Order | null);
      setShowSuccessPopup(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestPopupClose = () => {
    setShowGuestPopup(false);
    sessionStorage.setItem('fc_guest_popup_dismissed', 'true');
  };

  const handleContinueAsGuest = () => {
    setShowGuestPopup(false);
    sessionStorage.setItem('fc_guest_popup_dismissed', 'true');
  };

  return (
    <>
      <AnimatePresence>
        {product && !showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 glass-strong rounded-t-3xl p-6 border-b border-slate-200 dark:border-slate-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary-500" /> Buy Now
                  </h2>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-4 p-3 rounded-xl surface-inset">
                  <img src={product.product_images?.[0]?.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                    <p className="text-xs text-slate-500">Qty: {quantity} x {formatPrice(effectivePrice)}</p>
                  </div>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField icon={User} label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} required />
                  <FormField icon={Mail} label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <FormField icon={MessageCircle} label="WhatsApp Number" name="whatsapp_number" type="tel" value={form.whatsapp_number} onChange={handleChange} required placeholder="+91 98765 43210" />
                <FormField icon={MapPin} label="Shipping Address" name="address" value={form.address} onChange={handleChange} required />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField icon={Building} label="City" name="city" value={form.city} onChange={handleChange} required />
                  <FormField icon={MapPin} label="State" name="state" value={form.state} onChange={handleChange} required />
                  <FormField icon={Hash} label="PIN Code" name="pin_code" value={form.pin_code} onChange={handleChange} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-slate-400" /> Order Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Any special instructions..."
                    className="input-field min-h-[60px] resize-y text-sm"
                  />
                </div>

                {/* Order Summary */}
                <div className="p-4 rounded-xl surface-inset space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">FREE 🎉</span>
                    ) : (
                      <span>{formatPrice(shipping)}</span>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span>Total</span><span>{formatPrice(grandTotal)}</span>
                  </div>
                  {shipping > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 text-center">
                      Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for FREE shipping!
                    </p>
                  )}
                  <p className="text-xs text-slate-500 text-center">
                    Shipping charges are estimated and may vary slightly depending on your final delivery location and package size.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-primary-600 flex-shrink-0" />
                  <span className="text-xs">I accept the <Link to="/page/terms" className="text-primary-600 hover:underline">Terms & Conditions</Link> and <Link to="/page/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</Link></span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !acceptTerms}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing Order...</>
                  ) : (
                    <>Place Order <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                {!acceptTerms && (
                  <p className="text-xs text-red-500 text-center">You must accept the Terms & Conditions before placing an order.</p>
                )}
                <p className="text-xs text-slate-500 text-center">No payment required. We will contact you to confirm.</p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GuestCheckoutPopup
        open={showGuestPopup}
        onClose={handleGuestPopupClose}
        onContinueAsGuest={handleContinueAsGuest}
      />
      <OrderSuccessPopup
        open={showSuccessPopup}
        onClose={() => {
          setShowSuccessPopup(false);
          onClose();
        }}
        order={placedOrder}
        whatsappNumber={settings?.whatsapp_number?.replace(/\D/g, '') ?? ''}
      />
    </>
  );
}

function FormField({ icon: Icon, label, name, value, onChange, required, type = 'text', placeholder }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}{required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} className="input-field text-sm" />
    </div>
  );
}
