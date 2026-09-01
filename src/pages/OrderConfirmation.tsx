import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowRight, Home, MessageCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import UIMediaRenderer from '@/components/UIMediaRenderer';
import OrderSuccessPopup from '@/components/OrderSuccessPopup';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
      // Show the success popup on load
      if (data) setShowSuccessPopup(true);
    })();
  }, [orderNumber]);

  const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') ?? '';

  if (loading) {
    return (
      <div className="section-padding py-20 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="section-padding py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center"
      >
        <UIMediaRenderer mediaKey="success" size="xl" className="mx-auto mb-6" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Thank You!</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">Your order has been received.</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
          We will contact you through your WhatsApp number or phone number within 24 hours to confirm your order.
        </p>

        {order && (
          <div className="card p-6 text-left mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm text-slate-500">Order Number</p>
                <p className="font-bold text-lg">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Estimated Delivery</p>
                <p className="font-medium">{order.estimated_delivery ? formatDate(order.estimated_delivery) : 'TBD'}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex gap-3">
                  {item.product_image && <img src={item.product_image} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2"><span>Total</span><span>{formatPrice(order.grand_total)}</span></div>
            </div>

            <div className="mt-4 p-3 rounded-lg surface-inset text-sm">
              <p><strong className="text-slate-700 dark:text-slate-300">Ship to:</strong> {order.full_name}, {order.address}, {order.city}, {order.state} - {order.pin_code}</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Phone:</strong> {order.phone}</p>
              <p><strong className="text-slate-700 dark:text-slate-300">WhatsApp:</strong> {order.whatsapp_number}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/account/orders" className="btn-primary inline-flex items-center gap-2">
            <Package className="w-4 h-4" /> Track Order
          </Link>
          <Link to="/shop" className="btn-secondary inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
          {whatsappNumber && (
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
            </a>
          )}
        </div>
      </motion.div>

      <OrderSuccessPopup
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        order={order}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
