import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Shield, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    if (!agree) {
      setError('Please accept the terms to continue.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      // Email confirmation is off — account is ready. Show a friendly note.
      setSuccess(true);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      setError(error);
    }
    // On success, OAuth redirect handles navigation.
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-strong rounded-3xl p-8 sm:p-10 shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-success-600 dark:text-success-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Account created</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Welcome to Figure Club, {fullName.split(' ')[0] || 'collector'}! Your account is ready — you can sign in now.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue to sign in
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Branding / Hero — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/30 rounded-full mix-blend-overlay filter blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent-300/40 rounded-full mix-blend-overlay filter blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="w-6 h-6" />
            Figure Club
          </Link>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-4"
            >
              Join the club of collectors
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Create an account to track orders, save your wishlist, and unlock early access to limited drops.
            </motion.p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Secure checkout & encrypted data
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" /> Collector-grade authentic figures
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 text-xl font-bold tracking-tight mb-8 text-slate-900 dark:text-white">
            <Sparkles className="w-6 h-6 text-primary-500" />
            Figure Club
          </Link>

          <div className="glass-strong rounded-3xl p-8 sm:p-10 shadow-xl">
            <h2 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Create account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                Sign in
              </Link>
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
                <label htmlFor="fullName" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="input-field pl-11"
                  />
                </div>
              </div>

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Password
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
                  Confirm password
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

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to the{' '}
                  <Link to="/page/terms" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/page/privacy" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400/40 border-t-slate-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
                </svg>
              )}
              Sign up with Google
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
