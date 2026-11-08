import { useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  LoaderCircle,
  SlidersHorizontal,
  Square,
  Play,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { StageEffectsDialog } from './StageEffectsDialog';
import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
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
  useEffect(() => {
    if (performing === null) setEffectsOpen(false);
  }, [performing]);
  const micLabel =
    microphone.state === 'on'
      ? '마이크 끄기'
      : microphone.state === 'requesting'
        ? '권한 확인 중…'
        : '마이크 켜기';
  return (
    <div className={`bottom-center${performing !== null ? ' performing-controls' : ''}`}>
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
            onClick={onFinish}
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
          {(microphone.error || voice.error) && (
            <p className="performance-error" role="alert">
              {microphone.error || voice.error}
            </p>
          )}
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
