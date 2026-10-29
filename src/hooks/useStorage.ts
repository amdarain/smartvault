import { useState, useEffect, useCallback } from 'react';
import { getStorageEstimate, isPersistentStorageGranted, requestPersistentStorage } from '../services/storageService';

interface StorageInfo {
  usageBytes: number | null;
  quotaBytes: number | null;
  usagePercent: number | null;
  isPersistent: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  requestPersistent: () => Promise<boolean>;
}

/**
 * Hook that provides real-time storage usage information from the Storage API.
 */
export function useStorage(): StorageInfo {
  const [usageBytes, setUsageBytes] = useState<number | null>(null);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
  const [isPersistent, setIsPersistent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [estimate, persistent] = await Promise.all([
        getStorageEstimate(),
        isPersistentStorageGranted(),
      ]);
      setUsageBytes(estimate?.usage ?? null);
      setQuotaBytes(estimate?.quota ?? null);
      setIsPersistent(persistent);
    } catch {
      // Storage API not available
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPersistent = useCallback(async (): Promise<boolean> => {
    const granted = await requestPersistentStorage();
    setIsPersistent(granted);
    return granted;
  }, []);

  const usagePercent =
    usageBytes !== null && quotaBytes !== null && quotaBytes > 0
      ? Math.round((usageBytes / quotaBytes) * 100)
      : null;

  return { usageBytes, quotaBytes, usagePercent, isPersistent, isLoading, refresh, requestPersistent };
}
