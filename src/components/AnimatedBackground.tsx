import { memo, useEffect, useRef } from 'react';

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Skip canvas animation on mobile for performance
    const isMobile = window.innerWidth < 768;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    let animationId: number;
    let particles: Particle[] = [];
    let lastTime = 0;
    const targetFPS = isMobile ? 24 : 30;
    const frameInterval = 1000 / targetFPS;

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; hue: number;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Fewer particles on mobile, more on desktop
      const count = isMobile ? 8 : window.innerWidth < 1200 ? 18 : 25;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        radius: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.25 + 0.08,
        hue: Math.random() > 0.5 ? 200 : 180,
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      // Throttle to target FPS
      const delta = time - lastTime;
      if (delta < frameInterval) return;
      lastTime = time - (delta % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse interaction only on desktop
        if (!isMobile && window.innerWidth >= 1024) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const force = (100 - dist) / 100;
            p.x -= (dx / dist) * force * 0.4;
            p.y -= (dy / dist) * force * 0.4;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections - only on desktop, fewer particles
      if (!isMobile && particles.length <= 25) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 90) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `hsla(200, 80%, 60%, ${(1 - dist / 90) * 0.04})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }
    };

    resize();
    animationId = requestAnimationFrame(animate);
    window.addEventListener('resize', resize);
    if (!isMobile) window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-300 via-dark-200 to-dark-400" />

      {/* Mesh gradient orbs - fewer on mobile via CSS */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] bg-primary-500/8 rounded-full filter blur-[120px] animate-blob" />
      <div
        className="absolute top-1/3 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-accent-500/8 rounded-full filter blur-[120px] animate-blob"
        style={{ animationDelay: '4s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] bg-accent-600/6 rounded-full filter blur-[120px] animate-blob"
        style={{ animationDelay: '8s' }}
      />

      {/* Soft cyan lighting - desktop only */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-cyan-500/3 rounded-full filter blur-[150px] animate-pulse-slow hidden sm:block" />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export default memo(AnimatedBackground);
