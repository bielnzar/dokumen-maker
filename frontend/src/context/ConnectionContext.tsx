import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, type HealthStatus } from '../services/api';

interface ConnectionContextType {
  isOnline: boolean | null; // null = checking initially
  isChecking: boolean;
  healthData: HealthStatus | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  checkConnection: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    const start = performance.now();
    try {
      const data = await apiService.healthCheck();
      const elapsed = Math.round(performance.now() - start);
      if (data && (data.status === 'healthy' || data.status === 'ok')) {
        setIsOnline(true);
        setHealthData(data);
        setLatencyMs(elapsed);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
      setHealthData(null);
      setLatencyMs(null);
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkConnection();
    // Poll every 25 seconds
    const interval = setInterval(checkConnection, 25000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        isOnline,
        isChecking,
        healthData,
        latencyMs,
        lastChecked,
        checkConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
