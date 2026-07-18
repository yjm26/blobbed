document.getElementById('connect-wallet')?.addEventListener('click', () => {
  window.location.href = '/pages/drive.html';
});

document.getElementById('hero-drop-zone')?.addEventListener('click', () => {
  window.location.href = '/pages/drive.html';
});

// Import hero shader
import('./hero-shader').catch(() => {});
// cache bust 1784392645
