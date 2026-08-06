import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Settings as SettingsIcon, Image, Truck, Phone, Share2, FileText, MapPin, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Settings } from '@/types';

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: '',
    logo_url: '',
    favicon_url: '',
    banner_url: '',
    shipping_flat: '',
    shipping_free_over: '',
    support_email: '',
    support_phone: '',
    whatsapp_number: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    discord_url: '',
    privacy_policy: '',
    terms: '',
    refund_policy: '',
    production_time: '',
    delivery_time: '',
    dispatch_time: '',
    business_address: '',
    footer_text: '',
    copyright_text: '',
    payment_instructions: '',
    qr_payment_description: '',
    music_enabled: false,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) {
        const s = data as Settings;
        setSettings(s);
        setForm({
          business_name: s.business_name ?? '',
          logo_url: s.logo_url ?? '',
          favicon_url: s.favicon_url ?? '',
          banner_url: s.banner_url ?? '',
          shipping_flat: String(s.shipping_flat ?? 0),
          shipping_free_over: String(s.shipping_free_over ?? 0),
          support_email: s.support_email ?? '',
          support_phone: s.support_phone ?? '',
          whatsapp_number: s.whatsapp_number ?? '',
          instagram_url: s.instagram_url ?? '',
          facebook_url: s.facebook_url ?? '',
          youtube_url: s.youtube_url ?? '',
          discord_url: s.discord_url ?? '',
          privacy_policy: s.privacy_policy ?? '',
          terms: s.terms ?? '',
          refund_policy: s.refund_policy ?? '',
          production_time: s.production_time ?? '',
          delivery_time: s.delivery_time ?? '',
          dispatch_time: s.dispatch_time ?? '',
          business_address: s.business_address ?? '',
          footer_text: s.footer_text ?? '',
          copyright_text: s.copyright_text ?? '',
          payment_instructions: s.payment_instructions ?? '',
          qr_payment_description: s.qr_payment_description ?? '',
          music_enabled: s.music_enabled ?? false,
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url' | 'banner_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    const path = `${field}-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const { error } = await supabase.storage.from('brand-assets').upload(path, file);
    if (error) {
      toast('Upload failed', 'error');
      setUploading(null);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
    setForm((prev) => ({ ...prev, [field]: publicUrl }));
    toast('Image uploaded', 'success');
    setUploading(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updates = {
      business_name: form.business_name,
      logo_url: form.logo_url || null,
      favicon_url: form.favicon_url || null,
      banner_url: form.banner_url || null,
      shipping_flat: parseFloat(form.shipping_flat) || 0,
      shipping_free_over: parseFloat(form.shipping_free_over) || 0,
      support_email: form.support_email || null,
      support_phone: form.support_phone || null,
      whatsapp_number: form.whatsapp_number || null,
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      youtube_url: form.youtube_url || null,
      discord_url: form.discord_url || null,
      privacy_policy: form.privacy_policy || null,
      terms: form.terms || null,
      refund_policy: form.refund_policy || null,
      production_time: form.production_time || null,
      delivery_time: form.delivery_time || null,
      dispatch_time: form.dispatch_time || null,
      business_address: form.business_address || null,
      footer_text: form.footer_text || null,
      copyright_text: form.copyright_text || null,
      payment_instructions: form.payment_instructions || null,
      qr_payment_description: form.qr_payment_description || null,
      music_enabled: form.music_enabled,
    };

    const { error } = await supabase.from('settings').update(updates).eq('id', 1);
    if (error) {
      toast('Failed to save settings', 'error');
    } else {
      toast('Settings saved successfully', 'success');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Settings</h1>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const sections = [
    { icon: SettingsIcon, title: 'Business Info', fields: ['business_name'] },
    { icon: Truck, title: 'Shipping', fields: ['shipping_flat', 'shipping_free_over'] },
    { icon: Phone, title: 'Support Contact', fields: ['support_email', 'support_phone', 'whatsapp_number'] },
    { icon: Share2, title: 'Social Links', fields: ['instagram_url', 'facebook_url', 'youtube_url', 'discord_url'] },
    { icon: FileText, title: 'Policies', fields: ['privacy_policy', 'terms', 'refund_policy'] },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Brand Assets */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary-500" /> Brand Assets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { field: 'logo_url', label: 'Logo' },
              { field: 'favicon_url', label: 'Favicon' },
              { field: 'banner_url', label: 'Banner' },
            ] as const).map(({ field, label }) => (
              <div key={field}>
                <label className="text-sm font-medium mb-1.5 block">{label}</label>
                <div className="relative">
                  {form[field] ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={form[field]}
                        alt={label}
                        className={field === 'favicon_url' ? 'w-full h-24 object-contain bg-slate-50 dark:bg-slate-800' : 'w-full h-24 object-cover'}
                      />
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Upload className="w-5 h-5 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, field)} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-primary-500 transition-colors">
                      {uploading === field ? (
                        <span className="text-xs text-slate-500">Uploading...</span>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500">Upload {label}</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, field)} />
                    </label>
                  )}
                </div>
                <input
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder="Or paste URL"
                  className="input-field mt-2 text-xs"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Business Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary-500" /> Business Info
          </h2>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Name</label>
            <input
              required
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="input-field"
              placeholder="Your business name"
            />
          </div>
        </motion.div>

        {/* Shipping & Delivery */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary-500" /> Shipping & Delivery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Flat Shipping Rate (Rs.)</label>
              <input
                type="number"
                value={form.shipping_flat}
                onChange={(e) => setForm({ ...form, shipping_flat: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Free Shipping Over (Rs.)</label>
              <input
                type="number"
                value={form.shipping_free_over}
                onChange={(e) => setForm({ ...form, shipping_free_over: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Production Time</label>
              <input
                value={form.production_time}
                onChange={(e) => setForm({ ...form, production_time: e.target.value })}
                className="input-field"
                placeholder="e.g. 7-10 Days"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Delivery Time</label>
              <input
                value={form.delivery_time}
                onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
                className="input-field"
                placeholder="e.g. 2-5 Days"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Expected Dispatch Time</label>
              <input
                value={form.dispatch_time}
                onChange={(e) => setForm({ ...form, dispatch_time: e.target.value })}
                className="input-field"
                placeholder="e.g. 1-2 Days"
              />
            </div>
          </div>
        </motion.div>

        {/* Business Address */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" /> Business Address
          </h2>
          <textarea
            value={form.business_address}
            onChange={(e) => setForm({ ...form, business_address: e.target.value })}
            className="input-field min-h-[80px] resize-y text-sm"
            placeholder="Your business physical address..."
          />
        </motion.div>

        {/* Support Contact */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary-500" /> Support Contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Support Email</label>
              <input
                type="email"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="input-field"
                placeholder="support@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Support Phone</label>
              <input
                value={form.support_phone}
                onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">WhatsApp Number</label>
              <input
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </motion.div>

        {/* Social Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-500" /> Social Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Instagram</label>
              <input
                value={form.instagram_url}
                onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                className="input-field"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Facebook</label>
              <input
                value={form.facebook_url}
                onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                className="input-field"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">YouTube</label>
              <input
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                className="input-field"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Discord</label>
              <input
                value={form.discord_url}
                onChange={(e) => setForm({ ...form, discord_url: e.target.value })}
                className="input-field"
                placeholder="https://discord.gg/..."
              />
            </div>
          </div>
        </motion.div>

        {/* Background Music */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary-500" /> Background Music
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setForm({ ...form, music_enabled: !form.music_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.music_enabled ? 'bg-primary-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.music_enabled ? 'translate-x-6' : ''}`} />
              </button>
              <span className="text-sm font-medium">Enable background music for desktop visitors</span>
            </label>
            <a href="/admin/playlist" className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors">
              <Music className="w-4 h-4" /> Manage playlist tracks
            </a>
          </div>
        </motion.div>

        {/* Payment & Footer */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" /> Payment & Footer
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Instructions</label>
              <textarea
                value={form.payment_instructions}
                onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
                className="input-field min-h-[100px] resize-y text-sm"
                placeholder="Payment instructions for customers..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">QR Payment Description</label>
              <textarea
                value={form.qr_payment_description}
                onChange={(e) => setForm({ ...form, qr_payment_description: e.target.value })}
                className="input-field min-h-[80px] resize-y text-sm"
                placeholder="Description shown with QR payment..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Website Footer Text</label>
              <input
                value={form.footer_text}
                onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                className="input-field"
                placeholder="Footer tagline..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Copyright Text</label>
              <input
                value={form.copyright_text}
                onChange={(e) => setForm({ ...form, copyright_text: e.target.value })}
                className="input-field"
                placeholder="© 2024 Figure Club. All rights reserved."
              />
            </div>
          </div>
        </motion.div>

        {/* Policies */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" /> Policies
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Privacy Policy</label>
              <textarea
                value={form.privacy_policy}
                onChange={(e) => setForm({ ...form, privacy_policy: e.target.value })}
                className="input-field min-h-[120px] resize-y text-sm"
                placeholder="Privacy policy text..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Terms & Conditions</label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                className="input-field min-h-[120px] resize-y text-sm"
                placeholder="Terms and conditions text..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Refund Policy</label>
              <textarea
                value={form.refund_policy}
                onChange={(e) => setForm({ ...form, refund_policy: e.target.value })}
                className="input-field min-h-[120px] resize-y text-sm"
                placeholder="Refund policy text..."
              />
            </div>
          </div>
        </motion.div>

        {/* Save button */}
        <div className="sticky bottom-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 w-full justify-center text-sm shadow-lg"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
