import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const colors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const playToastSound = (type: ToastType) => {
    try {
      const stored = localStorage.getItem('fc_ui_sounds');
      if (!stored) return;
      const config = JSON.parse(stored);
      if (!config.master_enabled) return;
      const soundKey = type === 'error' ? 'error' : 'notification';
      const entry = config.sounds?.[soundKey];
      if (!entry?.enabled || !entry?.url) return;
      const volume = (entry.volume / 100) * (config.master_volume / 100);
      const audio = new Audio(entry.url);
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.play().catch(() => {});
    } catch { /* noop */ }
  };

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    playToastSound(type);
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className="glass-strong rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-xl animate-slide-up max-w-sm pointer-events-auto"
            >
              <Icon className={`w-5 h-5 ${colors[t.type]} flex-shrink-0`} />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
