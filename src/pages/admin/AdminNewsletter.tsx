import { useEffect, useState, useMemo } from 'react';
import { Download, Mail, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { NewsletterSubscriber } from '@/types';
import { formatDate, downloadCSV } from '@/lib/utils';

export default function AdminNewsletter() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSubscribers = async () => {
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    setSubscribers((data as NewsletterSubscriber[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

  const handleExport = () => {
    downloadCSV(
      'newsletter-subscribers.csv',
      subscribers.map((s) => ({
        email: s.email,
        subscribed_date: formatDate(s.created_at),
      }))
    );
    toast('Subscribers exported', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Newsletter</h1>
          {subscribers.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">{subscribers.length} subscriber{subscribers.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="input-field pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No subscribers found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Subscribed Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">{sub.email}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
