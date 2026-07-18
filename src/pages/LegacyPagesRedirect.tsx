import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Map legacy /pages/*.html bookmarks → SPA routes, keep hash/query.
 */
export default function LegacyPagesRedirect() {
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    const path = loc.pathname.toLowerCase();
    let target = '/';
    if (path.includes('gate')) target = '/gate';
    else if (path.includes('drive')) target = '/drive';
    else if (path.includes('view')) target = '/view';
    else if (path.includes('download')) target = '/download';
    nav(`${target}${loc.search}${loc.hash}`, { replace: true });
  }, [loc.pathname, loc.search, loc.hash, nav]);

  return (
    <div className="gate-page" style={{ display: 'grid', placeItems: 'center' }}>
      <p className="gate-sub">Redirecting…</p>
    </div>
  );
}
