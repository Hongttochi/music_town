import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startTelemetry } from './services/telemetry';
import { startAnalytics } from './services/analytics';
import './styles/style.css';
import './components/ui/town-ui.css';
import './styles/mobile.css';
import './styles/community-modals.css';
import './styles/modal-typography.css';

startTelemetry();
startAnalytics();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
