import { useEffect, useRef, useState } from 'react';

export default function ResinPrinter3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [printProgress, setPrintProgress] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrintProgress((prev) => (prev >= 100 ? 0 : prev + 0.4));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      setMouseX(Math.max(-1, Math.min(1, dx)));
      setMouseY(Math.max(-1, Math.min(1, dy)));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  const tiltX = isMobile ? 0 : mouseY * -6;
  const tiltY = isMobile ? 0 : mouseX * 8;

  const figureHeight = (printProgress / 100) * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md mx-auto"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary-500/15 via-accent-500/5 to-transparent rounded-full blur-3xl scale-125 pointer-events-none" />

      <div
        className="relative"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Printer frame */}
        <div className="relative mx-auto" style={{ width: '280px', height: '380px' }}>
          {/* Base */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-2xl"
            style={{
              width: '260px',
              height: '40px',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Base LED strip */}
            <div
              className="absolute bottom-2 left-4 right-4 h-0.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #3b82f6, #0ea5e9, #3b82f6, transparent)',
                boxShadow: '0 0 8px rgba(59,130,246,0.6)',
                animation: 'glow 4s ease-in-out infinite',
              }}
            />
          </div>

          {/* Left vertical rail */}
          <div
            className="absolute rounded-lg"
            style={{
              left: '10px',
              top: '20px',
              width: '12px',
              height: '320px',
              background: 'linear-gradient(180deg, #334155, #1e293b)',
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4), 1px 0 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Rail LED */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.3), transparent)',
              }}
            />
          </div>

          {/* Right vertical rail */}
          <div
            className="absolute rounded-lg"
            style={{
              right: '10px',
              top: '20px',
              width: '12px',
              height: '320px',
              background: 'linear-gradient(180deg, #334155, #1e293b)',
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4), -1px 0 0 rgba(255,255,255,0.05)',
            }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent, rgba(14,165,233,0.3), transparent)',
              }}
            />
          </div>

          {/* Top crossbar */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-xl"
            style={{
              width: '260px',
              height: '24px',
              background: 'linear-gradient(135deg, #1e293b, #334155, #1e293b)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Top LED indicator */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ boxShadow: '0 0 6px rgba(59,130,246,0.8)', animation: 'pulse-slow 2s ease-in-out infinite' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            </div>
          </div>

          {/* Print chamber (transparent) */}
          <div
            className="absolute rounded-xl overflow-hidden"
            style={{
              left: '28px',
              top: '28px',
              width: '224px',
              height: '304px',
              background: 'linear-gradient(180deg, rgba(59,130,246,0.04), rgba(14,165,233,0.06))',
              border: '1px solid rgba(59,130,246,0.15)',
              boxShadow: 'inset 0 0 20px rgba(59,130,246,0.06), 0 0 30px rgba(59,130,246,0.1)',
              backdropFilter: 'blur(2px)',
            }}
          >
            {/* Glass reflection sweep */}
            <div
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.03) 100%)',
              }}
            />

            {/* Resin vat (top layer) */}
            <div
              className="absolute top-0 left-0 right-0"
              style={{
                height: '20px',
                background: 'linear-gradient(180deg, rgba(59,130,246,0.12), rgba(14,165,233,0.08))',
                borderBottom: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              {/* Resin surface ripple */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)',
                  animation: 'shimmer 3s linear infinite',
                }}
              />
            </div>

            {/* Print platform (moves down as printing progresses) */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: `${20 + (printProgress / 100) * 240}px`,
                width: '180px',
                height: '6px',
                background: 'linear-gradient(180deg, #475569, #334155)',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(59,130,246,0.15)',
                transition: 'top 0.08s linear',
              }}
            >
              {/* Platform hangers */}
              <div className="absolute -top-284 left-2 w-1 bg-slate-600 rounded" style={{ height: '284px', opacity: 0.3 }} />
              <div className="absolute -top-284 right-2 w-1 bg-slate-600 rounded" style={{ height: '284px', opacity: 0.3 }} />
            </div>

            {/* The figure being printed */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-3"
              style={{
                width: '80px',
                height: `${figureHeight * 2.5}px`,
                maxHeight: '250px',
                overflow: 'hidden',
                transition: 'height 0.08s linear',
              }}
            >
              {/* Stylized collectible figure silhouette */}
              <svg
                viewBox="0 0 80 250"
                className="w-full h-full"
                preserveAspectRatio="xMidYMax meet"
                style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.2))' }}
              >
                <defs>
                  <linearGradient id="figGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="figHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>

                {/* Base platform of figure */}
                <ellipse cx="40" cy="245" rx="32" ry="5" fill="#1e293b" opacity="0.8" />
                <rect x="12" y="230" width="56" height="15" rx="3" fill="url(#figGrad)" />

                {/* Legs */}
                <path d="M28 230 L26 180 Q26 175 30 175 L36 175 L36 230 Z" fill="url(#figGrad)" />
                <path d="M52 230 L54 180 Q54 175 50 175 L44 175 L44 230 Z" fill="url(#figGrad)" />

                {/* Torso */}
                <path d="M24 175 Q22 140 30 135 L50 135 Q58 140 56 175 Z" fill="url(#figGrad)" />
                <path d="M24 175 Q22 140 30 135 L50 135 Q58 140 56 175 Z" fill="url(#figHighlight)" opacity="0.5" />

                {/* Arms */}
                <path d="M24 140 Q18 150 16 170 Q16 175 20 175 L24 175 Z" fill="url(#figGrad)" />
                <path d="M56 140 Q62 150 64 170 Q64 175 60 175 L56 175 Z" fill="url(#figGrad)" />

                {/* Head */}
                <ellipse cx="40" cy="120" rx="14" ry="16" fill="url(#figGrad)" />
                <ellipse cx="36" cy="116" rx="5" ry="7" fill="url(#figHighlight)" opacity="0.4" />

                {/* Hair/crest */}
                <path d="M26 115 Q24 100 30 98 Q35 95 40 96 Q45 95 50 98 Q56 100 54 115 Q54 108 50 106 Q46 104 40 105 Q34 104 30 106 Q26 108 26 115 Z" fill="#1e3a8a" opacity="0.8" />
              </svg>
            </div>

            {/* Layer lines (subtle horizontal lines showing print layers) */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${20 + (printProgress / 100) * 240}px`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
                transition: 'top 0.08s linear',
              }}
            />

            {/* UV light flash (subtle, periodic) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.08), transparent 60%)',
                animation: 'pulse-slow 3s ease-in-out infinite',
              }}
            />
          </div>

          {/* Side control panel */}
          <div
            className="absolute rounded-lg flex flex-col gap-1.5 justify-center p-2"
            style={{
              right: '-4px',
              top: '60px',
              width: '16px',
              height: '60px',
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto" style={{ boxShadow: '0 0 4px rgba(59,130,246,0.8)' }} />
            <div className="w-2 h-2 rounded-full bg-cyan-400 mx-auto" style={{ boxShadow: '0 0 4px rgba(34,211,238,0.8)' }} />
            <div className="w-2 h-2 rounded-full bg-slate-600 mx-auto" />
          </div>

          {/* Bottom shadow / reflection */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: '-12px',
              width: '200px',
              height: '20px',
              background: 'radial-gradient(ellipse, rgba(59,130,246,0.15), transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        </div>

        {/* Progress label */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ boxShadow: '0 0 6px rgba(59,130,246,0.8)', animation: 'pulse-slow 2s ease-in-out infinite' }} />
          <span className="text-slate-600 dark:text-slate-400">Printing</span>
          <span className="text-primary-600 dark:text-primary-400">{Math.floor(printProgress)}%</span>
        </div>
      </div>
    </div>
  );
}
