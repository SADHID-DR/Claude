import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- SECURITY & ANTI-CLONING ---
if ((import.meta as any).env?.PROD) {
  // Prevent context menu (right click)
  document.addEventListener('contextmenu', e => e.preventDefault());
  
  // Prevent common developer tools shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
      e.preventDefault();
    }
  });

  // Basic Hostname Verification (Prevents naive mirroring on other domains)
  const allowedHostnames = [
    'localhost',
    '127.0.0.1',
    'run.app',
    'studio.google.com',
    // Allowed firebase hostings:
    'web.app',
    'firebaseapp.com',
    'maresgestion.com'
  ];

  const isAllowed = allowedHostnames.some(host => window.location.hostname === host || window.location.hostname.endsWith('.' + host));
  
  if (!isAllowed) {
    document.documentElement.innerHTML = '<h1 style="color:red; text-align:center; margin-top:20%">Acceso Restringido. Clón o dominio no autorizado.</h1>';
    throw new Error("Unauthorized domain");
  }
}
// -------------------------------

// Prevent browser warning / harmless ResizeObserver loop errors with global suppression
window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('ResizeObserver') ||
    e.message === 'ResizeObserver loop completed with undelivered notifications' ||
    e.message === 'ResizeObserver loop limit exceeded'
  )) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
