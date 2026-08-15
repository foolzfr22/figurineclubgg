import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/types';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: Settings = {
  id: 1,
  business_name: 'Figure Club',
  logo_url: null,
  favicon_url: null,
  banner_url: null,
  shipping_flat: 199,
  shipping_free_over: 5000,
  support_email: 'support@figureclub.com',
  support_phone: '+91 98765 43210',
  whatsapp_number: '919876543210',
  instagram_url: 'https://instagram.com/figureclub',
  facebook_url: 'https://facebook.com/figureclub',
  youtube_url: 'https://youtube.com/@figureclub',
  discord_url: 'https://discord.gg/figureclub',
  privacy_policy: null,
  terms: null,
  refund_policy: null,
  production_time: '7-10 Days',
  delivery_time: '2-5 Days',
  dispatch_time: '1-2 Days',
  business_address: null,
  footer_text: null,
  copyright_text: null,
  payment_instructions: null,
  qr_payment_description: null,
  music_enabled: false,
  updated_at: new Date().toISOString(),
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    setSettings((data as Settings) ?? defaultSettings);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return <SettingsContext.Provider value={{ settings: settings ?? defaultSettings, loading, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
