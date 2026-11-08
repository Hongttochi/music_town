import { useEffect, useRef, useState } from 'react';
import {
  createStageEffects,
  defaultStageEffects,
  normalizeStageEffects,
  type StageEffects,
} from '../audio/stageEffects';

type MicState = 'off' | 'requesting' | 'on' | 'error';

export function useStageMicrophone(active: boolean, stageId: number | null) {
  const [effects, setEffects] = useState<StageEffects>(() => {
    try {
      return normalizeStageEffects(
        JSON.parse(localStorage.getItem('mt-stage-effects') || '{}') || {},
      );
    } catch {
      return defaultStageEffects;
    }
  });
  const effectsRef = useRef(effects);
  const processor = useRef<ReturnType<typeof createStageEffects> | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [effectsPaused, setEffectsPaused] = useState(false);
  const changeEffects = (value: StageEffects) => {
    const settings = normalizeStageEffects(value);
    effectsRef.current = settings;
    setEffects(settings);
    processor.current?.update(settings);
    try {
      localStorage.setItem('mt-stage-effects', JSON.stringify(settings));
    } catch {
      /* Private storage may be unavailable. */
    }
    void contextRef.current?.resume().catch(() => setEffectsPaused(true));
  };
  const [state, setState] = useState<MicState>('off');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    setEnabled(true);
  }, [active, stageId]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let graph: ReturnType<typeof createStageEffects> | undefined;
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (context) context.onstatechange = null;
      graph?.dispose();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      if (processor.current === graph) processor.current = null;
      if (contextRef.current === context) contextRef.current = null;
    };
    if (!active || !enabled) {
      setMediaStream(null);
      setState('off');
      setError('');
      return;
    }

    setEffectsPaused(false);
    setState('requesting');
    setMediaStream(null);
    setError('');
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            '이 브라우저에서는 마이크를 사용할 수 없어요. HTTPS 주소에서 다시 열어 주세요.',
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stop();
          return;
        }
        const tracks = stream.getAudioTracks();
        if (!tracks.length || tracks.every((track) => track.readyState === 'ended')) {
          throw new Error('사용 가능한 마이크를 찾지 못했어요.');
        }
        tracks.forEach((track) => {
          track.onended = () => {
            if (cancelled) return;
            stop();
            setMediaStream(null);
            setState('error');
            setError('마이크 연결이 끊겼어요. 연결을 확인하고 다시 켜 주세요.');
          };
        });
        context = new AudioContext({ latencyHint: 'interactive' });
        graph = createStageEffects(context, stream, effectsRef.current);
        processor.current = graph;
        contextRef.current = context;
        context.onstatechange = () => {
          if (cancelled) return;
          setEffectsPaused(context!.state !== 'running');
          setMediaStream(context!.state === 'running' ? graph!.stream : null);
        };
        // A suspended context must not be presented as live silent audio.
        setEffectsPaused(context.state !== 'running');
        setState('on');
        setMediaStream(context.state === 'running' ? graph.stream : null);
        void context.resume().catch(() => {
          if (!cancelled) setEffectsPaused(true);
        });
      } catch (failure) {
        stop();
        if (cancelled) return;
        setState('error');
        const name = failure instanceof Error ? failure.name : '';
        setError(
          name === 'NotAllowedError'
            ? '마이크 권한이 필요해요. 브라우저의 사이트 설정에서 허용한 뒤 다시 켜 주세요.'
            : name === 'NotFoundError'
              ? '연결된 마이크가 없어요. 마이크를 연결한 뒤 다시 켜 주세요.'
              : name === 'NotReadableError'
                ? '마이크를 열지 못했어요. 다른 앱에서 사용 중인지 확인해 주세요.'
                : failure instanceof Error
                  ? failure.message
                  : '마이크를 켜지 못했어요.',
        );
      }
    };
    void start();
    const onPageHide = () => {
      cancelled = true;
      stop();
      setEnabled(false);
      setMediaStream(null);
      setState('off');
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      cancelled = true;
      stop();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [active, stageId, enabled, attempt]);

  return {
    effects,
    changeEffects,
    effectsPaused: active && enabled && effectsPaused,
    resumeEffects: () => {
      void contextRef.current?.resume().catch(() => setEffectsPaused(true));
    },
    stream: active && enabled ? mediaStream : null,
    state: active ? state : 'off',
    error,
    turnOff: () => setEnabled(false),
    turnOn: () => {
      setEnabled(true);
      setAttempt((value) => value + 1);
    },
  };
}
