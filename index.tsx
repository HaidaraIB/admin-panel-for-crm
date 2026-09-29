
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { I18nProvider } from './context/i18n';
import { ThemeProvider } from './context/ThemeContext';
import { AuditLogProvider } from './context/AuditLogContext';
import { UserProvider } from './context/UserContext';
import { RealtimeGate } from './components/RealtimeGate';
import { AlertProvider } from './context/AlertContext';
import { ToastProvider } from './context/ToastContext';
import { installInputAutoDir } from './utils/inputAutoDir';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

installInputAutoDir();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <UserProvider>
            <RealtimeGate>
              <ToastProvider>
                <AlertProvider>
                  <AuditLogProvider>
                    <App />
                  </AuditLogProvider>
                </AlertProvider>
              </ToastProvider>
            </RealtimeGate>
          </UserProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);