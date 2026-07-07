import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import { initErrorTracking } from '@/lib/error-tracking';
import App from './App.tsx';

initErrorTracking('web');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
