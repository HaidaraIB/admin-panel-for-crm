
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './context/i18n';
import { ThemeProvider } from './context/ThemeContext';
import { AuditLogProvider } from './context/AuditLogContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AuditLogProvider>
          <App />
        </AuditLogProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>
);