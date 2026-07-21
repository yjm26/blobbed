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

  const errorDetail = needPetra
    ? 'Petra is required to unlock your encrypted library.'
    : error;

  return (
    <div className="relative min-h-[100svh] min-h-[100dvh] overflow-hidden bg-[#050505] text-[#f5f5f5]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]" aria-hidden="true">
        <div className="absolute -left-[8%] -top-[12%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-[radial-gradient(circle,rgba(80,80,90,0.55)_0%,transparent_70%)] opacity-45 blur-[80px] will-change-transform" />
        <div className="absolute -bottom-[18%] -right-[10%] h-[min(60vw,440px)] w-[min(60vw,440px)] rounded-full bg-[radial-gradient(circle,rgba(120,120,130,0.35)_0%,transparent_70%)] opacity-45 blur-[80px] will-change-transform" />
        <div className="absolute left-[48%] top-[42%] h-[min(40vw,280px)] w-[min(40vw,280px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_70%)] opacity-45 blur-[80px] will-change-transform" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16)_0_1px,transparent_1px)] bg-[length:18px_18px]" />
      </div>

      <Link
        to="/"
        className="fixed left-6 top-5 z-10 text-xs uppercase tracking-[0.12em] text-white/45 no-underline transition-colors duration-150 hover:text-white/85 motion-reduce:transition-none md:left-10 lg:left-14"
      >
        ← Home
      </Link>

      <main
        className={`relative z-[5] flex min-h-[100svh] min-h-[100dvh] flex-col items-center justify-center gap-4 px-5 py-8 text-center transition duration-300 ${entering ? 'pointer-events-none opacity-35 blur-[2px] motion-reduce:blur-none' : ''}`}
      >
        <AegisLogo
          variant="icon"
          className="mb-2.5 !w-[clamp(4.5rem,12vw,6rem)] opacity-95 drop-shadow-[0_18px_42px_rgba(255,255,255,0.08)]"
        />
        <p className="m-0 mb-2 text-[0.95rem] font-light text-white/50">{checking ? 'Checking session…' : sub}</p>
        <button
          type="button"
          className={`mt-3 min-w-48 appearance-none border-0 bg-[#f5f5f5] px-7 py-[0.95rem] font-[inherit] text-xs font-normal uppercase tracking-[0.14em] text-[#050505] transition duration-150 hover:opacity-90 active:scale-[0.985] disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100 ${busy ? 'animate-pulse' : ''}`}
          disabled={busy || checking || entering}
          onClick={() => void onConnect()}
        >
          {busy ? 'Connecting…' : checking ? '…' : 'Connect wallet'}
        </button>
        <p className="m-0 mt-1 text-[0.6875rem] tracking-[0.08em] text-white/30">
          {needPetra ? (
            <>
              Install{' '}
              <a className="text-white/55 underline-offset-4 hover:text-white/80" href="https://petra.app/" target="_blank" rel="noopener noreferrer">
                Petra
              </a>{' '}
              then retry
            </>
          ) : (
            'Petra or any Aptos wallet · shelbynet'
          )}
        </p>
        <p className="m-0 mt-1 max-w-[22rem] text-[0.72rem] leading-[1.5] text-white/38">
          <strong className="font-normal uppercase tracking-[0.12em] text-white/58">Beta Mode</strong>{' '}
          · Uploads are sponsored during beta. Files encrypt locally before relay.
        </p>
        {error ? (
          <div className="mt-3 w-full max-w-[22rem] border border-[rgba(238,132,132,0.18)] bg-[linear-gradient(180deg,rgba(90,36,36,0.16),rgba(20,10,10,0.08)),rgba(255,255,255,0.018)] px-[0.9rem] py-3 text-left" role="alert">
            <span className="mb-1 block text-[0.64rem] font-normal uppercase tracking-[0.13em] text-[rgba(255,190,190,0.72)]">Wallet connection failed</span>
            <p className="m-0 text-[0.78rem] leading-[1.45] text-[rgba(255,210,210,0.72)]">{errorDetail}</p>
          </div>
        ) : null}
      </main>

      {entering ? <BrandLoader overlay variant="enter" label={enterLabel} /> : null}
    </div>
  );
}
