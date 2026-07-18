import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectWallet, getConnectedWallet, hasAppSession } from '../../scripts/aptos-client';

export default function GatePage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState('Connect a wallet to enter');
  const [hintHtml, setHintHtml] = useState(
    'Petra or any Aptos wallet (testnet)'
  );
  const [checking, setChecking] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasAppSession()) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        const existing = await getConnectedWallet();
        if (existing?.address && !cancelled) {
          setSub('Wallet connected');
          nav('/drive', { replace: true });
          return;
        }
      } catch {
        /* stay */
      }
      sessionStorage.removeItem('blobbed_session');
      sessionStorage.removeItem('blobbed_wallet');
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function onConnect() {
    setError('');
    setBusy(true);
    setSub('Connecting…');
    try {
      const wallet = await connectWallet();
      if (!wallet?.address) throw new Error('No address returned');
      setSub('Connected');
      nav('/drive', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connect failed';
      setError(msg);
      setSub('Connect a wallet to enter');
      setBusy(false);
      if (/not installed/i.test(msg)) {
        setHintHtml(
          'Install <a href="https://petra.app/" target="_blank" rel="noopener">Petra</a> (Wallet Standard) then retry'
        );
      }
    }
  }

  return (
    <div className="gate-page">
      <div className="gate-bg" aria-hidden="true">
        <div className="gate-orb gate-orb-a" />
        <div className="gate-orb gate-orb-b" />
        <div className="gate-orb gate-orb-c" />
        <div className="gate-noise" />
      </div>

      <Link to="/" className="gate-back">
        ← Home
      </Link>

      <main className="gate-center">
        <h1 className="gate-brand">Blobbed</h1>
        <p className="gate-sub">{checking ? 'Checking session…' : sub}</p>
        <button
          type="button"
          className="gate-cta"
          disabled={busy || checking}
          onClick={() => void onConnect()}
        >
          {busy ? 'Connecting…' : checking ? '…' : 'Connect wallet'}
        </button>
        <p
          className="gate-hint"
          dangerouslySetInnerHTML={{ __html: hintHtml }}
        />
        {error ? <p className="gate-error">{error}</p> : null}
      </main>
    </div>
  );
}
