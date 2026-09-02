import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import { clearChunkReloadFlag } from '@/lib/chunk-load';
import { initErrorTracking } from '@/lib/error-tracking';
import { initPwaUpdateReload } from '@/lib/pwa-update';
import App from './App.tsx';

initErrorTracking('web');
clearChunkReloadFlag();
initPwaUpdateReload();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
