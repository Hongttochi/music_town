import { useEffect, useRef, useState } from 'react';

export type RecordingState = 'idle' | 'recording' | 'ready' | 'error';

export type RecordedPerformance = {
  url: string;
  filename: string;
  mimeType: string;
  durationSec: number;
};

const MIME_CANDIDATES = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
];

export function selectRecordingFormat(isSupported?: (mime: string) => boolean): {
  mimeType: string;
  ext: string;
} {
  const check =
    isSupported ??
    ((mime: string) =>
      typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
        ? MediaRecorder.isTypeSupported(mime)
        : false);
  for (const candidate of MIME_CANDIDATES) {
    if (check(candidate.mime)) {
      return { mimeType: candidate.mime, ext: candidate.ext };
    }
  }
  return { mimeType: '', ext: 'webm' };
}

export function buildRecordingFilename(ext: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `music-town-busking-${stamp}.${ext}`;
}

export function formatRecordingDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function usePerformanceRecorder(stream: MediaStream | null, active: boolean) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recorded, setRecorded] = useState<RecordedPerformance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const urlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);

  const revokeCurrentUrl = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* Recorder may already be stopping. */
      }
    }
  };

  const clear = () => {
    revokeCurrentUrl();
    setRecorded(null);
    setError('');
    if (recorderRef.current?.state !== 'recording') {
      setState('idle');
    }
  };

  const start = () => {
    if (!active || !stream) {
      setState('error');
      setError('마이크가 켜진 상태에서 녹음을 시작할 수 있어요.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setState('error');
      setError('이 브라우저에서는 녹음 기능을 지원하지 않아요.');
      return;
    }
    stop();
    revokeCurrentUrl();
    setRecorded(null);
    setError('');
    chunksRef.current = [];

    try {
      const { mimeType, ext } = selectRecordingFormat();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setState('error');
        setError('녹음 중 오류가 발생했어요. 다시 시도해 주세요.');
      };

      recorder.onstop = () => {
        if (recorderRef.current === recorder) {
          recorderRef.current = null;
        }
        if (!chunksRef.current.length) {
          setState('idle');
          return;
        }
        const finalType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        chunksRef.current = [];
        if (blob.size === 0) {
          setState('idle');
          return;
        }
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const durationSec = startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : 1;
        setRecorded({
          url,
          filename: buildRecordingFilename(ext),
          mimeType: finalType,
          durationSec,
        });
        setState('ready');
      };

      startedAtRef.current = Date.now();
      setElapsedSec(0);
      recorder.start(1000);
      setState('recording');
    } catch {
      setState('error');
      setError('녹음을 시작하지 못했어요. 마이크 연결을 확인해 주세요.');
    }
  };

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (!active || !stream) {
      stop();
    }
  }, [active, stream]);

  useEffect(() => {
    return () => {
      stop();
      revokeCurrentUrl();
    };
  }, []);

  return {
    state,
    error,
    elapsedSec,
    recorded,
    start,
    stop,
    clear,
  };
}
