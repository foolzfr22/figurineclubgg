import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import UIMediaRenderer from '@/components/UIMediaRenderer';

export default function NotFound() {
  return (
    <div className="section-padding py-20 min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto"
      >
        {/* Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="relative mb-8 inline-block"
        >
          <UIMediaRenderer mediaKey="not_found" size="xl" className="mx-auto" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Page Not Found</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Oops! The page you are looking for seems to have wandered off. Let us help you find your way back.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link to="/shop" className="btn-secondary inline-flex items-center gap-2">
            <Search className="w-4 h-4" />
            Browse Shop
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
