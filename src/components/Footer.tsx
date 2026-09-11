import { Link } from 'react-router-dom';
import { Package, Instagram, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.579.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4612-.6304.8731-1.2952 1.2269-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0784.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276c-.598.3505-1.22.6523-1.873.8947a.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.2256 1.9932a.076.076 0 00.0842.0287c1.9625-.6067 3.9518-1.5222 6.0045-3.0294a.0779.0779 0 00.0313-.0555c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="relative mt-20 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-100/80 dark:via-slate-900/50 dark:to-slate-950/80" />
      <div className="absolute -top-40 left-1/4 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />

      <div className="section-padding py-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">{settings?.business_name || 'Figure Club'}</span>
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mb-6">
              {settings?.footer_text || 'Premium resin anime and gaming figures. Hand-crafted collectibles for passionate collectors.'}
            </p>
            <div className="flex gap-3">
              {settings?.instagram_url && (
                <SocialLink href={settings.instagram_url} label="Instagram"><Instagram className="w-4 h-4" /></SocialLink>
              )}
              {settings?.facebook_url && (
                <SocialLink href={settings.facebook_url} label="Facebook"><Facebook className="w-4 h-4" /></SocialLink>
              )}
              {settings?.youtube_url && (
                <SocialLink href={settings.youtube_url} label="YouTube"><Youtube className="w-4 h-4" /></SocialLink>
              )}
              {settings?.discord_url && (
                <SocialLink href={settings.discord_url} label="Discord"><DiscordIcon className="w-4 h-4" /></SocialLink>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link to="/shop" className="hover:text-primary-600 transition-colors">All Products</Link></li>
              <li><Link to="/shop?filter=new" className="hover:text-primary-600 transition-colors">New Arrivals</Link></li>
              <li><Link to="/shop?filter=bestseller" className="hover:text-primary-600 transition-colors">Best Sellers</Link></li>
              <li><Link to="/shop?filter=limited" className="hover:text-primary-600 transition-colors">Limited Editions</Link></li>
              <li><Link to="/track-order" className="hover:text-primary-600 transition-colors">Track Order</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Support & Policies</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link></li>
              <li><Link to="/page/privacy-policy" className="hover:text-primary-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/page/terms" className="hover:text-primary-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/page/refund-policy" className="hover:text-primary-600 transition-colors">Refund Policy</Link></li>
              <li><Link to="/page/shipping-info" className="hover:text-primary-600 transition-colors">Shipping Info</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Get in Touch</h4>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              {settings?.support_email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0 text-primary-500" />
                  <a href={`mailto:${settings.support_email}`} className="hover:text-primary-600 transition-colors">{settings.support_email}</a>
                </li>
              )}
              {settings?.support_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 text-primary-500" />
                  <a href={`tel:${settings.support_phone}`} className="hover:text-primary-600 transition-colors">{settings.support_phone}</a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 text-primary-500" />
                <span>{settings?.business_address || 'Kolkata, India'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            {settings?.copyright_text || `(c) ${new Date().getFullYear()} ${settings?.business_name || 'Figure Club'}. All rights reserved.`}
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link to="/page/privacy-policy" className="hover:text-primary-600 transition-colors">Privacy Policy</Link>
            <Link to="/page/terms" className="hover:text-primary-600 transition-colors">Terms</Link>
            <Link to="/page/refund-policy" className="hover:text-primary-600 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:scale-110 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
    >
      {children}
    </a>
  );
}
