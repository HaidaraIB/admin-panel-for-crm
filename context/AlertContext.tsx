import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import AlertDialog from '../components/AlertDialog';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

export interface AlertOptions {
  title?: string;
  variant?: AlertVariant;
}

interface AlertState {
  message: string;
  title?: string;
  variant: AlertVariant;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => void;
  alert: AlertState | null;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const closeAlert = useCallback(() => setAlert(null), []);

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    setAlert({
      message,
      title: options?.title,
      variant: options?.variant ?? 'error',
    });
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, alert, closeAlert }}>
      {children}
      <AlertDialog />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
