import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery session is detected automatically by the Supabase client
  // (detectSessionInUrl: true). Give it a tick to populate the session.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight mb-8 text-slate-900 dark:text-white">
          <Sparkles className="w-6 h-6 text-primary-500" />
          Figure Club
        </Link>

        <div className="glass-strong rounded-3xl p-8 sm:p-10 shadow-xl">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Password updated</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                Continue to sign in
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Set a new password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Choose a new password for your account.
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {!ready && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <span className="w-4 h-4 border-2 border-primary-500/40 border-t-primary-500 rounded-full animate-spin" />
                  Verifying reset link…
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input-field pl-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !ready}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-6 inline-block text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
