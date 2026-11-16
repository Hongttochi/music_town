import { useEffect, useState } from 'react';

export function useAdminRole(accessToken: string | undefined) {
  const [result, setResult] = useState<{ token: string; isAdmin: boolean } | null>(null);
  useEffect(() => {
    setResult(null);
    if (!accessToken) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    void fetch('/api/admin-role', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const body = await response.json();
        return body.isAdmin === true;
      })
      .then((isAdmin) => {
        if (!controller.signal.aborted) setResult({ token: accessToken, isAdmin });
      })
      .catch(() => {
        // A failed or unavailable role check must never grant access or prevent login.
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [accessToken]);
  return Boolean(accessToken && result?.token === accessToken && result.isAdmin);
}
