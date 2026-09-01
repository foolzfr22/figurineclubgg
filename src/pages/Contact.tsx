import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle, Send, Instagram, Facebook, Youtube, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.579.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4612-.6304.8731-1.2952 1.2269-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0784.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276c-.598.3505-1.22.6523-1.873.8947a.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.2256 1.9932a.076.076 0 00.0842.0287c1.9625-.6067 3.9518-1.5222 6.0045-3.0294a.0779.0779 0 00.0313-.0555c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

export default function Contact() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const { user, profile } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const whatsappNumber = settings?.whatsapp_number?.replace(/\D/g, '') ?? '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !body.trim()) {
      toast('Please fill in all required fields.', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('messages').insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || null,
      body: body.trim(),
      is_read: false,
    });
    setSubmitting(false);
    if (error) {
      toast('Failed to send message. Please try again.', 'error');
      return;
    }
    toast('Message sent! We will get back to you soon.', 'success');
    setName(profile?.full_name ?? '');
    setEmail(user?.email ?? '');
    setSubject('');
    setBody('');
  };

  const contactCards = [
    {
      icon: Mail,
      label: 'Email',
      value: settings?.support_email,
      href: settings?.support_email ? `mailto:${settings.support_email}` : null,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: settings?.support_phone,
      href: settings?.support_phone ? `tel:${settings.support_phone.replace(/\s/g, '')}` : null,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: settings?.whatsapp_number,
      href: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
    },
  ];

  const socials = [
    { icon: Instagram, label: 'Instagram', url: settings?.instagram_url },
    { icon: Facebook, label: 'Facebook', url: settings?.facebook_url },
    { icon: Youtube, label: 'YouTube', url: settings?.youtube_url },
    { icon: DiscordIcon, label: 'Discord', url: settings?.discord_url },
  ].filter((s) => s.url);

  return (
    <div className="section-padding py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gradient">Get in Touch</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Have a question about a figure, a custom request, or your order? We would love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact info */}
          <div className="space-y-4">
            {contactCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="card card-hover p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                    {card.href && card.value ? (
                      <a href={card.href} className="font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors break-words">
                        {card.value}
                      </a>
                    ) : (
                      <p className="font-medium text-slate-400">Not available</p>
                    )}
                  </div>
                </div>
              );
            })}

            {socials.length > 0 && (
              <div className="card p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Follow us</p>
                <div className="flex gap-3">
                  {socials.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className="w-11 h-11 rounded-xl glass flex items-center justify-center hover:scale-110 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Business Hours</p>
                <p className="font-medium">Mon - Sat: 10am - 7pm IST</p>
                <p className="text-sm text-slate-500">Sun: Closed</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="glass-strong rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this about?"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Message *</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="input-field resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
