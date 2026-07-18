import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { parseShareFragment } from '../../scripts/share';
import { downloadShareItem } from '../../scripts/preview';
import type { ShareFileItem, SharePayload } from '../../scripts/types';

function toItems(p: SharePayload): ShareFileItem[] {
  if (p.type === 'folder') return p.files || [];
  return [
    {
      a: p.a,
      n: p.n,
      k: p.k,
      name: p.name,
      mime: p.mime,
      size: p.size,
    },
  ];
}

/**
 * Legacy /download route — single-file download or bounce to /view for albums.
 */
export default function DownloadPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const [msg, setMsg] = useState('Preparing download…');
  const [err, setErr] = useState('');

  useEffect(() => {
    const hash = loc.hash || window.location.hash;
    const payload = parseShareFragment(hash);
    if (!payload) {
      setErr('Invalid or missing share link.');
      setMsg('Cannot download');
      return;
    }
    if (payload.type === 'folder' && (payload.files?.length || 0) > 1) {
      nav(`/view${hash}`, { replace: true });
      return;
    }
    const items = toItems(payload);
    if (!items.length) {
      setErr('Nothing to download.');
      return;
    }
    (async () => {
      try {
        for (const item of items) {
          setMsg(`Downloading ${item.name}…`);
          await downloadShareItem(item);
        }
        setMsg('Done — check your downloads folder.');
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
        setMsg('Download failed');
      }
    })();
  }, [loc.hash, nav]);

  return (
    <div className="app-page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
        <Link to="/" className="app-brand" style={{ display: 'inline-block', marginBottom: 24 }}>
          BLOBBED
        </Link>
        <h1 className="app-stage-title">{msg}</h1>
        {err ? <p className="gate-error" style={{ display: 'block' }}>{err}</p> : null}
        <p className="app-stage-sub" style={{ marginTop: 16 }}>
          <Link to={`/view${loc.hash}`} className="app-link">
            Open preview instead
          </Link>
        </p>
      </div>
    </div>
  );
}
