import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './auth';
export type FanStats = {
  followers: number;
  hearts: number;
  following: boolean;
  hearted: boolean;
  onlineSeconds: number;
  stageSeconds: number;
  days: { date: string; onlineSeconds: number; stageSeconds: number }[];
};
const changed = 'music-town-fans-changed';
export async function fanAction(
  target: string,
  action = 'stats',
  enabled = true,
): Promise<FanStats> {
  if (!supabase) throw new Error('로그인 후 이용할 수 있어요.');
  const { data, error } = await supabase.rpc('profile_fan_action', { target, action, enabled });
  if (error) throw new Error('팬 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  if (action !== 'stats') window.dispatchEvent(new CustomEvent(changed, { detail: target }));
  return data as FanStats;
}
export function useFanStats(target: string | undefined, demo = false) {
  const [result, setResult] = useState<{ target: string; stats: FanStats } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const current = useRef(target);
  current.current = target;
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!target || demo) return;
    const request = ++revision.current;
    try {
      const stats = await fanAction(target);
      if (request === revision.current && current.current === target) {
        setResult({ target, stats });
        setError('');
      }
    } catch (failure) {
      if (request === revision.current && current.current === target)
        setError((failure as Error).message);
    }
  }, [target, demo]);
  useEffect(() => {
    setError('');
    setResult(null);
    void refresh();
    const update = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(update, 15000);
    window.addEventListener(changed, update);
    document.addEventListener('visibilitychange', update);
    return () => {
      ++revision.current;
      clearInterval(timer);
      window.removeEventListener(changed, update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh]);
  const act = async (action: 'follow' | 'heart', enabled: boolean) => {
    if (!target || demo || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const stats = await fanAction(target, action, enabled);
      if (current.current === target) {
        ++revision.current;
        setResult({ target, stats });
        setError('');
      }
    } catch (failure) {
      if (current.current === target) setError((failure as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return {
    stats: result && result.target === target ? result.stats : null,
    error,
    busy,
    act,
    refresh,
  };
}
