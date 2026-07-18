import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Soft enter on route change. CSS-only. no layout thrash, respects reduced-motion.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [phase, setPhase] = useState<'in' | 'idle'>('in');

  useEffect(() => {
    setPhase('in');
    const id = window.setTimeout(() => setPhase('idle'), 420);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return (
    <div
      className={`page-shell ${phase === 'in' ? 'page-shell--enter' : ''}`}
      data-path={location.pathname}
    >
      {children}
    </div>
  );
}
