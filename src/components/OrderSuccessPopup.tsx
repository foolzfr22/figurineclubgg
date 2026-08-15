import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, CheckCircle, MessageCircle, ShoppingBag, Sparkles, PartyPopper } from 'lucide-react';
import type { Order } from '@/types';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import UIMediaRenderer from '@/components/UIMediaRenderer';
import { useUIMedia } from '@/contexts/UIMediaContext';

interface OrderSuccessPopupProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  whatsappNumber: string;
}

export default function OrderSuccessPopup({ open, onClose, order, whatsappNumber }: OrderSuccessPopupProps) {
  const [showThankYou, setShowThankYou] = useState(false);
  const [templateBody, setTemplateBody] = useState<string | null>(null);
  const { playSound } = useUIMedia();

  useEffect(() => {
    if (open) {
      playSound('order_success');
      (async () => {
        const { data } = await supabase.from('whatsapp_templates').select('template_body').eq('id', 1).maybeSingle();
        if (data?.template_body) setTemplateBody(data.template_body);
      })();
    }
  }, [open, playSound]);

  const buildWhatsAppMessage = () => {
    if (!order) return '';
    const items = order.order_items?.map(i => `  - ${i.product_name} (Qty: ${i.quantity}) - ${formatPrice(i.price * i.quantity)}`).join('\n') ?? '';
    const quantities = order.order_items?.map(i => i.quantity).join(', ') ?? '';
    const website = window.location.origin;

    let body = templateBody ?? `Hello {business_name} 👋\nI have successfully placed an order.\nOrder ID: {order_id}\nName: {customer_name}\nProducts: {products}\nTotal: {total}\nThank you!`;

    body = body.replace(/{order_id}/g, order.order_number);
    body = body.replace(/{customer_name}/g, order.full_name);
    body = body.replace(/{phone}/g, order.phone);
    body = body.replace(/{email}/g, order.email);
    body = body.replace(/{address}/g, `${order.address}, ${order.city}, ${order.state} - ${order.pin_code}`);
    body = body.replace(/{products}/g, items || 'N/A');
    body = body.replace(/{quantity}/g, quantities || '1');
    body = body.replace(/{total}/g, formatPrice(order.grand_total));
    body = body.replace(/{website}/g, website);

    return encodeURIComponent(body);
  };

  const handleWhatsAppConfirm = () => {
    if (!order) return;
    window.open(`https://wa.me/${whatsappNumber}?text=${buildWhatsAppMessage()}`, '_blank');
    setShowThankYou(true);
  };

  const handleClose = () => {
    setShowThankYou(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl w-full max-w-md p-8 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
            <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            {!showThankYou ? (
              <div className="relative z-10 text-center">
                <UIMediaRenderer mediaKey="success" size="xl" className="mx-auto mb-5" />

                <h2 className="text-2xl font-bold mb-2">Order Received Successfully!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Thank you for shopping with Figure Club.</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">Your order request has been received successfully.</p>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Highly Recommended</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Confirm your order on WhatsApp for faster confirmation. Our team will provide the payment QR code and payment instructions.
                  </p>
                </div>

                <div className="space-y-3">
                  {whatsappNumber && (
                    <button
                      onClick={handleWhatsAppConfirm}
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                      <MessageCircle className="w-5 h-5" /> Confirm Order on WhatsApp
                    </button>
                  )}
                  <Link to="/shop" onClick={handleClose} className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Continue Shopping
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center">
                <UIMediaRenderer mediaKey="success" size="xl" className="mx-auto mb-5" />

                <h2 className="text-2xl font-bold mb-3">Thank You for Your Purchase!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Your order has been successfully received.</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                  Our team will contact you shortly after verifying your order.
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  If you have already sent your WhatsApp confirmation, there's nothing else you need to do.
                </p>

                <div className="space-y-3">
                  <Link to="/shop" onClick={handleClose} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Continue Shopping
                  </Link>
                  <Link to="/account/orders" onClick={handleClose} className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> View My Orders
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
