import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Film, Upload, Trash2, RotateCcw, Eye, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UIMedia } from '@/types';

const MEDIA_KEYS: { key: string; label: string; description: string }[] = [
  { key: 'success', label: 'Order Success', description: 'Shown on order success page and thank you screen' },
  { key: 'cancellation', label: 'Cancellation', description: 'Shown when an order is cancelled' },
  { key: 'damage', label: 'Damage Claim', description: 'Shown on the package damage report form' },
  { key: 'empty_cart', label: 'Empty Cart', description: 'Shown when the cart is empty' },
  { key: 'empty_wishlist', label: 'Empty Wishlist', description: 'Shown when the wishlist is empty' },
  { key: 'no_results', label: 'No Search Results', description: 'Shown when no products match the search' },
  { key: 'offline_error', label: 'Offline / Error', description: 'Shown on network error or offline state' },
  { key: 'not_found', label: 'Page Not Found', description: 'Shown on the 404 page' },
];

const ACCEPTED_TYPES = '.gif,.json,.mp4,.webm,.webp';

function detectMediaType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'json') return 'lottie';
  if (ext === 'gif') return 'gif';
  if (ext === 'webp') return 'webp';
  if (ext === 'mp4') return 'mp4';
  if (ext === 'webm') return 'webm';
  return 'none';
}

export default function AdminUIMedia() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mediaList, setMediaList] = useState<UIMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<UIMedia | null>(null);

  const fetchMedia = useCallback(async () => {
    const { data } = await supabase.from('ui_media').select('*').order('key');
    setMediaList((data as UIMedia[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    const mediaType = detectMediaType(file.name);
    const filePath = `${key}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('ui-media')
      .upload(filePath, file);

    if (uploadError) {
      toast('Upload failed', 'error');
      setUploadingKey(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('ui-media').getPublicUrl(filePath);

    const { error } = await supabase
      .from('ui_media')
      .update({ media_url: urlData.publicUrl, media_type: mediaType, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      toast('Failed to save media', 'error');
    } else {
      toast('Media updated successfully', 'success');
      await supabase.from('admin_activity_log').insert({
        admin_email: user?.email ?? 'admin',
        action: `Updated UI media for ${key}`,
        entity_type: 'ui_media',
      });
      fetchMedia();
    }
    setUploadingKey(null);
  };

  const handleDelete = async (key: string) => {
    const { error } = await supabase
      .from('ui_media')
      .update({ media_url: null, media_type: 'none', updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      toast('Failed to reset media', 'error');
    } else {
      toast('Media reset to default', 'info');
      fetchMedia();
    }
  };

  const renderPreview = (media: UIMedia) => {
    if (!media.media_url || media.media_type === 'none') {
      return <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">Default</div>;
    }
    if (media.media_type === 'gif' || media.media_type === 'webp') {
      return <img src={media.media_url} alt={media.label} className="w-16 h-16 rounded-xl object-contain" />;
    }
    if (media.media_type === 'mp4' || media.media_type === 'webm') {
      return <video src={media.media_url} autoPlay loop muted playsInline className="w-16 h-16 rounded-xl object-contain" />;
    }
    if (media.media_type === 'lottie') {
      return <LottiePreview url={media.media_url} className="w-16 h-16" />;
    }
    return <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />;
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
        <Film className="w-7 h-7 text-primary-500" /> UI Media Manager
      </h1>
      <p className="text-sm text-slate-500 mb-6">Upload custom animations (GIF, Lottie .json, MP4, WebM) for key website moments. Leave empty to use the default icon animation.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MEDIA_KEYS.map((item, i) => {
          const media = mediaList.find((m) => m.key === item.key);
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {media && renderPreview(media)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{item.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <label className={`text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white inline-flex items-center gap-1 cursor-pointer hover:bg-primary-700 transition-colors ${uploadingKey === item.key ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingKey === item.key ? (
                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-3 h-3" /> Upload</>
                      )}
                      <input
                        type="file"
                        accept={ACCEPTED_TYPES}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(item.key, file);
                        }}
                      />
                    </label>
                    {media?.media_url && media.media_type !== 'none' && (
                      <>
                        <button
                          onClick={() => setPreviewItem(media)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 inline-flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                        <button
                          onClick={() => handleDelete(item.key)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 inline-flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore Default
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Full Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl p-8 max-w-lg w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{previewItem.label} Preview</h3>
              <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center py-8">
              {previewItem.media_type === 'gif' || previewItem.media_type === 'webp' ? (
                <img src={previewItem.media_url!} alt={previewItem.label} className="w-48 h-48 object-contain" />
              ) : previewItem.media_type === 'mp4' || previewItem.media_type === 'webm' ? (
                <video src={previewItem.media_url!} autoPlay loop muted playsInline className="w-48 h-48 object-contain" />
              ) : previewItem.media_type === 'lottie' ? (
                <LottiePreview url={previewItem.media_url!} className="w-48 h-48" />
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function LottiePreview({ url, className }: { url: string; className: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let anim: { destroy?: () => void } | undefined;
    (async () => {
      try {
        const lottieWeb = await import('lottie-web');
        const response = await fetch(url);
        const animationData = await response.json();
        if (cancelled || !containerRef.current) return;
        anim = lottieWeb.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });
      } catch { /* noop */ }
    })();
    return () => {
      cancelled = true;
      anim?.destroy?.();
    };
  }, [url]);

  return <div ref={containerRef} className={className} />;
}
