import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Upload, Play, Trash2, RotateCcw, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UISounds, SoundKey } from '@/types';

const SOUND_KEYS: { key: SoundKey; label: string }[] = [
  { key: 'order_success', label: 'Order Success' },
  { key: 'cancellation', label: 'Cancellation Request' },
  { key: 'add_to_cart', label: 'Add to Cart' },
  { key: 'remove_from_cart', label: 'Remove from Cart' },
  { key: 'notification', label: 'Notification' },
  { key: 'error', label: 'Error' },
  { key: 'payment_verified', label: 'Payment Verified' },
  { key: 'package_shipped', label: 'Package Shipped' },
  { key: 'package_delivered', label: 'Package Delivered' },
];

const ACCEPTED_AUDIO = '.mp3,.wav,.ogg,.m4a';

export default function AdminUISounds() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sounds, setSounds] = useState<UISounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSounds = useCallback(async () => {
    const { data } = await supabase.from('ui_sounds').select('*').eq('id', 1).maybeSingle();
    setSounds(data as UISounds | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSounds();
  }, [fetchSounds]);

  const updateSounds = async (newSounds: UISounds) => {
    setSaving(true);
    const { error } = await supabase.from('ui_sounds').update({
      master_enabled: newSounds.master_enabled,
      master_volume: newSounds.master_volume,
      sounds: newSounds.sounds,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    if (error) {
      toast('Failed to save', 'error');
    } else {
      setSounds(newSounds);
    }
    setSaving(false);
  };

  const handleUpload = async (key: SoundKey, file: File) => {
    setUploadingKey(key);
    const filePath = `${key}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('ui-sounds').upload(filePath, file);
    if (uploadError) {
      toast('Upload failed', 'error');
      setUploadingKey(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('ui-sounds').getPublicUrl(filePath);

    if (!sounds) { setUploadingKey(null); return; }
    const newSounds = {
      ...sounds,
      sounds: {
        ...sounds.sounds,
        [key]: { ...sounds.sounds[key], url: urlData.publicUrl },
      },
    };
    await updateSounds(newSounds);
    toast('Sound uploaded', 'success');
    setUploadingKey(null);
  };

  const handleDelete = async (key: SoundKey) => {
    if (!sounds) return;
    const newSounds = {
      ...sounds,
      sounds: {
        ...sounds.sounds,
        [key]: { ...sounds.sounds[key], url: null },
      },
    };
    await updateSounds(newSounds);
    toast('Sound reset to default', 'info');
  };

  const handleToggleEnabled = async (key: SoundKey) => {
    if (!sounds) return;
    const newSounds = {
      ...sounds,
      sounds: {
        ...sounds.sounds,
        [key]: { ...sounds.sounds[key], enabled: !sounds.sounds[key].enabled },
      },
    };
    await updateSounds(newSounds);
  };

  const handleVolumeChange = async (key: SoundKey, volume: number) => {
    if (!sounds) return;
    const newSounds = {
      ...sounds,
      sounds: {
        ...sounds.sounds,
        [key]: { ...sounds.sounds[key], volume },
      },
    };
    setSounds(newSounds);
  };

  const handleMasterVolumeChange = (volume: number) => {
    if (!sounds) return;
    setSounds({ ...sounds, master_volume: volume });
  };

  const handleSaveMaster = async () => {
    if (!sounds) return;
    await updateSounds(sounds);
    toast('Sound settings saved', 'success');
  };

  const handlePreview = (url: string, volume: number) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.volume = Math.min(1, (volume / 100) * (sounds?.master_volume ?? 70) / 100);
    audio.play().catch(() => {});
    previewAudioRef.current = audio;
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
        <Volume2 className="w-7 h-7 text-primary-500" /> UI Sound Manager
      </h1>
      <p className="text-sm text-slate-500 mb-6">Upload custom sound effects (MP3, WAV, OGG, M4A) for key website interactions.</p>

      {/* Master Controls */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 mb-6">
        <h2 className="font-bold mb-4">Master Controls</h2>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => {
                if (!sounds) return;
                updateSounds({ ...sounds, master_enabled: !sounds.master_enabled });
              }}
              className={`w-12 h-6 rounded-full transition-colors ${sounds?.master_enabled ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'} relative`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sounds?.master_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm font-medium">{sounds?.master_enabled ? 'Sounds Enabled' : 'Sounds Disabled'}</span>
          </label>
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={sounds?.master_volume ?? 70}
              onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
              className="w-32 accent-primary-600"
            />
            <span className="text-sm text-slate-500 w-10">{sounds?.master_volume ?? 70}%</span>
          </div>
          <button onClick={handleSaveMaster} disabled={saving} className="btn-primary text-sm ml-auto">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </motion.div>

      {/* Sound Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SOUND_KEYS.map((item, i) => {
          const entry = sounds?.sounds[item.key];
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEnabled(item.key)}
                    className={`w-10 h-5 rounded-full transition-colors ${entry?.enabled ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'} relative flex-shrink-0`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${entry?.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className="font-medium text-sm">{item.label}</h3>
                </div>
                {entry?.enabled ? <Volume2 className="w-4 h-4 text-primary-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </div>

              {entry?.url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(entry.url!, entry.volume)}
                      className="text-xs px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 inline-flex items-center gap-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Preview
                    </button>
                    <button
                      onClick={() => handleDelete(item.key)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 inline-flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={entry.volume}
                      onChange={(e) => handleVolumeChange(item.key, parseInt(e.target.value))}
                      className="flex-1 accent-primary-600"
                    />
                    <span className="text-xs text-slate-500 w-8">{entry.volume}%</span>
                  </div>
                </div>
              ) : (
                <label className={`text-xs px-3 py-2 rounded-lg bg-primary-600 text-white inline-flex items-center gap-1 cursor-pointer hover:bg-primary-700 transition-colors ${uploadingKey === item.key ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingKey === item.key ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-3 h-3" /> Upload Sound</>
                  )}
                  <input
                    type="file"
                    accept={ACCEPTED_AUDIO}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(item.key, file);
                    }}
                  />
                </label>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
