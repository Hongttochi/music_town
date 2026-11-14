import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  LoaderCircle,
  SlidersHorizontal,
  Square,
  Play,
  Pause,
  RefreshCw,
  Volume2,
  CircleDot,
  Download,
  X,
} from 'lucide-react';
import { StageEffectsDialog } from './StageEffectsDialog';
import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import {
  formatRecordingDuration,
  usePerformanceRecorder,
} from '../../hooks/usePerformanceRecorder';
import type { SoundEffect } from '../../data/sounds';
import type { Stage } from '../../data/model';
import type { useStageMicrophone } from '../../hooks/useStageMicrophone';
import type { useLiveAudio } from '../../hooks/useLiveAudio';
type Props = {
  queue: number | null;
  performing: number | null;
  queuePlace: number;
  stages: Stage[];
  voice: ReturnType<typeof useLiveAudio>;
  microphone: ReturnType<typeof useStageMicrophone>;
  endsAt?: string;
  now: Date;
  onCancel: () => void;
  onFinish: () => void;
  onReaction: (symbol: string, sound: SoundEffect) => void;
};
export function PerformanceControls({
  queue,
  performing,
  queuePlace,
  stages,
  voice,
  microphone,
  endsAt,
  now,
  onCancel,
  onFinish,
  onReaction,
}: Props) {
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorder = usePerformanceRecorder(microphone.stream, performing !== null);
  useEffect(() => {
    if (performing === null) setEffectsOpen(false);
  }, [performing]);
  useEffect(() => {
    setPreviewPlaying(false);
  }, [recorder.recorded?.url]);
  const togglePreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setPreviewPlaying(false));
    } else {
      audio.pause();
    }
  };
  const micLabel =
    microphone.state === 'on'
      ? '마이크 끄기'
      : microphone.state === 'requesting'
        ? '권한 확인 중…'
        : '마이크 켜기';
  const recordLabel = recorder.state === 'recording' ? '녹음 중지' : '공연 녹음';
  return (
    <div
      className={`bottom-center${performing !== null || recorder.recorded ? ' performing-controls' : ''}`}
    >
      {queue !== null && performing === null && (
        <div id="queue-status">
          {stages.find((s) => s.id === queue)?.name} · 대기 {queuePlace}번
          <Button onClick={onCancel}>취소</Button>
        </div>
      )}
      {performing !== null && (
        <div className="performance-toolbar">
          <div className="performance-summary" role="status">
            <strong>
              {microphone.effectsPaused
                ? '마이크 소리 시작 필요'
                : recorder.state === 'recording'
                  ? `● REC · ${formatRecordingDuration(recorder.elapsedSec)} 녹음 중`
                  : voice.status === 'live'
                    ? '● LIVE · 송출 중'
                    : voice.status === 'connecting' || voice.status === 'reconnecting'
                      ? '음성 연결 중…'
                      : voice.status === 'error'
                        ? '음성 연결 필요'
                        : '마이크 송출 대기'}
            </strong>
            <span>
              {endsAt ? Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / 1000)) : 0}초
              남음
            </span>
          </div>
          <Button
            size="icon"
            aria-label={micLabel}
            title={micLabel}
            disabled={microphone.state === 'requesting'}
            aria-pressed={microphone.state === 'on'}
            onClick={microphone.state === 'on' ? microphone.turnOff : microphone.turnOn}
          >
            {microphone.state === 'on' ? (
              <Mic size={20} />
            ) : microphone.state === 'requesting' ? (
              <LoaderCircle size={20} />
            ) : (
              <MicOff size={20} />
            )}
          </Button>
          <Button
            size="icon"
            aria-label={recordLabel}
            title={recordLabel}
            disabled={microphone.state !== 'on' || microphone.effectsPaused}
            aria-pressed={recorder.state === 'recording'}
            onClick={() => {
              microphone.resumeEffects();
              if (recorder.state === 'recording') recorder.stop();
              else recorder.start();
            }}
          >
            <CircleDot size={20} />
          </Button>
          <Button
            size="icon"
            aria-label="음향 설정"
            title="음향 설정"
            onClick={() => {
              microphone.resumeEffects();
              setEffectsOpen(true);
            }}
          >
            <SlidersHorizontal size={20} />
          </Button>
          {microphone.effectsPaused && (
            <Button
              size="icon"
              aria-label="마이크 소리 시작"
              title="마이크 소리 시작"
              onClick={microphone.resumeEffects}
            >
              <Play size={20} />
            </Button>
          )}
          <Button
            size="icon"
            className="performance-finish"
            aria-label="공연 종료"
            title="공연 종료"
            onClick={() => {
              recorder.stop();
              onFinish();
            }}
          >
            <Square size={18} fill="currentColor" />
          </Button>
          {voice.status === 'error' && (
            <Button size="icon" aria-label="다시 연결" title="다시 연결" onClick={voice.retry}>
              <RefreshCw size={20} />
            </Button>
          )}
          {voice.blocked && (
            <Button
              size="icon"
              aria-label="소리 켜기"
              title="소리 켜기"
              onClick={() => void voice.startAudio()}
            >
              <Volume2 size={20} />
            </Button>
          )}
          {(voice.error || recorder.error) && (
            <p className="performance-error" role="alert">
              {recorder.error || voice.error}
            </p>
          )}
        </div>
      )}
      {recorder.recorded && (
        <div className="performance-recording-ready" role="region" aria-label="녹음된 공연">
          <audio
            ref={previewAudioRef}
            src={recorder.recorded.url}
            preload="metadata"
            hidden
            onPlay={() => setPreviewPlaying(true)}
            onPause={() => setPreviewPlaying(false)}
            onEnded={() => setPreviewPlaying(false)}
          />
          <span className="performance-recording-badge" aria-hidden="true">
            <Flaticon name="musical" size={18} />
          </span>
          <div className="performance-recording-copy">
            <strong>내 버스킹 녹음본</strong>
            <span>{formatRecordingDuration(recorder.recorded.durationSec)} · 음향 효과 포함</span>
          </div>
          <Button
            variant="secondary"
            aria-label={previewPlaying ? '미리듣기 일시정지' : '녹음 미리듣기'}
            onClick={togglePreview}
          >
            {previewPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{previewPlaying ? '일시정지' : '들어보기'}</span>
          </Button>
          <a
            className="town-button town-button--primary performance-download-link"
            href={recorder.recorded.url}
            download={recorder.recorded.filename}
          >
            <Download size={14} />
            <span>저장</span>
          </a>
          <Button
            variant="ghost"
            size="icon"
            aria-label="녹음 닫기"
            title="녹음 닫기"
            onClick={() => {
              previewAudioRef.current?.pause();
              recorder.clear();
            }}
          >
            <X size={15} />
          </Button>
        </div>
      )}
      {performing !== null && effectsOpen && (
        <StageEffectsDialog
          settings={microphone.effects}
          onChange={microphone.changeEffects}
          onClose={() => setEffectsOpen(false)}
        />
      )}
      {performing === null && (
        <div className="reaction-bar">
          <span>마음을 보내요</span>
          {[
            {
              s: '♡',
              icon: <Flaticon name="heart" size={24} />,
              label: '하트',
              sound: 'heart',
            },
            {
              s: '👏',
              icon: <Flaticon name="clap" size={23} />,
              label: '박수',
              sound: 'clap',
            },
            {
              s: '✦',
              icon: <Flaticon name="lightstick" size={23} />,
              label: '응원봉',
              sound: 'lightstick',
            },
          ].map((r) => (
            <Button
              className="flex flex-col items-center justify-center"
              key={r.s}
              aria-label={r.label + ' 보내기'}
              onClick={() => onReaction(r.s, r.sound as SoundEffect)}
            >
              {r.icon}
              <small>{r.label}</small>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
