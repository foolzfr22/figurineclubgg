import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime, downloadCSV } from '@/lib/utils';
import type { AdminActivityLog } from '@/types';

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const { data } = await supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs((data as AdminActivityLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = () => {
    downloadCSV('admin_activity_log.csv', logs.map((l) => ({
      admin: l.admin_email,
      action: l.action,
      entity: l.entity_type ?? '',
      entity_id: l.entity_id ?? '',
      details: l.details ?? '',
      date: formatDateTime(l.created_at),
    })));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary-500" /> Activity Log
        </h1>
        <button onClick={handleExport} className="btn-secondary text-sm inline-flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">No activity logged yet</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                <th className="p-3 font-medium">Admin</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium hidden md:table-cell">Entity</th>
                <th className="p-3 font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="border-b border-slate-100 dark:border-slate-800/50"
                >
                  <td className="p-3 font-medium text-xs">{log.admin_email}</td>
                  <td className="p-3">{log.action}</td>
                  <td className="p-3 hidden md:table-cell text-slate-500 text-xs">{log.entity_type ?? '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-slate-500 text-xs">{formatDateTime(log.created_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
