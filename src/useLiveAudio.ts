import { errorCode, logEvent } from './telemetry';
import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { supabase } from './auth';

type Target = { channel: number; stage: number; performerId: string; endsAt: string };
type Status = 'off' | 'connecting' | 'listening' | 'ready' | 'live' | 'reconnecting' | 'error';

export function useLiveAudio(target: Target | null, client: string, stream: MediaStream | null) {
  const [status, setStatus] = useState<Status>('off');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const channel = target?.channel;
  const stage = target?.stage;
  const performerId = target?.performerId;
  const endsAt = target?.endsAt;

  useEffect(() => {
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) setAttempt((value) => value + 1);
    };
    window.addEventListener('pageshow', resume);
    return () => window.removeEventListener('pageshow', resume);
  }, []);

  useEffect(() => {
    if (channel === undefined || stage === undefined || !performerId || !endsAt) {
      setStatus('off');
      setError('');
      setBlocked(false);
      return;
    }
    let disposed = false;
    let isPublisher = false;
    let published = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const elements = new Set<HTMLMediaElement>();
    const abort = new AbortController();
    const clearAudio = () => {
      elements.forEach((element) => {
        element.pause();
        element.srcObject = null;
        element.remove();
      });
      elements.clear();
    };
    const finish = () => {
      disposed = true;
      abort.abort();
      clearAudio();
      void room.disconnect();
      if (roomRef.current === room) roomRef.current = null;
    };
    const setConnected = () => {
      if (!disposed)
        setStatus(
          isPublisher ? (published ? 'live' : 'ready') : elements.size ? 'listening' : 'ready',
        );
    };
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (
        disposed ||
        track.kind !== Track.Kind.Audio ||
        participant.identity !== performerId ||
        publication.source !== Track.Source.Microphone
      )
        return;
      const element = track.attach();
      element.hidden = true;
      document.body.appendChild(element);
      elements.add(element);
      void element.play().catch(() => {
        if (!disposed) setBlocked(true);
      });
      setConnected();
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => {
        element.pause();
        element.srcObject = null;
        element.remove();
        elements.delete(element);
      });
      setConnected();
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!disposed) setBlocked(!room.canPlaybackAudio);
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (!disposed) setStatus('reconnecting');
    });
    room.on(RoomEvent.Reconnected, setConnected);
    room.on(RoomEvent.Disconnected, () => {
      clearAudio();
      if (!disposed) {
        setStatus('error');
        logEvent('voice_failed', {
          operation: 'voice_connect',
          code: 'disconnected',
          channel,
          stage,
        });
        setError('음성 연결이 끊겼어요. 다시 연결해 주세요.');
      }
    });
    setStatus('connecting');
    setError('');
    setBlocked(false);
    const connect = async () => {
      try {
        const session = await supabase?.auth.getSession();
        if (disposed) return;
        const token = session?.data.session?.access_token;
        if (!token) throw new Error('로그인 후 음성에 연결할 수 있어요.');
        const response = await fetch('/api/voice-token', {
          method: 'POST',
          signal: abort.signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, stage, client }),
        });
        const data = await response.json();
        if (!response.ok) {
          logEvent('api_failed', {
            operation: 'voice_token',
            status: response.status,
            channel,
            stage,
          });
          throw new Error(data.error || '음성 연결에 실패했어요.');
        }
        if (disposed) return;
        if (data.performerId !== performerId || data.expiresAt !== Date.parse(endsAt)) {
          throw new Error('공연 정보가 바뀌었어요. 다시 연결해 주세요.');
        }
        isPublisher = data.canPublish === true;
        await room.connect(data.url, data.token);
        if (disposed) {
          void room.disconnect();
          return;
        }
        if (isPublisher && stream) {
          const track = stream.getAudioTracks().find((item) => item.readyState === 'live');
          if (track) {
            // Own a clone so room teardown never stops the microphone hook's track.
            const clone = track.clone();
            try {
              await room.localParticipant.publishTrack(clone, { source: Track.Source.Microphone });
            } catch (failure) {
              clone.stop();
              throw failure;
            }
            if (disposed) {
              clone.stop();
              void room.disconnect();
              return;
            }
            published = true;
          }
        }
        setConnected();
      } catch (failure) {
        if (disposed) return;
        logEvent('voice_failed', {
          operation: 'voice_connect',
          code: errorCode(failure),
          channel,
          stage,
        });
        finish();
        setStatus('error');
        setError(failure instanceof Error ? failure.message : '음성 연결에 실패했어요.');
      }
    };
    void connect();
    const expiry = window.setTimeout(
      () => {
        finish();
        setStatus('off');
      },
      Math.max(0, Date.parse(endsAt) - Date.now()),
    );
    const pagehide = () => {
      finish();
      setStatus('off');
    };
    window.addEventListener('pagehide', pagehide);
    return () => {
      window.clearTimeout(expiry);
      window.removeEventListener('pagehide', pagehide);
      finish();
    };
  }, [channel, stage, performerId, endsAt, client, stream, attempt]);

  return {
    status,
    error,
    blocked,
    retry: () => setAttempt((value) => value + 1),
    startAudio: async () => {
      try {
        await roomRef.current?.startAudio();
      } catch {
        setBlocked(true);
      }
    },
  };
}
