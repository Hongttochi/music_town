import { ProfileBio } from './components/ProfileBio';
import { startTelemetry } from './telemetry';
import { FanProfile, FollowedProfiles } from './components/FanProfile';
import { fanAction } from './useFanStats';
import { useAmbientAudio } from './useAmbientAudio';
import { ProfileIcon } from './components/ProfileIcon';
import { DeviceGuide } from './components/DeviceGuide';
import { ErrorModal } from './components/ui/ErrorModal';
import { useTown, type Participant } from './useTown';
import { useStageMicrophone } from './useStageMicrophone';
import { useLiveAudio } from './useLiveAudio';
import { SoundEffectsSetting } from './components/SoundEffectsSetting';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';
import { SoundEffectsProvider, useSoundEffects, type SoundEffect } from './useSoundEffects';
import { ParticipantProfile } from './components/ParticipantProfile';
import { ReportForm } from './components/ReportForm';
import { ProfileLoader } from './components/ProfileLoader';
import { saveProfile, type SavedProfile } from './profileRepository';
import {
  RolePicker,
  Registration,
  emptyProfile,
  type MemberProfile,
} from './components/Registration';
import { BuskingBook } from './components/BuskingBook';
import { ChannelPicker } from './components/ChannelPicker';
import { AccountPanel } from './components/AccountPanel';
import { HourlyClock } from './components/HourlyClock';
import { DialogPanel, PanelHeading } from './components/ui/Panel';
import { Button } from './components/ui/Button';
import { Flaticon } from './Flaticon';
import { AvatarEditor } from './AvatarEditor';
import { LoginGate, type Account } from './LoginGate';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Music2,
  Heart,
  ArrowUpRight,
  Sun,
  Moon,
  VolumeX,
  MapPin,
  Mic,
  Hand,
  X,
} from 'lucide-react';
import { Park, Position } from './Park';
import {
  Avatar,
  Stage,
  stages as demoStages,
  populations as demoPopulations,
  defaultAvatar,
  readSaved,
  koreanHour,
} from './model';
import './style.css';
import './components/ui/town-ui.css';
import './mobile.css';
import './components/community-modals.css';

type Panel =
  | 'role'
  | 'registration'
  | 'account'
  | 'settings'
  | 'avatar'
  | 'channels'
  | 'profile'
  | 'participant'
  | 'following'
  | 'queue'
  | 'report'
  | null;
const channels = ['01', '02', '03', '04', '05'];
function App({ account, initial }: { account: Account; initial: SavedProfile | null }) {
  const [entered, setEntered] = useState(false);
  const storagePrefix = `mt-${account.id}`;
  const [showStages, setShowStages] = useState(false);
  const [avatar, setAvatar] = useState<Avatar>(
    () => initial?.avatar ?? readSaved(storagePrefix + '-avatar', defaultAvatar),
  );
  const [memberProfile, setMemberProfile] = useState<MemberProfile>(
    () => initial?.profile ?? readSaved(storagePrefix + '-profile', emptyProfile),
  );
  const [panel, setPanel] = useState<Panel>(() =>
    initial?.profile.completed ||
    (account.demo && readSaved<MemberProfile>(storagePrefix + '-profile', emptyProfile).completed)
      ? 'channels'
      : 'role',
  );
  const [selectedStage, setSelected] = useState<Stage>(demoStages[0]);
  const [channel, setChannel] = useState(0);
  const [near, setNear] = useState<Stage | null>(null);
  const [muted, setMuted] = useState<number[]>([]);
  const playSound = useSoundEffects();
  const [toast, setToast] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) return;
    const previous = theme.content;
    theme.content = entered ? '#d6e3bd' : '#e5e4dd';
    return () => {
      theme.content = previous;
    };
  }, [entered]);
  const [dismissedTownError, setDismissedTownError] = useState('');
  const [queue, setQueue] = useState<number | null>(null);
  const [performing, setPerforming] = useState<number | null>(null);
  const [reaction, setReaction] = useState<{ symbol: string; at: number } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Participant | null>(null);
  const [now, setNow] = useState(new Date());
  const dialog = useRef<HTMLDialogElement>(null);
  const position = useRef<Position>({ x: 650, y: 470 });
  const motion = useRef<Position>({ x: 0, y: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };
  useEffect(() => {
    if (panel) {
      motion.current = { x: 0, y: 0 };
      const element = dialog.current;
      const alreadyOpen = element?.open;
      element?.showModal();
      if (element) {
        element.scrollTop = 0;
        if (alreadyOpen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const surface = element.querySelector<HTMLElement>('.profile-sheet') ?? element;
          surface.getAnimations().forEach((animation) => animation.cancel());
          surface.animate(
            [
              { opacity: 0, transform: 'translateY(8px) scale(.985)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' },
          );
        }
      }
    } else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    localStorage.setItem(storagePrefix + '-avatar', JSON.stringify(avatar));
  }, [avatar]);
  const town = useTown(account.id, !account.demo, position);
  const currentPerformance =
    town.performance && Date.parse(town.performance.ends_at) > now.getTime()
      ? town.performance
      : undefined;
  const microphone = useStageMicrophone(
    entered && !account.demo && town.state.channel !== null && Boolean(currentPerformance),
    currentPerformance?.stage_id ?? null,
  );
  const audiblePerformance =
    currentPerformance ??
    town.state.performances.find(
      (item) =>
        item.stage_id === near?.id &&
        !muted.includes(item.stage_id) &&
        Date.parse(item.ends_at) > now.getTime(),
    );
  const previousAudiblePerformance = useRef<typeof audiblePerformance>(undefined);
  useEffect(() => {
    const previous = previousAudiblePerformance.current;
    if (
      previous &&
      entered &&
      town.state.channel === previous.channel_id &&
      !muted.includes(previous.stage_id) &&
      (previous.user_id === account.id || near?.id === previous.stage_id) &&
      (Date.parse(previous.ends_at) <= now.getTime() ||
        !town.state.performances.some(
          (item) =>
            item.channel_id === previous.channel_id &&
            item.stage_id === previous.stage_id &&
            item.user_id === previous.user_id &&
            item.ends_at === previous.ends_at,
        ))
    ) {
      playSound('complete');
    }
    previousAudiblePerformance.current = entered ? audiblePerformance : undefined;
  }, [
    audiblePerformance,
    entered,
    town.state.channel,
    town.state.performances,
    now,
    muted,
    near?.id,
    account.id,
    playSound,
  ]);
  const voice = useLiveAudio(
    entered && !account.demo && town.state.channel !== null && audiblePerformance
      ? {
          channel: town.state.channel,
          stage: audiblePerformance.stage_id,
          performerId: audiblePerformance.user_id,
          endsAt: audiblePerformance.ends_at,
        }
      : null,
    town.clientId,
    microphone.stream,
  );
  useAmbientAudio(position, entered, microphone.state === 'on' || voice.status === 'listening');
  const stages = account.demo ? demoStages : town.stages;
  const populations = account.demo ? demoPopulations : town.state.channels.map((c) => c.count);
  const selectedMusician = town.state.participants.find(
    (p) =>
      p.id ===
      town.state.performances.find((performance) => performance.stage_id === selectedStage.id)
        ?.user_id,
  );
  const selected = stages.find((s) => s.id === selectedStage.id) ?? selectedStage;
  const queuePlace = town.waiting
    ? town.state.queue
        .filter((q) => q.stage_id === town.waiting!.stage_id)
        .findIndex((q) => q.user_id === account.id) + 1
    : 0;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (account.demo) return;
    const stageId = town.performance?.stage_id ?? null;
    if (stageId !== null && stageId !== performing) {
      const stage = town.stages.find((s) => s.id === stageId);
      if (stage) position.current = { x: stage.x, y: stage.y };
    }
    setPerforming(stageId);
    setQueue(town.waiting?.stage_id ?? null);
    if (entered && town.state.channel === null) {
      setEntered(false);
      setPanel('channels');
    }
  }, [town.state, account.demo]);
  const serverAction = async (action: string) => {
    try {
      await town.act(action);
    } catch (error) {
      setActionError((error as Error).message);
    }
  };
  const openStage = (s: Stage) => {
    setSelected(s);
    setPanel(s.artist ? 'profile' : 'queue');
  };
  const move = (p: Position) => {
    const s = stages.reduce<Stage | null>(
      (a, b) => (!a || Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a),
      null,
    );
    if (!s) return;
    setNear(Math.hypot(s.x - p.x, s.y - p.y) < 155 ? s : null);
  };
  const join = async (s: Stage) => {
    if (account.demo) {
      notify('로그인 후 이용할 수 있어요.');
      return;
    }
    try {
      await town.act('join', undefined, s.id);
      setPanel(null);
    } catch (error) {
      setActionError((error as Error).message);
    }
  };
  const changeChannel = async (id: number) => {
    try {
      if (!account.demo) await town.act('enter', id);
      setEntered(true);
      setChannel(id);
      setNear(null);
      position.current = { x: 650, y: 470 };
      setPanel(null);
      notify(`${channels[id]}번 공원에 도착했어요.`);
    } catch (error) {
      setActionError((error as Error).message);
    }
  };
  const title = (_eyebrow: string, name: string) => (
    <PanelHeading title={name} onClose={entered ? () => setPanel(null) : undefined} />
  );
  const hour = koreanHour();
  const night = hour < 6 || hour >= 19;
  return (
    <>
      <main id="app" className={entered ? '' : 'before-entry'}>
        {entered && (
          <>
            <Park
              key={`${channel}|${stages.map((s) => `${s.id}:${s.x}:${s.y}`).join('|')}`}
              avatar={avatar}
              liveStages={stages}
              participants={town.state.participants.filter((p) => p.id !== account.id)}
              demo={account.demo}
              position={position}
              motion={motion}
              onMove={move}
              onStage={openStage}
              onParticipant={(person) => {
                setSelectedPerson(person);
                setPanel('participant');
              }}
              performing={performing}
              watching={
                performing === null &&
                near &&
                !muted.includes(near.id) &&
                stages.find((stage) => stage.id === near.id)?.artist
                  ? near.id
                  : null
              }
              performerIds={town.state.performances.map((performance) => performance.user_id)}
              reaction={performing === null ? reaction : null}
            />
            <header className="topbar">
              <div className="header-center">
                <span className="live-dot" />
                <span>초록 공원 · CH {channels[channel]}</span>
              </div>
              <div className="header-right">
                <Button
                  className="avatar-button"
                  onClick={() => setPanel('account')}
                  aria-label="마이페이지"
                >
                  <ProfileIcon id={avatar.profileIcon} size={17} />
                </Button>
                <Button
                  className="icon-button"
                  onClick={() => setPanel('settings')}
                  aria-label="설정"
                >
                  <Flaticon name="setting" size={18} className="settings-button-icon" />
                </Button>
              </div>
            </header>
            <aside className="intro">
              <span className="eyebrow">YOUR EVERYDAY MUSIC ESCAPE</span>
              <h1>
                오늘은 어떤 음악을
                <br />
                만나게 될까요?
              </h1>
              <p>발길이 닿는 곳에서, 새로운 목소리를 만나세요.</p>
              <div className="weather">
                {night ? <Moon size={16} /> : <Sun size={16} />}
                <span>
                  {night
                    ? '별빛이 머무는 밤'
                    : hour >= 17
                      ? '노을이 물드는 저녁'
                      : '햇살 좋은 오후'}
                </span>
                <i />
                채팅 없이, 음악으로 함께
              </div>
            </aside>
            <aside className="stage-list">
              <div className="section-title">
                <h2>
                  공원의 소리 <span>LIVE</span>
                </h2>
                <span>{populations[channel]} / 30</span>
              </div>
              {stages.map((s) => (
                <Button className="stage-item" key={s.id} onClick={() => openStage(s)}>
                  <span className="stage-avatar" style={{ background: s.color + '55' }}>
                    {s.artist ? (
                      <Flaticon name="musical" size={22} />
                    ) : (
                      <Flaticon name="mic" size={20} />
                    )}
                  </span>
                  <span className="stage-info">
                    <strong>
                      {performing === s.id ? avatar.name : s.artist || '당신의 무대'}
                      {!s.artist && performing !== s.id && <em>비어 있어요</em>}
                    </strong>
                    <small>{s.name}</small>
                  </span>
                  {s.artist ? (
                    <span className="equalizer">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <ArrowUpRight size={13} className="text-[#9aa789]" />
                  )}
                </Button>
              ))}
              <div className="list-foot">
                <span className="live-dot" />
                가까운 무대의 소리가 들려요
              </div>
            </aside>
            <div id="world-labels">
              {stages.map((s) => (
                <Button
                  key={s.id}
                  id={`label-${s.id}`}
                  className={`world-label ${s.artist ? '' : 'empty'} ${near?.id === s.id ? 'selected' : ''}`}
                  onClick={() => openStage(s)}
                >
                  <b>{String(s.id + 1).padStart(2, '0')}</b>
                  {performing === s.id ? avatar.name : s.artist || '빈 버스킹 자리'}
                  {s.artist && <span className="ml-2 opacity-60">♫</span>}
                </Button>
              ))}
            </div>

            <div className="movement">
              <div
                id="joystick"
                role="button"
                tabIndex={0}
                aria-label="이동 조이스틱"
                onPointerDown={(e) => {
                  if (!e.isPrimary) return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = e.currentTarget.getBoundingClientRect();
                  motion.current = {
                    x: Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / 35)),
                    y: Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / 35)),
                  };
                  const stick = e.currentTarget.querySelector<HTMLElement>('#stick')!;
                  stick.style.transform = `translate(${motion.current.x * 22}px,${motion.current.y * 22}px)`;
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  motion.current = {
                    x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / 35)),
                    y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / 35)),
                  };
                  e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform =
                    `translate(${motion.current.x * 22}px,${motion.current.y * 22}px)`;
                }}
                onPointerUp={(e) => {
                  motion.current = { x: 0, y: 0 };
                  e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={(e) => {
                  motion.current = { x: 0, y: 0 };
                  e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
                }}
                onLostPointerCapture={(e) => {
                  motion.current = { x: 0, y: 0 };
                  e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
                }}
              >
                <span className="north">⌃</span>
                <span className="west">‹</span>
                <span className="east">›</span>
                <span className="south">⌄</span>
                <div id="stick" />
              </div>
            </div>
            <div className={`bottom-center${performing !== null ? ' performing-controls' : ''}`}>
              {queue !== null && performing === null && (
                <div id="queue-status">
                  {stages.find((s) => s.id === queue)?.name} · 대기 {queuePlace}번
                  <Button
                    onClick={() => {
                      void serverAction('cancel');
                    }}
                  >
                    취소
                  </Button>
                </div>
              )}
              {performing !== null && (
                <div className="performance-toolbar">
                  <div className="performance-summary" role="status">
                    <strong>
                      {voice.status === 'live'
                        ? '● LIVE · 송출 중'
                        : voice.status === 'connecting' || voice.status === 'reconnecting'
                          ? '음성 연결 중…'
                          : voice.status === 'error'
                            ? '음성 연결 필요'
                            : '마이크 송출 대기'}
                    </strong>
                    <span>
                      {town.performance
                        ? Math.max(
                            0,
                            Math.ceil(
                              (Date.parse(town.performance.ends_at) - now.getTime()) / 1000,
                            ),
                          )
                        : 0}
                      초 남음
                    </span>
                  </div>
                  <Button
                    disabled={microphone.state === 'requesting'}
                    aria-pressed={microphone.state === 'on'}
                    onClick={microphone.state === 'on' ? microphone.turnOff : microphone.turnOn}
                  >
                    {microphone.state === 'on'
                      ? '마이크 끄기'
                      : microphone.state === 'requesting'
                        ? '권한 확인 중…'
                        : '마이크 켜기'}
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await town.act('finish');
                        position.current.y += 70;
                        notify('공연을 마쳤어요. 수고했어요!');
                      } catch (error) {
                        setActionError((error as Error).message);
                      }
                    }}
                  >
                    공연 종료
                  </Button>
                  {voice.status === 'error' && <Button onClick={voice.retry}>다시 연결</Button>}
                  {voice.blocked && (
                    <Button onClick={() => void voice.startAudio()}>소리 켜기</Button>
                  )}
                  {(microphone.error || voice.error) && (
                    <p className="performance-error" role="alert">
                      {microphone.error || voice.error}
                    </p>
                  )}
                </div>
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
                      onClick={() => {
                        setReaction({ symbol: r.s, at: Date.now() });
                        playSound(r.sound as SoundEffect);
                        if (
                          r.s === '♡' &&
                          !account.demo &&
                          audiblePerformance &&
                          audiblePerformance.user_id !== account.id
                        ) {
                          void fanAction(audiblePerformance.user_id, 'heart', true).catch((error) =>
                            notify(error.message),
                          );
                        }
                      }}
                    >
                      {r.icon}
                      <small>{r.label}</small>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="map-card" role="img" aria-label="공원 지도">
              <span>OUR LITTLE PARK</span>
              <svg viewBox="0 0 180 95">
                <rect width="180" height="95" rx="14" fill="#c4d6a5" />
                <path
                  d="M0 50Q45 10 90 50T180 40M85 0Q65 50 100 95"
                  stroke="#eee3c8"
                  strokeWidth="14"
                  fill="none"
                />
                <ellipse cx="145" cy="20" rx="25" ry="13" fill="#91c6c4" />
                <g fill="#668753">
                  <circle cx="18" cy="19" r="8" />
                  <circle cx="163" cy="74" r="10" />
                  <circle cx="30" cy="80" r="11" />
                </g>
                <g fill="#fcf8e8" stroke="#a57c50" strokeWidth="2">
                  {stages.map((s) => (
                    <circle key={s.id} cx={s.x / 10} cy={s.y / 9} r="5" />
                  ))}
                </g>
                <circle
                  cx={position.current.x / 10}
                  cy={position.current.y / 9}
                  r="5"
                  fill="#ef976c"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
              <span className="map-caption">나만의 속도로 걸어보세요</span>
            </div>
            {audiblePerformance && performing === null && (
              <div className="live-audio-status" role="status">
                <span>
                  {voice.status === 'live'
                    ? '● LIVE · 송출 중'
                    : voice.status === 'listening'
                      ? '♫ 공연 듣는 중'
                      : voice.status === 'connecting' || voice.status === 'reconnecting'
                        ? '음성 연결 중…'
                        : voice.status === 'error'
                          ? '음성 연결 필요'
                          : '마이크 송출 대기 중'}
                </span>
                {voice.blocked && (
                  <Button variant="secondary" onClick={() => void voice.startAudio()}>
                    소리 켜기
                  </Button>
                )}
                {voice.error && <small>{voice.error}</small>}
                {voice.status === 'error' && (
                  <Button variant="secondary" onClick={voice.retry}>
                    다시 연결
                  </Button>
                )}
              </div>
            )}
            <Button
              className="stage-toggle"
              onClick={() => {
                setShowStages(!showStages);
                document.body.classList.toggle('show-stages', !showStages);
              }}
            >
              <Flaticon name="musical" size={20} />
              <span>공연 중인 무대</span>
              <span className="pill">{stages.filter((s) => s.artist).length}</span>
            </Button>
            <HourlyClock active={entered} />
          </>
        )}
      </main>
      <DialogPanel
        data-panel={panel}
        ref={dialog}
        onCancel={(e) => {
          if (!entered) e.preventDefault();
          else setPanel(null);
        }}
        onClick={(e) => {
          if (entered && e.target === dialog.current) {
            const r = (
              dialog.current.querySelector<HTMLElement>('.profile-sheet') ?? dialog.current
            ).getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setPanel(null);
          }
        }}
      >
        {panel === 'role' && (
          <>
            {title('', '어떻게 참여할까요?')}
            <RolePicker
              onSelect={(role) => {
                setMemberProfile({ ...memberProfile, role });
                setPanel(memberProfile.completed ? 'registration' : 'avatar');
              }}
            />
          </>
        )}
        {panel === 'registration' && (
          <>
            {title('', memberProfile.role === 'musician' ? '뮤지션 등록' : '나를 소개해요')}
            <Registration
              profile={memberProfile}
              onBack={() => setPanel('role')}
              onSave={async (profile) => {
                if (!account.demo) await saveProfile(account.id, profile, avatar);
                setMemberProfile(profile);
                localStorage.setItem(storagePrefix + '-profile', JSON.stringify(profile));
                setPanel(entered ? 'account' : 'channels');
              }}
            />
          </>
        )}
        {panel === 'account' && (
          <>
            {title('', '\uB0B4 \uD504\uB85C\uD544')}
            <AccountPanel
              fanStats={<FanProfile userId={account.id} own demo={account.demo} />}
              avatar={avatar}
              onCustomize={() => setPanel('avatar')}
              profile={memberProfile}
              onEditProfile={() => setPanel('registration')}
              onChooseIcon={async (id) => {
                const next = { ...avatar, profileIcon: id };
                if (!account.demo) await saveProfile(account.id, memberProfile, next);
                setAvatar(next);
              }}
            />
          </>
        )}
        {panel === 'avatar' && (
          <>
            {title(
              '나의 주민 카드',
              entered ? '오늘은 어떤 모습으로?' : '나만의 모습을 만들어 봐요',
            )}
            <AvatarEditor
              avatar={avatar}
              onChange={setAvatar}
              onContinue={async () => {
                if (!avatar.name.trim()) return;
                if (entered && !account.demo) {
                  try {
                    await saveProfile(account.id, memberProfile, avatar);
                  } catch {
                    notify(
                      '\uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
                    );
                    return;
                  }
                }
                setPanel(entered ? 'account' : 'registration');
              }}
            />
          </>
        )}
        {panel === 'channels' && (
          <>
            {title('', '채널 목록')}
            <ChannelPicker
              current={channel}
              entered={entered}
              onSelect={changeChannel}
              populations={populations}
              busy={town.busy}
              capacities={town.state.channels.map((c) => c.capacity)}
            />
          </>
        )}
        {panel === 'settings' && (
          <>
            {title('', '설정')}
            <div className="settings-menu">
              <SoundEffectsSetting />
              <Button variant="ghost" onClick={() => setPanel('channels')}>
                <Flaticon name="map-3d" size={16} />
                채널 변경
              </Button>
              <Button variant="ghost" onClick={() => setPanel('following')}>
                <Flaticon name="terms-3d" size={16} />
                팔로우한 사람들
              </Button>
              <div className="settings-policy-links">
                <a href="/terms/" target="_blank" rel="noopener noreferrer">
                  <Flaticon name="document-3d" size={16} />
                  이용약관
                </a>
                <a href="/privacy/" target="_blank" rel="noopener noreferrer">
                  <Flaticon name="privacy-3d" size={16} />
                  개인정보처리방침
                </a>
                <a href="/safety/" target="_blank" rel="noopener noreferrer">
                  <Flaticon name="safety-3d" size={16} />
                  안전 가이드
                </a>
                <a href="mailto:teamsda01@gmail.com">
                  <Flaticon name="mail-3d" size={16} />
                  문의하기
                </a>
              </div>
              <Button
                variant="ghost"
                disabled={signingOut}
                onClick={async () => {
                  if (signingOut) return;
                  setSigningOut(true);
                  try {
                    if (entered && !account.demo) await town.act('leave');
                    await account.signOut();
                  } catch {
                    setActionError('로그아웃하지 못했어요. 다시 시도해 주세요.');
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                <Flaticon name="logout" size={16} />
                {signingOut ? '로그아웃 중…' : '로그아웃'}
              </Button>
              <Button
                variant="ghost"
                className="delete-account-menu"
                onClick={() => setDeletingAccount(true)}
              >
                <Flaticon name="delete" size={16} />
                탈퇴하기
              </Button>
            </div>
          </>
        )}
        {panel === 'profile' && (
          <>
            {title('LIVE BUSKING', '지금 노래하는 사람')}
            <div className="profile-heading">
              <div className="profile-icon">
                <Flaticon name="music" size={40} />
              </div>
              <div>
                <h2>
                  {selectedMusician ? (
                    <Button
                      className="musician-profile-link"
                      aria-label={`${selected.artist} 프로필 보기`}
                      onClick={() => {
                        setSelectedPerson(selectedMusician);
                        setPanel('participant');
                      }}
                    >
                      {selected.artist}
                      <span>
                        프로필 보기 <ArrowUpRight size={14} />
                      </span>
                    </Button>
                  ) : (
                    selected.artist
                  )}
                </h2>
                <span className="pill">{selected.genre}</span>
              </div>
            </div>
            {selected.bio && (
              <p className="modal-sub">
                <ProfileBio text={selected.bio} />
              </p>
            )}
            <FanProfile
              userId={selectedMusician?.id}
              own={selectedMusician?.id === account.id}
              demo={account.demo}
            />
            <div className="profile-stats">
              <div>
                <strong>{selected.listeners}</strong>관람 중
              </div>
              <div>
                <strong className="!text-sm mt-1">{selected.name}</strong>지금 공연하는 곳
              </div>
            </div>
            <div className="musician-social">
              {selectedMusician?.instagram ? (
                <a href={selectedMusician.instagram} target="_blank" rel="noopener noreferrer">
                  인스타그램
                </a>
              ) : null}
              {selectedMusician?.soundcloud && (
                <a href={selectedMusician.soundcloud} target="_blank" rel="noopener noreferrer">
                  사운드클라우드
                </a>
              )}
            </div>
            <div className="actions musician-primary-actions">
              <Button
                variant="secondary"
                className="secondary"
                onClick={() => {
                  position.current = { x: selected.x, y: selected.y + 90 };
                  setNear(selected);
                  setPanel(null);
                }}
              >
                무대 앞에서 듣기
              </Button>
            </div>
            <div className="actions musician-secondary-actions">
              <Button
                variant="ghost"
                className="text-button flex items-center justify-center gap-1"
                onClick={() =>
                  setMuted(
                    muted.includes(selected.id)
                      ? muted.filter((id) => id !== selected.id)
                      : [...muted, selected.id],
                  )
                }
              >
                <VolumeX size={12} />
                {muted.includes(selected.id) ? '음소거 해제' : '나에게만 음소거'}
              </Button>
              <Button
                variant="ghost"
                className="text-button"
                onClick={() => {
                  if (!selectedMusician || selectedMusician.id === account.id) return;
                  setSelectedPerson(selectedMusician);
                  setPanel('report');
                }}
              >
                공연 신고
              </Button>
              <Button variant="ghost" className="text-button" onClick={() => setPanel('queue')}>
                이 자리 대기
              </Button>
            </div>
            <p className="notice">
              무대 가까이 가면 공연을 들을 수 있어요. 소리가 나지 않으면 ‘소리 켜기’를 눌러 주세요.
            </p>
          </>
        )}
        {panel === 'queue' && (
          <>
            {title('YOUR VOICE, YOUR STAGE', '누구나 시작할 수 있어요')}
            <BuskingBook
              stage={selected}
              performing={performing !== null}
              busy={town.busy}
              musician={memberProfile.role === 'musician'}
              onJoin={() => join(selected)}
            />
          </>
        )}
        {panel === 'following' && (
          <>
            {title('', '팔로우한 사람들')}
            <FollowedProfiles
              demo={account.demo}
              onSelect={(person) => {
                setSelectedPerson(person);
                setPanel('participant');
              }}
            />
          </>
        )}
        {panel === 'participant' && selectedPerson && (
          <>
            {title('', '프로필')}
            <ParticipantProfile
              person={selectedPerson}
              onReport={() => setPanel('report')}
              fanStats={
                <FanProfile
                  userId={selectedPerson.id}
                  own={selectedPerson.id === account.id}
                  demo={account.demo}
                />
              }
            />
          </>
        )}
        {panel === 'report' && selectedPerson && (
          <>
            {title('', '신고하기')}
            <ReportForm
              key={selectedPerson.id}
              target={selectedPerson}
              onClose={() => setPanel(null)}
            />
          </>
        )}
      </DialogPanel>
      {deletingAccount && (
        <DeleteAccountDialog
          demo={account.demo}
          onClose={() => setDeletingAccount(false)}
          onDelete={account.deleteAccount}
        />
      )}
      {actionError && <ErrorModal message={actionError} onClose={() => setActionError('')} />}
      {town.error && town.error !== dismissedTownError && (
        <ErrorModal
          message={town.error}
          onClose={() => setDismissedTownError(town.error)}
          onRetry={() => {
            setDismissedTownError('');
            void town.request('snapshot').catch((error) => setActionError(error.message));
          }}
        />
      )}
      <div id="toast" role="status" className={toast ? 'visible' : ''}>
        {toast}
      </div>
    </>
  );
}
startTelemetry();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SoundEffectsProvider>
      <DeviceGuide>
        <LoginGate>
          {(account) => (
            <ProfileLoader key={account.id} account={account}>
              {(initial) => <App account={account} initial={initial} />}
            </ProfileLoader>
          )}
        </LoginGate>
      </DeviceGuide>
    </SoundEffectsProvider>
  </React.StrictMode>,
);
