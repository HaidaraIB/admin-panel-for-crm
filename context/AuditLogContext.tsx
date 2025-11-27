
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { AuditLog } from '../types';
import { getSystemAuditLogsAPI } from '../services/api';

interface AuditLogContextType {
  logs: AuditLog[];
  addLog: (actionKey: string, params?: Record<string, string | number>) => void;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

export const AuditLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const addLog = useCallback((actionKey: string, params: Record<string, string | number> = {}) => {
    const newLog: AuditLog = {
      id: Date.now(), // Use timestamp for unique ID
      user: 'admin1@system.com', // Hardcoded for this example
      action: { key: actionKey, params },
      timestamp: new Date().toISOString(),
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  }, []);

  const loadLogs = useCallback(async () => {
    try {
        const response = await getSystemAuditLogsAPI();
        const apiLogs = (response.results || []).map((log: any) => ({
            id: log.id,
            user: log.actor_email || 'system',
            action: { key: log.action, params: log.metadata || {} },
            timestamp: log.created_at,
        })) as AuditLog[];
        setLogs(apiLogs);
    } catch (error) {
        console.error('Failed to load audit logs', error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <AuditLogContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = (): AuditLogContextType => {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditLogProvider');
  }
  return context;
};
