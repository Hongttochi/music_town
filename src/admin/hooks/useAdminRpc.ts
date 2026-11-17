import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminError, rpc, toError } from '../services/adminRepository';

// Loads an RPC; with `interval` (ms) it reloads while the page is visible.
export function useAdminRpc<T>(name: string, args?: Record<string, unknown>, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const key = JSON.stringify(args ?? {});
  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const next = await rpc<T>(name, JSON.parse(key));
      if (mine === seq.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError(e instanceof AdminError ? e : toError(null));
    }
  }, [name, key]);
  useEffect(() => {
    void load();
    if (!interval) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, interval);
    return () => clearInterval(id);
  }, [load, interval]);
  return { data, error, reload: load };
}
