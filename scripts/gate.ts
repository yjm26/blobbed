import { connectWallet, getConnectedWallet } from './aptos-client';
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
  window.location.href = DASHBOARD;
}

async function init() {
  // Already connected → skip gate
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
    /* stay on gate */
  }

  btn?.addEventListener('click', async () => {
    clearError();
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    try {
      const wallet = await connectWallet();
      sessionStorage.setItem('blobbed_wallet', wallet.address);
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
          'Install <a href="https://petra.app/" target="_blank" rel="noopener">Petra</a> then retry';
      }
    }
  });
}

init();
