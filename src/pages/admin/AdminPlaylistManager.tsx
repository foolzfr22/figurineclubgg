import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { MusicTrack } from '@/types';
import {
  Upload, Trash2, Play, Pause, GripVertical, Save, Music, Star, X, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPlaylistManager() {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order', { ascending: true });
    setTracks((data as MusicTrack[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newTracks: MusicTrack[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(mp3|ogg|wav)$/i)) {
        toast(`Skipped ${file.name} — not a valid audio file`, 'error');
        continue;
      }
      const path = `bg-music-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error } = await supabase.storage.from('website-music').upload(path, file);
      if (error) {
        toast(`Failed to upload ${file.name}`, 'error');
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('website-music').getPublicUrl(path);
      const { data: inserted } = await supabase.from('music_tracks').insert({
        title: file.name.replace(/\.[^.]+$/, ''),
        file_url: publicUrl,
        file_path: path,
        sort_order: tracks.length + newTracks.length,
      }).select().single();
      if (inserted) newTracks.push(inserted as MusicTrack);
    }
    if (newTracks.length > 0) {
      setTracks((prev) => [...prev, ...newTracks]);
      toast(`${newTracks.length} track(s) uploaded`, 'success');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (track: MusicTrack) => {
    if (track.file_path) {
      await supabase.storage.from('website-music').remove([track.file_path]);
    }
    await supabase.from('music_tracks').delete().eq('id', track.id);
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    if (previewId === track.id) {
      previewRef.current?.pause();
      setPreviewId(null);
    }
    toast('Track deleted', 'success');
  };

  const handleRename = async (track: MusicTrack) => {
    if (!editTitle.trim()) return;
    await supabase.from('music_tracks').update({ title: editTitle.trim() }).eq('id', track.id);
    setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, title: editTitle.trim() } : t)));
    setEditingId(null);
    toast('Track renamed', 'success');
  };

  const handleSetDefault = async (track: MusicTrack) => {
    await supabase.from('music_tracks').update({ is_default: false }).neq('id', track.id);
    await supabase.from('music_tracks').update({ is_default: true }).eq('id', track.id);
    setTracks((prev) => prev.map((t) => ({ ...t, is_default: t.id === track.id })));
    toast('Default track updated', 'success');
  };

  const togglePreview = (track: MusicTrack) => {
    if (previewId === track.id) {
      previewRef.current?.pause();
      setPreviewId(null);
      return;
    }
    if (previewRef.current) {
      previewRef.current.pause();
    }
    const audio = new Audio(track.file_url);
    audio.volume = 0.5;
    audio.play().then(() => setPreviewId(track.id)).catch(() => {});
    audio.onended = () => setPreviewId(null);
    previewRef.current = audio;
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...tracks];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setTracks(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    const updates = tracks.map((t, i) => supabase.from('music_tracks').update({ sort_order: i }).eq('id', t.id));
    await Promise.all(updates);
    setSaving(false);
    toast('Playlist order saved', 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Playlist Manager</h1>
          <p className="text-sm text-slate-400 mt-1">Manage background music for desktop visitors</p>
        </div>
        <button
          onClick={saveOrder}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {/* Upload zone */}
      <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-slate-700 cursor-pointer hover:border-primary-500 transition-colors mb-6 bg-slate-900/50">
        {uploading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Upload audio files</span>
            <span className="text-xs">MP3, OGG, WAV — multiple files supported</span>
          </div>
        )}
        <input type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" multiple className="hidden" onChange={handleUpload} />
      </label>

      {/* Track list */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No tracks yet. Upload audio files to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tracks.map((track, i) => (
              <motion.div
                key={track.id}
                layout
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                className={`flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border transition-all ${
                  dragOverIndex === i ? 'border-primary-500 scale-[1.02]' : 'border-slate-800'
                } ${dragIndex === i ? 'opacity-40' : ''}`}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Sort order */}
                <span className="text-xs text-slate-500 w-6 text-center flex-shrink-0">{i + 1}</span>

                {/* Play/Pause preview */}
                <button
                  onClick={() => togglePreview(track)}
                  className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 active:scale-90 transition-all flex-shrink-0"
                >
                  {previewId === track.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                {/* Title / Edit */}
                <div className="flex-1 min-w-0">
                  {editingId === track.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(track); if (e.key === 'Escape') setEditingId(null); }}
                        className="input-field text-sm py-1"
                      />
                      <button onClick={() => handleRename(track)} className="w-7 h-7 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors flex-shrink-0">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(track.id); setEditTitle(track.title); }}
                      className="text-sm font-medium truncate text-left hover:text-primary-400 transition-colors"
                    >
                      {track.title}
                    </button>
                  )}
                  {track.is_default && (
                    <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3" fill="currentColor" /> Default first song
                    </span>
                  )}
                </div>

                {/* Default toggle */}
                <button
                  onClick={() => handleSetDefault(track)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                    track.is_default ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/5'
                  }`}
                  title="Set as default first song"
                >
                  <Star className="w-4 h-4" fill={track.is_default ? 'currentColor' : 'none'} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(track)}
                  className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Drag and drop tracks to reorder. Click a track name to rename. Click the star to set the default first song. Don't forget to save the order.
      </p>
    </div>
  );
}
