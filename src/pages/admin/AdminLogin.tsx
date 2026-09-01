import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fromError = (location.state as { error?: string } | null)?.error;

  useEffect(() => {
    if (user && isAdmin) navigate('/admin');
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      // Check admin status after login
      setTimeout(() => {
        window.location.href = '/admin';
      }, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to the Figure Club dashboard</p>
          </div>

          {fromError === 'not_admin' && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>This account does not have admin privileges.</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="admin@figureclub.com"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-500 hover:to-accent-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-xs text-slate-500 space-y-2">
              <p className="font-medium text-slate-400">How to create the first admin:</p>
              <p>1. Register a customer account at <Link to="/register" className="text-primary-400 hover:underline">/register</Link></p>
              <p>2. Go to your Supabase Dashboard (SQL Editor)</p>
              <p>3. Run: <code className="px-1.5 py-0.5 rounded bg-slate-800 text-primary-400">INSERT INTO admin_users (user_id) VALUES ('YOUR-USER-ID');</code></p>
              <p>4. Sign in here with that account</p>
            </div>
          </div>

          <Link to="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
