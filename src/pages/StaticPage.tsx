import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/types';

const SLUG_MAP: Record<string, { title: string; column: keyof Settings }> = {
  'privacy-policy': { title: 'Privacy Policy', column: 'privacy_policy' },
  'terms': { title: 'Terms & Conditions', column: 'terms' },
  'refund-policy': { title: 'Refund Policy', column: 'refund_policy' },
};

export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const config = slug ? SLUG_MAP[slug] : undefined;

  useEffect(() => {
    (async () => {
      if (!config) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('settings')
        .select(config.column)
        .eq('id', 1)
        .maybeSingle();
      const value = data ? (data[config.column as keyof typeof data] as string | null) : null;
      setContent(value);
      setLoading(false);
    })();
  }, [slug, config]);

  if (!config) {
    return (
      <div className="section-padding py-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-slate-500">The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient">{config.title}</h1>
        </div>

        <div className="card p-6 sm:p-10">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 skeleton w-full" style={{ width: `${80 + Math.random() * 20}%` }} />
              ))}
            </div>
          ) : content && content.trim() ? (
            <article
              className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:scroll-mt-20 prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Content Coming Soon</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                We are working on this page. Please check back later or contact us if you have any questions.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
