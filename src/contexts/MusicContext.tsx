import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MusicTrack } from '@/types';

type RepeatMode = 'off' | 'all' | 'one';

interface MusicContextValue {
  enabled: boolean;
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  isDesktop: boolean;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  selectTrack: (index: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const MusicContext = createContext<MusicContextValue | undefined>(undefined);

const MOBILE_BREAKPOINT = 1024;

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('fc_music_volume');
    return saved !== null ? Number(saved) : 0.3;
  });
  const [muted, setMuted] = useState(() => localStorage.getItem('fc_music_muted') === 'true');
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= MOBILE_BREAKPOINT);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPrefPlay = useRef<boolean>(localStorage.getItem('fc_music_playing') === 'true');
  const shuffleOrder = useRef<number[]>([]);
  const shufflePos = useRef(0);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    (async () => {
      const [settingsRes, tracksRes] = await Promise.all([
        supabase.from('settings').select('music_enabled').eq('id', 1).maybeSingle(),
        supabase.from('music_tracks').select('*').order('sort_order', { ascending: true }),
      ]);
      setEnabled((settingsRes.data as { music_enabled: boolean } | null)?.music_enabled ?? false);
      const loadedTracks = (tracksRes.data as MusicTrack[] | null) ?? [];
      setTracks(loadedTracks);
      const defaultIdx = loadedTracks.findIndex((t) => t.is_default);
      setCurrentIndex(defaultIdx >= 0 ? defaultIdx : 0);
    })();

    const channel = supabase
      .channel('music_tracks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_tracks' }, async () => {
        const { data } = await supabase.from('music_tracks').select('*').order('sort_order', { ascending: true });
        const updated = (data as MusicTrack[] | null) ?? [];
        setTracks(updated);
        const defaultIdx = updated.findIndex((t) => t.is_default);
        setCurrentIndex((prev) => {
          if (prev >= updated.length) return defaultIdx >= 0 ? defaultIdx : 0;
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentTrack = tracks[currentIndex] ?? null;

  const playTrack = useCallback((track: MusicTrack) => {
    if (!audioRef.current || audioRef.current.src !== track.file_url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = muted ? 0 : volume;
      audioRef.current = audio;
    }
    audioRef.current.src = track.file_url;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [muted, volume]);

  useEffect(() => {
    if (!enabled || tracks.length === 0 || !isDesktop) return;
    if (!audioRef.current && currentTrack && userPrefPlay.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = muted ? 0 : volume;
      audioRef.current = audio;
    }
  }, [enabled, tracks, isDesktop, currentTrack, muted, volume]);

  useEffect(() => {
    if (!enabled || !isDesktop) return;
    const handleInteraction = () => {
      if (userPrefPlay.current && currentTrack && audioRef.current && !isPlaying && audioRef.current.paused) {
        audioRef.current.src = currentTrack.file_url;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [enabled, isDesktop, currentTrack, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (shuffle) {
        shufflePos.current += 1;
        if (shufflePos.current >= shuffleOrder.current.length) {
          if (repeat === 'all') {
            shuffleOrder.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
            shufflePos.current = 0;
          } else {
            setIsPlaying(false);
            userPrefPlay.current = false;
            localStorage.setItem('fc_music_playing', 'false');
            return;
          }
        }
        const nextIdx = shuffleOrder.current[shufflePos.current];
        setCurrentIndex(nextIdx);
        playTrack(tracks[nextIdx]);
        return;
      }
      if (currentIndex < tracks.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        playTrack(tracks[nextIdx]);
      } else if (repeat === 'all') {
        setCurrentIndex(0);
        playTrack(tracks[0]);
      } else {
        setIsPlaying(false);
        userPrefPlay.current = false;
        localStorage.setItem('fc_music_playing', 'false');
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeat, shuffle, currentIndex, tracks, playTrack]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack || !isDesktop) return;
    if (!audioRef.current) {
      playTrack(currentTrack);
      userPrefPlay.current = true;
      localStorage.setItem('fc_music_playing', 'true');
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      userPrefPlay.current = false;
      localStorage.setItem('fc_music_playing', 'false');
    } else {
      if (!audioRef.current.src) audioRef.current.src = currentTrack.file_url;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        userPrefPlay.current = true;
        localStorage.setItem('fc_music_playing', 'true');
      }).catch(() => {});
    }
  }, [currentTrack, isPlaying, isDesktop, playTrack]);

  const next = useCallback(() => {
    if (tracks.length === 0 || !isDesktop) return;
    let nextIdx: number;
    if (shuffle) {
      if (shuffleOrder.current.length === 0) {
        shuffleOrder.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
        shufflePos.current = 0;
      }
      shufflePos.current += 1;
      if (shufflePos.current >= shuffleOrder.current.length) {
        shufflePos.current = 0;
      }
      nextIdx = shuffleOrder.current[shufflePos.current];
    } else {
      nextIdx = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0;
    }
    setCurrentIndex(nextIdx);
    playTrack(tracks[nextIdx]);
  }, [tracks, currentIndex, shuffle, isDesktop, playTrack]);

  const prev = useCallback(() => {
    if (tracks.length === 0 || !isDesktop) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    let prevIdx: number;
    if (shuffle) {
      if (shuffleOrder.current.length === 0) {
        shuffleOrder.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
        shufflePos.current = 0;
      }
      shufflePos.current -= 1;
      if (shufflePos.current < 0) shufflePos.current = shuffleOrder.current.length - 1;
      prevIdx = shuffleOrder.current[shufflePos.current];
    } else {
      prevIdx = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    }
    setCurrentIndex(prevIdx);
    playTrack(tracks[prevIdx]);
  }, [tracks, currentIndex, shuffle, isDesktop, playTrack]);

  const selectTrack = useCallback((index: number) => {
    if (!tracks[index] || !isDesktop) return;
    setCurrentIndex(index);
    playTrack(tracks[index]);
    userPrefPlay.current = true;
    localStorage.setItem('fc_music_playing', 'true');
  }, [tracks, isDesktop, playTrack]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    localStorage.setItem('fc_music_volume', String(clamped));
    if (clamped > 0 && muted) {
      setMuted(false);
      localStorage.setItem('fc_music_muted', 'false');
    }
    if (audioRef.current) audioRef.current.volume = clamped;
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const nextVal = !prev;
      localStorage.setItem('fc_music_muted', String(nextVal));
      if (audioRef.current) audioRef.current.volume = nextVal ? 0 : volume;
      return nextVal;
    });
  }, [volume]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const nextVal = !prev;
      if (nextVal) {
        shuffleOrder.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
        shufflePos.current = 0;
      } else {
        shuffleOrder.current = [];
      }
      return nextVal;
    });
  }, [tracks.length]);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  return (
    <MusicContext.Provider value={{
      enabled,
      tracks,
      currentTrack,
      currentIndex,
      isPlaying,
      volume,
      muted,
      shuffle,
      repeat,
      isDesktop,
      togglePlay,
      next,
      prev,
      selectTrack,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
