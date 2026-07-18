import { connectWallet, getConnectedWallet, hasAppSession } from './aptos-client';
import '../src/style.css';

const DASHBOARD = '/pages/drive.html';

const btn = document.getElementById('connect-btn') as HTMLButtonElement | null;
const errEl = document.getElementById('gate-error');
const subEl = document.getElementById('gate-sub');
const hintEl = document.getElementById('gate-hint');

function showError(msg: string) {
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

function clearError() {
  errEl?.classList.add('hidden');
  if (errEl) errEl.textContent = '';
}

function goDashboard() {
  window.location.replace(DASHBOARD);
}

async function init() {
  // Only skip gate if THIS tab already completed an explicit connect.
  // Do not treat Petra "still authorized" as logged-in after Disconnect.
  if (hasAppSession()) {
    try {
      const existing = await getConnectedWallet();
      if (existing?.address) {
        if (subEl) subEl.textContent = 'Wallet connected';
        if (btn) {
          btn.textContent = 'Entering…';
          btn.disabled = true;
        }
        goDashboard();
        return;
      }
    } catch {
      /* stale session — stay on gate */
    }
    // Stale session flag without live wallet
    sessionStorage.removeItem('blobbed_session');
    sessionStorage.removeItem('blobbed_wallet');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Connect wallet';
  }
  if (subEl) subEl.textContent = 'Connect a wallet to enter';

  btn?.addEventListener('click', async () => {
    clearError();
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    try {
      // Always interactive connect from the button
      const wallet = await connectWallet();
      if (!wallet?.address) throw new Error('No address returned');
      if (subEl) subEl.textContent = 'Connected';
      btn.textContent = 'Entering…';
      goDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connect failed';
      showError(msg);
      btn.disabled = false;
      btn.textContent = 'Connect wallet';
      if (hintEl && /not installed/i.test(msg)) {
        hintEl.innerHTML =
          'Install <a href="https://petra.app/" target="_blank" rel="noopener">Petra</a> (Wallet Standard) then retry';
      }
    }
  });
}

init();
