import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectWallet, getConnectedWallet, hasAppSession } from '../../scripts/aptos-client';
import BrandLoader from '../components/shared/BrandLoader';
import AegisLogo from '../components/shared/AegisLogo';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function GatePage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState('Connect a wallet to enter');
  const [needPetra, setNeedPetra] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entering, setEntering] = useState(false);
  const [enterLabel, setEnterLabel] = useState('Entering Aegis');

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
          setEnterLabel('Welcome back');
          setEntering(true);
          await sleep(520);
          if (!cancelled) nav('/drive', { replace: true });
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
    setNeedPetra(false);
    setBusy(true);
    setSub('Connecting…');
    try {
      const wallet = await connectWallet();
      if (!wallet?.address) throw new Error('No address returned');
      setSub('Connected');
      setEnterLabel('Entering Aegis');
      setEntering(true);
      await sleep(680);
      nav('/drive', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connect failed';
      setError(msg);
      setSub('Connect a wallet to enter');
      setBusy(false);
      setEntering(false);
      if (/not installed/i.test(msg)) setNeedPetra(true);
    }
  }

  return (
    <div className={`gate-page ${entering ? 'gate-page--leaving' : ''}`}>
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
        <AegisLogo variant="horizontal" className="gate-logo" />
        <AegisLogo variant="icon" className="gate-login-icon" alt="" />
        <p className="gate-sub">{checking ? 'Checking session…' : sub}</p>
        <button
          type="button"
          className={`gate-cta ${busy ? 'gate-cta--pulse' : ''}`}
          disabled={busy || checking || entering}
          onClick={() => void onConnect()}
        >
          {busy ? 'Connecting…' : checking ? '…' : 'Connect wallet'}
        </button>
        <p className="gate-hint">
          {needPetra ? (
            <>
              Install{' '}
              <a href="https://petra.app/" target="_blank" rel="noopener noreferrer">
                Petra
              </a>{' '}
              then retry
            </>
          ) : (
            'Petra or any Aptos wallet · shelbynet'
          )}
        </p>
        {error ? <p className="gate-error">{error}</p> : null}
      </main>

      {entering ? <BrandLoader overlay variant="enter" label={enterLabel} /> : null}
    </div>
  );
}
