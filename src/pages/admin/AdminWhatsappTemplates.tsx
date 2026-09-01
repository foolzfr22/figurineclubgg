import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Save, RotateCcw, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { WhatsappTemplate } from '@/types';

const PLACEHOLDERS = [
  '{order_id}', '{customer_name}', '{phone}', '{email}', '{address}',
  '{products}', '{quantity}', '{total}', '{website}', '{business_name}',
];

const DEFAULT_TEMPLATE = `Hello {business_name} 👋
I have successfully placed an order.
Order ID: {order_id}
Name: {customer_name}
Products: {products}
Total: {total}
Thank you!`;

export default function AdminWhatsappTemplates() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<WhatsappTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('whatsapp_templates').select('*').eq('id', 1).maybeSingle();
      setTemplate(data as WhatsappTemplate | null);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    const { error } = await supabase.from('whatsapp_templates').update({
      business_name: template.business_name,
      greeting: template.greeting,
      order_confirmation: template.order_confirmation,
      closing_message: template.closing_message,
      support_message: template.support_message,
      template_body: template.template_body,
    }).eq('id', 1);
    if (error) {
      toast('Failed to save template', 'error');
    } else {
      toast('WhatsApp template saved', 'success');
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (!template) return;
    setTemplate({
      ...template,
      business_name: 'Figure Club',
      greeting: 'Hello {business_name} 👋',
      order_confirmation: 'I have successfully placed an order.',
      closing_message: 'Thank you!',
      support_message: 'Please confirm my order.',
      template_body: DEFAULT_TEMPLATE,
    });
    toast('Template reset to default', 'info');
  };

  const insertPlaceholder = (placeholder: string) => {
    if (!template) return;
    setTemplate({ ...template, template_body: template.template_body + ' ' + placeholder });
  };

  const renderPreview = () => {
    if (!template) return '';
    let body = template.template_body;
    body = body.replace(/{business_name}/g, template.business_name || 'Figure Club');
    body = body.replace(/{order_id}/g, 'FC-2024-001');
    body = body.replace(/{customer_name}/g, 'John Doe');
    body = body.replace(/{phone}/g, '+91 98765 43210');
    body = body.replace(/{email}/g, 'john@example.com');
    body = body.replace(/{address}/g, '123 Main St, Mumbai, MH - 400001');
    body = body.replace(/{products}/g, 'Premium Figure x1, Mini Statue x2');
    body = body.replace(/{quantity}/g, '3');
    body = body.replace(/{total}/g, 'Rs. 4,499');
    body = body.replace(/{website}/g, 'figureclub.com');
    return body;
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-green-500" /> WhatsApp Template Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">Customize the message customers send when confirming orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <h2 className="font-bold mb-4">Business Info</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Business Name</label>
                <input
                  value={template?.business_name ?? ''}
                  onChange={(e) => setTemplate({ ...template!, business_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Greeting</label>
                <input
                  value={template?.greeting ?? ''}
                  onChange={(e) => setTemplate({ ...template!, greeting: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Order Confirmation Message</label>
                <input
                  value={template?.order_confirmation ?? ''}
                  onChange={(e) => setTemplate({ ...template!, order_confirmation: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Closing Message</label>
                <input
                  value={template?.closing_message ?? ''}
                  onChange={(e) => setTemplate({ ...template!, closing_message: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Support Message</label>
                <input
                  value={template?.support_message ?? ''}
                  onChange={(e) => setTemplate({ ...template!, support_message: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <h2 className="font-bold mb-4">Template Body</h2>
            <p className="text-xs text-slate-500 mb-3">This is the full message sent via WhatsApp. Use placeholders to auto-fill order data.</p>
            <textarea
              value={template?.template_body ?? ''}
              onChange={(e) => setTemplate({ ...template!, template_body: e.target.value })}
              className="input-field min-h-[200px] resize-y text-sm font-mono"
            />
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Available Placeholders (click to insert):</p>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => insertPlaceholder(p)}
                    className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 cursor-pointer transition-colors text-xs"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary-500" /> Live Preview
              </h2>
              <button
                onClick={() => setPreview(!preview)}
                className="text-xs text-primary-600 hover:underline"
              >
                {preview ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{template?.business_name || 'Figure Club'}</p>
                  <p className="text-xs text-slate-500">WhatsApp Message</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {renderPreview()}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Placeholders are replaced with real order data when the customer clicks "Confirm Order on WhatsApp".
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
