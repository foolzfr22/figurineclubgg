import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, X, MessageSquare, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime, cn } from '@/lib/utils';
import type { DamageClaim, Order } from '@/types';

export default function AdminDamageClaims() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [claims, setClaims] = useState<(DamageClaim & { order?: Order })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<(DamageClaim & { order?: Order }) | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchClaims = async () => {
    const { data } = await supabase
      .from('damage_claims')
      .select('*, order:orders(*, order_items(*))')
      .order('created_at', { ascending: false });
    setClaims((data as (DamageClaim & { order?: Order })[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApprove = async (claim: DamageClaim & { order?: Order }) => {
    const { error } = await supabase.from('damage_claims').update({ status: 'approved', admin_note: adminNote || null }).eq('id', claim.id);
    if (error) {
      toast('Failed to approve claim', 'error');
      return;
    }
    // Update order status
    if (claim.order) {
      await supabase.from('orders').update({ status: 'replacement_approved' }).eq('id', claim.order_id);
      await supabase.from('order_timeline').insert({
        order_id: claim.order_id,
        status: 'Replacement Approved',
        admin_email: user?.email ?? null,
        note: adminNote || null,
      });
    }
    await supabase.from('admin_activity_log').insert({
      admin_email: user?.email ?? 'admin',
      action: `Approved damage claim for order ${claim.order?.order_number ?? claim.order_id}`,
      entity_type: 'damage_claim',
      entity_id: claim.id,
    });
    toast('Claim approved - replacement authorized', 'success');
    setSelected(null);
    setAdminNote('');
    fetchClaims();
  };

  const handleReject = async (claim: DamageClaim & { order?: Order }) => {
    const { error } = await supabase.from('damage_claims').update({ status: 'rejected', admin_note: adminNote || null }).eq('id', claim.id);
    if (error) {
      toast('Failed to reject claim', 'error');
      return;
    }
    await supabase.from('admin_activity_log').insert({
      admin_email: user?.email ?? 'admin',
      action: `Rejected damage claim for order ${claim.order?.order_number ?? claim.order_id}`,
      entity_type: 'damage_claim',
      entity_id: claim.id,
    });
    toast('Claim rejected', 'info');
    setSelected(null);
    setAdminNote('');
    fetchClaims();
  };

  const handleRequestInfo = async (claim: DamageClaim & { order?: Order }) => {
    const { error } = await supabase.from('damage_claims').update({ status: 'info_requested', admin_note: adminNote || null }).eq('id', claim.id);
    if (error) {
      toast('Failed to update claim', 'error');
      return;
    }
    toast('More information requested from customer', 'success');
    setSelected(null);
    setAdminNote('');
    fetchClaims();
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info_requested: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
        <AlertTriangle className="w-7 h-7 text-red-500" /> Damage Claims
      </h1>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : claims.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No damage claims</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card p-4 cursor-pointer hover:ring-1 hover:ring-primary-500/20 transition-all"
              onClick={() => { setSelected(claim); setAdminNote(claim.admin_note ?? ''); }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{claim.order?.order_number ?? 'Unknown'}</span>
                    <span className={cn('badge text-xs', statusColors[claim.status])}>{claim.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{claim.description ?? 'No description provided'}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(claim.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {claim.video_url && (
                    <a href={claim.video_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                      <Play className="w-3 h-3" /> Video
                    </a>
                  )}
                  <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                    {claim.photo_urls.length} photos
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
          >
            <h2 className="text-xl font-bold mb-4">Damage Claim - {selected.order?.order_number}</h2>

            {/* Video */}
            {selected.video_url && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-2">Unboxing Video</h3>
                <video src={selected.video_url} controls className="w-full rounded-xl max-h-64" />
              </div>
            )}

            {/* Photos */}
            {selected.photo_urls.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-2">Damage Photos ({selected.photo_urls.length})</h3>
                <div className="grid grid-cols-3 gap-2">
                  {selected.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Damage ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selected.description && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-2">Customer Description</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 p-3 rounded-lg surface-inset">{selected.description}</p>
              </div>
            )}

            {/* Order items */}
            {selected.order?.order_items && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-2">Order Items</h3>
                <div className="space-y-1">
                  {selected.order.order_items.map((item) => (
                    <div key={item.id} className="text-sm flex justify-between">
                      <span>{item.product_name} ×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin note */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-1.5 block">Admin Note</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add internal note about this claim..."
                className="input-field min-h-[80px] resize-y text-sm"
              />
            </div>

            {/* Actions */}
            {selected.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleApprove(selected)} className="btn-primary text-sm inline-flex items-center gap-1">
                  <Check className="w-4 h-4" /> Approve Replacement
                </button>
                <button onClick={() => handleRequestInfo(selected)} className="btn-secondary text-sm inline-flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Request More Info
                </button>
                <button onClick={() => handleReject(selected)} className="text-sm inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
