import { useState } from 'react';
import { User, Mail, Phone, Camera, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';

export default function AccountProfile() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(path, file, { upsert: true });
    if (uploadError) {
      toast('Failed to upload image', 'error');
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(path);
    await updateProfile({ avatar_url: publicUrl });
    toast('Profile picture updated', 'success');
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName, phone });
    if (error) toast('Failed to update profile', 'error');
    else toast('Profile updated', 'success');
    setSaving(false);
  };

  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
          <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
            {(fullName || user?.email || 'U')[0].toUpperCase()}
          </div>
        )}
        <label className="btn-secondary cursor-pointer inline-flex items-center gap-2">
          <Camera className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Change Photo'}
          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field pl-10" placeholder="Your name" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={user?.email ?? ''} disabled className="input-field pl-10 bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="input-field pl-10" placeholder="Your phone number" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
