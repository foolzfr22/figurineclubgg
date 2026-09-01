import { useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Music, SkipForward, SkipBack,
  Shuffle, Repeat, Repeat1, ListMusic, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/contexts/MusicContext';

export default function FloatingMusicPlayer() {
  const {
    enabled, tracks, currentTrack, currentIndex, isPlaying,
    volume, muted, shuffle, repeat, isDesktop,
    togglePlay, next, prev, selectTrack, setVolume, toggleMute, toggleShuffle, cycleRepeat,
  } = useMusic();
  const [showPlaylist, setShowPlaylist] = useState(false);

  if (!enabled || !isDesktop || tracks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-5 left-5 z-50 hidden lg:block"
      >
        <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden w-72">
          {/* Main controls */}
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 active:scale-90 transition-all duration-200 flex-shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {currentTrack?.title || 'No track'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  Track {currentIndex + 1} of {tracks.length}
                </p>
              </div>
              <button
                onClick={() => setShowPlaylist((v) => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Toggle playlist"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ListMusic className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={prev}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Previous"
                style={{ color: 'var(--text-secondary)' }}
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Next"
                style={{ color: 'var(--text-secondary)' }}
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="flex-1" />
              <button
                onClick={toggleShuffle}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${shuffle ? 'text-primary-400 bg-primary-500/10' : 'hover:bg-white/10'}`}
                aria-label="Shuffle"
                style={{ color: shuffle ? undefined : 'var(--text-secondary)' }}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${repeat !== 'off' ? 'text-primary-400 bg-primary-500/10' : 'hover:bg-white/10'}`}
                aria-label="Repeat"
                style={{ color: repeat !== 'off' ? undefined : 'var(--text-secondary)' }}
              >
                {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label={muted ? 'Unmute' : 'Mute'}
                style={{ color: 'var(--text-secondary)' }}
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-primary-500 cursor-pointer h-1"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Playlist dropdown */}
          <AnimatePresence>
            {showPlaylist && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t" style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
                  {tracks.map((track, i) => (
                    <button
                      key={track.id}
                      onClick={() => selectTrack(i)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                        i === currentIndex ? 'bg-primary-500/15 text-primary-300' : 'hover:bg-white/5'
                      }`}
                      style={{ color: i === currentIndex ? undefined : 'var(--text-secondary)' }}
                    >
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{track.title}</span>
                      {i === currentIndex && isPlaying && (
                        <span className="flex gap-0.5 items-end h-3">
                          <span className="w-0.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                          <span className="w-0.5 h-2.5 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                          <span className="w-0.5 h-1 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
