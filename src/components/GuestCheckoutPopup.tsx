import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Package, Heart, MapPin, Star, ShoppingBag, Rocket, UserPlus, LogIn } from 'lucide-react';

interface GuestCheckoutPopupProps {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
}

export default function GuestCheckoutPopup({ open, onClose, onContinueAsGuest }: GuestCheckoutPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl w-full max-w-md p-8 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-500/30">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Sign in for a Better Experience</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Signing in lets you:</p>

              <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                <Benefit icon={Package} text="Track your orders" />
                <Benefit icon={Heart} text="Save your wishlist" />
                <Benefit icon={MapPin} text="Save delivery addresses" />
                <Benefit icon={Star} text="Leave reviews" />
                <Benefit icon={ShoppingBag} text="View order history" />
                <Benefit icon={Rocket} text="Enjoy faster checkout" />
              </div>

              <div className="space-y-3">
                <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" /> Sign In / Create Account
                </Link>
                <button onClick={onContinueAsGuest} className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                  Continue as Guest
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Benefit({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl surface-inset">
      <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}
