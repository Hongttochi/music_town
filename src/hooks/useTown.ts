import { errorCode, logEvent } from '../services/telemetry';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/auth';
import type { Avatar, Stage } from '../data/model';
import type { Position } from '../types/park';

export type Participant = {
  id: string;
  x: number;
  y: number;
  avatar: Avatar;
  bio: string;
  role: string;
  instagram: string;
  soundcloud: string;
};
type Performance = { channel_id: number; stage_id: number; user_id: string; ends_at: string };
type QueueEntry = { id: number; stage_id: number; user_id: string };
export type TownState = {
  channel: number | null;
  channels: { id: number; name: string; capacity: number; count: number }[];
  stages: { id: number; name: string; x: number; y: number }[];
  performances: Performance[];
  queue: QueueEntry[];
  participants: Participant[];
};
const emptyTown: TownState = {
  channel: null,
  channels: [],
  stages: [],
  performances: [],
  queue: [],
  participants: [],
};
const messages: Record<string, string> = {
  CHANNEL_FULL: '이 공원은 가득 찼어요. 다른 공원을 골라 주세요.',
  MUSICIAN_REQUIRED: '뮤지션으로 등록한 뒤 무대에 올라갈 수 있어요.',
  SESSION_EXPIRED: '공원 연결이 종료됐어요. 채널을 다시 선택해 주세요.',
  ALREADY_PERFORMING: '현재 공연을 마친 뒤 신청해 주세요.',
  ALREADY_QUEUED: '이미 다른 무대에서 대기하고 있어요.',
  PROFILE_REQUIRED: '먼저 프로필 등록을 완료해 주세요.',
};

export function useTown(
  userId: string,
  enabled: boolean,
  position: React.MutableRefObject<Position>,
) {
  const [state, setState] = useState<TownState>(emptyTown);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const client = useRef(crypto.randomUUID());
  const active = useRef(false);
  const current = useRef(state);
  current.current = state;
  // One in-flight request prevents older snapshots from overwriting a later action.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const request = useCallback(
    (action: string, channel?: number, stage?: number) => {
      const task = async () => {
        if (!supabase) throw new Error('로그인 연결을 확인해 주세요.');
        const { data, error: failure } = await supabase.rpc('town_action', {
          action,
          client: client.current,
          channel: channel ?? null,
          stage: stage ?? null,
          pos_x: position.current.x,
          pos_y: position.current.y,
        });
        if (failure) {
          logEvent('api_failed', { operation: action, code: errorCode(failure) });
          if (failure.message.includes('SESSION_EXPIRED') && active.current)
            setState({
              ...emptyTown,
              channels: current.current.channels,
              stages: current.current.stages,
            });
          throw new Error(
            messages[failure.message] ||
              '공원 서버에 연결하지 못했어요. DB 설정과 네트워크를 확인해 주세요.',
          );
        }
        const next = data as TownState;
        const previous = current.current;
        if (active.current) {
          if (next.channel !== previous.channel) {
            if (previous.channel !== null) logEvent('channel_leave', { channel: previous.channel });
            if (next.channel !== null) logEvent('channel_enter', { channel: next.channel });
          }
          const before = previous.performances.find((p) => p.user_id === userId);
          const after = next.performances.find((p) => p.user_id === userId);
          if (before?.ends_at !== after?.ends_at || before?.stage_id !== after?.stage_id) {
            if (before)
              logEvent('performance_end', { channel: before.channel_id, stage: before.stage_id });
            if (after)
              logEvent('performance_start', { channel: after.channel_id, stage: after.stage_id });
          }
          current.current = next;
          setState(data as TownState);
          setError('');
        }
        return data as TownState;
      };
      const result = chain.current.then(task, task);
      chain.current = result.catch(() => {});
      return result;
    },
    [position, userId],
  );

  useEffect(() => {
    if (!enabled || !supabase) return;
    active.current = true;
    let fetching = false;
    const refresh = () => {
      if (fetching) return;
      fetching = true;
      void request('snapshot')
        .catch((e) => {
          if (active.current) setError(e.message);
        })
        .finally(() => {
          fetching = false;
        });
    };
    refresh();
    const subscription = supabase
      .channel(`town-directory-${userId}-${client.current}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'town_channels' }, () => {
        // Throttle the fan-out from other clients' heartbeats.
        if (Date.now() - lastEvent > 1000) {
          lastEvent = Date.now();
          refresh();
        }
      })
      .subscribe();
    let lastEvent = 0;
    let heartbeatPending = false;
    const timer = window.setInterval(() => {
      if (current.current.channel === null) {
        refresh();
        return;
      }
      if (heartbeatPending) return;
      heartbeatPending = true;
      void request('heartbeat')
        .catch((e) => {
          if (active.current) setError(e.message);
        })
        .finally(() => {
          heartbeatPending = false;
        });
    }, 1500);
    const resume = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
      void supabase!.removeChannel(subscription);
      // Browser termination is covered by the server lease, not an unreliable unload request.
    };
  }, [enabled, request, userId]);

  const act = async (action: string, channel?: number, stage?: number) => {
    if (actionPending.current) throw new Error('이전 요청을 처리하고 있어요.');
    actionPending.current = true;
    setBusy(true);
    try {
      return await request(action, channel, stage);
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };
  const stages: Stage[] = state.stages.map((stage) => {
    const performance = state.performances.find((p) => p.stage_id === stage.id);
    const musician = state.participants.find((p) => p.id === performance?.user_id);
    return {
      ...stage,
      artist: musician?.avatar.name || '',
      bio: musician?.bio || '',
      genre: musician ? '라이브 버스킹' : '빈 자리',
      followers: 0,
      listeners: state.participants.filter(
        (p) => p.id !== musician?.id && Math.hypot(p.x - stage.x, p.y - stage.y) < 155,
      ).length,
      color: '#b2bd98',
    };
  });
  return {
    clientId: client.current,
    state,
    stages,
    error,
    busy,
    act,
    request,
    performance: state.performances.find((p) => p.user_id === userId),
    waiting: state.queue.find((p) => p.user_id === userId),
  };
}
