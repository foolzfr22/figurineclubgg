import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UIMedia, UISounds, SoundKey, UIMediaKey } from '@/types';

interface UIMediaContextValue {
  media: Record<string, UIMedia>;
  sounds: UISounds | null;
  loading: boolean;
  getMediaUrl: (key: UIMediaKey) => string | null;
  getMediaType: (key: UIMediaKey) => string;
  playSound: (key: SoundKey) => void;
}

const UIMediaContext = createContext<UIMediaContextValue | undefined>(undefined);

export function UIMediaProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<Record<string, UIMedia>>({});
  const [sounds, setSounds] = useState<UISounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioCache, setAudioCache] = useState<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    (async () => {
      const [mediaRes, soundsRes] = await Promise.all([
        supabase.from('ui_media').select('*'),
        supabase.from('ui_sounds').select('*').eq('id', 1).maybeSingle(),
      ]);
      const mediaMap: Record<string, UIMedia> = {};
      (mediaRes.data as UIMedia[] | null)?.forEach((m) => {
        mediaMap[m.key] = m;
      });
      setMedia(mediaMap);
      setSounds(soundsRes.data as UISounds | null);
      // Cache sounds in localStorage for non-context consumers (CartContext, ToastContext)
      if (soundsRes.data) {
        localStorage.setItem('fc_ui_sounds', JSON.stringify(soundsRes.data));
      }
      setLoading(false);
    })();
  }, []);

  const getMediaUrl = useCallback((key: UIMediaKey): string | null => {
    return media[key]?.media_url ?? null;
  }, [media]);

  const getMediaType = useCallback((key: UIMediaKey): string => {
    return media[key]?.media_type ?? 'none';
  }, [media]);

  const playSound = useCallback((key: SoundKey) => {
    if (!sounds || !sounds.master_enabled) return;
    const entry = sounds.sounds[key];
    if (!entry || !entry.enabled || !entry.url) return;

    const effectiveVolume = (entry.volume / 100) * (sounds.master_volume / 100);

    let audio = audioCache[key];
    if (!audio || audio.src !== entry.url) {
      audio = new Audio(entry.url);
      audio.preload = 'auto';
      setAudioCache((prev) => ({ ...prev, [key]: audio }));
    }
    audio.volume = Math.min(1, Math.max(0, effectiveVolume));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [sounds, audioCache]);

  return (
    <UIMediaContext.Provider value={{ media, sounds, loading, getMediaUrl, getMediaType, playSound }}>
      {children}
    </UIMediaContext.Provider>
  );
}

export function useUIMedia() {
  const ctx = useContext(UIMediaContext);
  if (!ctx) throw new Error('useUIMedia must be used within UIMediaProvider');
  return ctx;
}
