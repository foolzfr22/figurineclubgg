import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Check your email</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                We&apos;ve sent a password reset link to <span className="font-medium text-slate-900 dark:text-white">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <Link to="/login" className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Forgot password?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
