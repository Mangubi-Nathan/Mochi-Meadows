import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { warmOfflineBundle } from './game/offlineStore';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new Event('mm2-offline-ready'));
      warmOfflineBundle();
    },
    onRegisteredSW() {
      warmOfflineBundle();
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
