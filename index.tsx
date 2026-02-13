
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './context/i18n';
import { ThemeProvider } from './context/ThemeContext';
import { AuditLogProvider } from './context/AuditLogContext';
import { UserProvider } from './context/UserContext';
import { AlertProvider } from './context/AlertContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <UserProvider>
            <AlertProvider>
              <AuditLogProvider>
                <App />
              </AuditLogProvider>
            </AlertProvider>
          </UserProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);