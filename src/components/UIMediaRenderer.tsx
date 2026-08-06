import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, ShoppingCart, Heart, Search, WifiOff, Package } from 'lucide-react';
import { useUIMedia } from '@/contexts/UIMediaContext';
import type { UIMediaKey } from '@/types';

const DEFAULT_ICONS: Record<UIMediaKey, typeof CheckCircle> = {
  success: CheckCircle,
  cancellation: XCircle,
  damage: AlertTriangle,
  empty_cart: ShoppingCart,
  empty_wishlist: Heart,
  no_results: Search,
  offline_error: WifiOff,
  not_found: Package,
};

const DEFAULT_COLORS: Record<UIMediaKey, string> = {
  success: 'text-green-500',
  cancellation: 'text-red-500',
  damage: 'text-amber-500',
  empty_cart: 'text-slate-400',
  empty_wishlist: 'text-slate-400',
  no_results: 'text-slate-400',
  offline_error: 'text-red-500',
  not_found: 'text-primary-500',
};

interface UIMediaRendererProps {
  mediaKey: UIMediaKey;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function UIMediaRenderer({ mediaKey, className = '', size = 'lg' }: UIMediaRendererProps) {
  const { getMediaUrl, getMediaType } = useUIMedia();
  const url = getMediaUrl(mediaKey);
  const type = getMediaType(mediaKey);
  const lottieRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  // Load Lottie animation dynamically
  useEffect(() => {
    if (type !== 'lottie' || !url || !lottieRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const lottieModule = await import('lottie-react');
        const response = await fetch(url);
        const animationData = await response.json();
        if (!cancelled && lottieRef.current) {
          const { default: Lottie } = lottieModule;
          // We'll render via React in the return instead
          lottieRef.current.innerHTML = '';
          const lottieEl = document.createElement('div');
          lottieRef.current.appendChild(lottieEl);
          // Use the Lottie component via createRoot would be complex; use the web player instead
        }
      } catch {
        // Fallback to default icon
      }
    })();
    return () => { cancelled = true; };
  }, [type, url]);

  if (!url || type === 'none') {
    const Icon = DEFAULT_ICONS[mediaKey];
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className={`${sizeClasses[size]} ${className} flex items-center justify-center`}
      >
        <Icon className={`w-full h-full ${DEFAULT_COLORS[mediaKey]}`} strokeWidth={1.5} />
      </motion.div>
    );
  }

  if (type === 'lottie') {
    return (
      <div ref={lottieRef} className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
        <LottieWrapper url={url} className={sizeClasses[size]} />
      </div>
    );
  }

  if (type === 'gif' || type === 'webp') {
    return <img src={url} alt={mediaKey} className={`${sizeClasses[size]} ${className} object-contain`} />;
  }

  if (type === 'mp4' || type === 'webm') {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className={`${sizeClasses[size]} ${className} object-contain`}
      />
    );
  }

  // Fallback to default icon
  const Icon = DEFAULT_ICONS[mediaKey];
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <Icon className={`w-full h-full ${DEFAULT_COLORS[mediaKey]}`} strokeWidth={1.5} />
    </div>
  );
}

// Lazy-loaded Lottie wrapper to avoid bundling lottie-react for non-lottie users
function LottieWrapper({ url, className }: { url: string; className: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lottieWeb = await import('lottie-web');
        const response = await fetch(url);
        const animationData = await response.json();
        if (cancelled || !containerRef.current) return;
        animationRef.current = lottieWeb.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });
      } catch {
        // silently fail
      }
    })();
    return () => {
      cancelled = true;
      if (animationRef.current && typeof animationRef.current === 'object' && 'destroy' in animationRef.current) {
        (animationRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [url]);

  return <div ref={containerRef} className={className} />;
}
