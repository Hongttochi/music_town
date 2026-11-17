import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/admin.css';
import { AdminApp } from './app/AdminApp';
import { AdminGate } from './components/auth/AdminGate';
import { applyTheme, loadTheme } from './utils/theme';

// Paint with the saved theme from the first frame to avoid a flash.
applyTheme(loadTheme());

createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminGate>
      <AdminApp />
    </AdminGate>
  </React.StrictMode>,
);
