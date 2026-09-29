import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, type HealthStatus } from '../services/api';

interface ConnectionContextType {
  isOnline: boolean | null; // null = checking initially
  isChecking: boolean;
  healthData: HealthStatus | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  apiUrl: string;
  checkConnection: () => Promise<void>;
  updateApiUrl: (newUrl: string) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [apiUrl, setApiUrl] = useState<string>(apiService.getBaseURL());

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

  const updateApiUrl = useCallback(async (newUrl: string) => {
    apiService.setBaseURL(newUrl);
    setApiUrl(apiService.getBaseURL());
    await checkConnection();
  }, [checkConnection]);

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
        apiUrl,
        checkConnection,
        updateApiUrl,
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
