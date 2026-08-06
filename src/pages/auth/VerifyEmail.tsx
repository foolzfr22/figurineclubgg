import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, ArrowRight, Info, Sparkles } from 'lucide-react';

export default function VerifyEmail() {
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

        <div className="glass-strong rounded-3xl p-8 sm:p-10 shadow-xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-5"
          >
            <MailCheck className="w-8 h-8 text-white" />
          </motion.div>

          <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Email verification</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            If email confirmation is enabled, check your inbox for a verification link to activate your account.
          </p>

          <div className="flex items-start gap-2 p-3 mb-6 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-left">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
            <p className="text-sm text-primary-700 dark:text-primary-300">
              Email confirmation is typically turned off for this project, so you can usually sign in right away without verifying.
            </p>
          </div>

          <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
            Continue to sign in
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
