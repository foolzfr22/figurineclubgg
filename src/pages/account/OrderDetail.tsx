import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock, Package, Truck, Home, AlertTriangle, Upload, X, FileVideo, FileImage } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Order, DamageClaim } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES } from '@/types';
import { formatPrice, formatDate, formatDateTime, cn } from '@/lib/utils';
import UIMediaRenderer from '@/components/UIMediaRenderer';

const FLOW_STEPS = ['pending', 'confirmed', 'printing', 'painting', 'quality_check', 'packaging', 'ready_to_ship', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [existingClaim, setExistingClaim] = useState<DamageClaim | null>(null);
  const [uploading, setUploading] = useState(false);
  const [damageForm, setDamageForm] = useState({
    videoFile: null as File | null,
    photoFiles: [] as File[],
    labelFile: null as File | null,
    description: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), order_timeline(*)')
        .eq('order_number', orderNumber)
        .eq('user_id', user!.id)
        .maybeSingle();
      setOrder(data as Order | null);
      // Check for existing damage claim
      if (data) {
        const { data: claim } = await supabase
          .from('damage_claims')
          .select('*')
          .eq('order_id', (data as Order).id)
          .maybeSingle();
        setExistingClaim(claim as DamageClaim | null);
      }
      setLoading(false);
    })();
  }, [orderNumber, user]);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('damage-claims').upload(path, file);
    if (error) {
      toast(`Upload failed: ${error.message}`, 'error');
      return null;
    }
    return supabase.storage.from('damage-claims').getPublicUrl(data.path).data.publicUrl;
  };

  const handleSubmitDamage = async () => {
    if (!order || !user) return;
    if (!damageForm.videoFile && !damageForm.description) {
      toast('Please provide a video or description', 'error');
      return;
    }
    setUploading(true);
    try {
      let videoUrl: string | null = null;
      const photoUrls: string[] = [];

      if (damageForm.videoFile) {
        videoUrl = await uploadFile(damageForm.videoFile, `${order.id}/video-${Date.now()}-${damageForm.videoFile.name}`);
      }
      for (const photo of damageForm.photoFiles) {
        const url = await uploadFile(photo, `${order.id}/photo-${Date.now()}-${photo.name}`);
        if (url) photoUrls.push(url);
      }
      if (damageForm.labelFile) {
        const url = await uploadFile(damageForm.labelFile, `${order.id}/label-${Date.now()}-${damageForm.labelFile.name}`);
        if (url) photoUrls.push(url);
      }

      const { error } = await supabase.from('damage_claims').insert({
        order_id: order.id,
        user_id: user.id,
        video_url: videoUrl,
        photo_urls: photoUrls,
        description: damageForm.description || null,
        status: 'pending',
      });

      if (error) {
        toast('Failed to submit claim', 'error');
      } else {
        // Update order status
        await supabase.from('orders').update({ status: 'damage_pending' }).eq('id', order.id);
        await supabase.from('order_timeline').insert({
          order_id: order.id,
          status: 'Package Damaged - Claim Filed',
        });
        // Create admin notification
        await supabase.from('admin_notifications').insert({
          type: 'damage_claim',
          title: 'New Damage Claim',
          message: `Damage claim filed for ${order.order_number}`,
          entity_id: order.id,
        });
        toast('Damage claim submitted successfully', 'success');
        setShowDamageForm(false);
        setDamageForm({ videoFile: null, photoFiles: [], labelFile: null, description: '' });
        // Refresh
        const { data: updated } = await supabase.from('orders').select('*, order_items(*), order_timeline(*)').eq('id', order.id).maybeSingle();
        setOrder(updated as Order | null);
        const { data: claim } = await supabase.from('damage_claims').select('*').eq('order_id', order.id).maybeSingle();
        setExistingClaim(claim as DamageClaim | null);
      }
    } catch {
      toast('An error occurred', 'error');
    }
    setUploading(false);
  };

  if (loading) {
    return <div className="card p-6"><div className="h-8 skeleton w-48 mb-6" />{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton mb-3 rounded-xl" />)}</div>;
  }

  if (!order) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500 mb-4">Order not found.</p>
        <Link to="/account/orders" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentStepIndex = FLOW_STEPS.indexOf(order.status);

  return (
    <div>
      <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{order.order_number}</h1>
            <p className="text-sm text-slate-500">Placed on {formatDateTime(order.created_at)}</p>
          </div>
          <span className={`badge ${ORDER_STATUS_COLORS[order.status]} text-sm px-3 py-1`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Timeline */}
        {!isCancelled ? (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 dark:bg-slate-800" />
              <div
                className="absolute left-0 top-5 h-0.5 bg-primary-500 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (FLOW_STEPS.length - 1)) * 100}%` }}
              />
              {FLOW_STEPS.map((step, i) => (
                <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    i <= currentStepIndex ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {i < currentStepIndex ? <CheckCircle className="w-5 h-5" /> : i === currentStepIndex ? <Clock className="w-5 h-5" /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  <span className={`text-xs text-center ${i <= currentStepIndex ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-slate-400'}`}>
                    {ORDER_STATUS_LABELS[step as keyof typeof ORDER_STATUS_LABELS]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 mb-6 text-center">
            <UIMediaRenderer mediaKey="cancellation" size="lg" className="mx-auto mb-3" />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">This order was {ORDER_STATUS_LABELS[order.status].toLowerCase()}.</p>
          </div>
        )}

        {/* Estimated Delivery */}
        {order.estimated_delivery && !isCancelled && (
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 mb-6 flex items-center gap-3">
            <Truck className="w-5 h-5 text-primary-600" />
            <div>
              <p className="text-sm font-medium">Estimated Delivery</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(order.estimated_delivery)}</p>
            </div>
          </div>
        )}

        {/* Items */}
        <h2 className="font-bold mb-3">Items</h2>
        <div className="space-y-3 mb-6">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex gap-3 p-3 rounded-lg surface-inset">
              {item.product_image && <img src={item.product_image} alt="" className="w-14 h-14 rounded-lg object-cover" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatPrice(item.price)}</p>
              </div>
              <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-1 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2"><span>Total</span><span>{formatPrice(order.grand_total)}</span></div>
        </div>

        {/* Shipping Address */}
        <div className="mt-6 p-4 rounded-xl surface-inset">
          <h3 className="font-medium text-sm mb-2">Shipping Address</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {order.full_name}<br />
            {order.address}<br />
            {order.city}, {order.state} - {order.pin_code}<br />
            Phone: {order.phone} | WhatsApp: {order.whatsapp_number}
          </p>
        </div>

        {/* Timeline Log */}
        {order.order_timeline && order.order_timeline.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-sm mb-3">Status History</h3>
            <div className="space-y-2">
              {order.order_timeline.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="font-medium">{ORDER_STATUS_LABELS[entry.status as keyof typeof ORDER_STATUS_LABELS] ?? entry.status}</span>
                  <span className="text-slate-400">{formatDateTime(entry.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Damage - only for delivered orders */}
      {order.status === 'delivered' && (
        <div className="mt-6">
          {existingClaim ? (
            <div className="card p-6 text-center">
              <UIMediaRenderer mediaKey="damage" size="lg" className="mx-auto mb-3" />
              <h3 className="font-bold flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Damage Claim Submitted
              </h3>
              <p className="text-sm text-slate-500">
                Your claim is currently <span className="font-medium capitalize">{existingClaim.status.replace(/_/g, ' ')}</span>.
                Our team will contact you shortly.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowDamageForm(true)}
              className="card p-6 w-full text-left hover:ring-1 hover:ring-red-500/20 transition-all"
            >
              <h3 className="font-bold flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> Report Package Damage
              </h3>
              <p className="text-sm text-slate-500 mt-1">Package arrived broken? Click here to file a damage claim.</p>
            </button>
          )}
        </div>
      )}

      {/* Damage Claim Modal */}
      <AnimatePresence>
        {showDamageForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDamageForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" /> Package Arrived Broken
                </h2>
                <button onClick={() => setShowDamageForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  To help us process your claim quickly, an <strong>unboxing video is required</strong>.
                  Claims without a clear, continuous unboxing video may not be eligible for replacement or refund.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unboxing Video (MP4, MOV, WEBM - max 100MB)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={(e) => setDamageForm({ ...damageForm, videoFile: e.target.files?.[0] ?? null })}
                    className="input-field text-sm"
                  />
                  {damageForm.videoFile && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <FileVideo className="w-3 h-3" /> {damageForm.videoFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Photos of Damaged Product</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setDamageForm({ ...damageForm, photoFiles: Array.from(e.target.files ?? []) })}
                    className="input-field text-sm"
                  />
                  {damageForm.photoFiles.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">{damageForm.photoFiles.length} photo(s) selected</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Photo of Shipping Label (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDamageForm({ ...damageForm, labelFile: e.target.files?.[0] ?? null })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    value={damageForm.description}
                    onChange={(e) => setDamageForm({ ...damageForm, description: e.target.value })}
                    placeholder="Describe the damage..."
                    className="input-field min-h-[80px] resize-y text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmitDamage}
                  disabled={uploading}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Submit Damage Claim</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
