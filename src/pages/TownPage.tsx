import { BAR_STAGE_ID } from '../data/bar';
import { ChannelEntryDialog } from '../components/park/ChannelEntryDialog';
import { useParkTimeTransition } from '../hooks/useParkTimeTransition';
import { TimeTransition } from '../components/park/TimeTransition';
import { PerformanceControls } from '../components/park/PerformanceControls';
import { StageProfile } from '../components/park/StageProfile';
import { SettingsMenu } from '../components/settings/SettingsMenu';
import { MovementJoystick } from '../components/park/MovementJoystick';
import { StageLabels } from '../components/park/StageLabels';
import { StageDirectory } from '../components/park/StageDirectory';
import { ParkIntroduction } from '../components/park/ParkIntroduction';
import { TownHeader } from '../components/layout/TownHeader';
import { ParkMinimap } from '../components/park/ParkMinimap';
import { FanProfile, FollowedProfiles } from '../components/profile/FanProfile';
import { fanAction } from '../hooks/useFanStats';
import { useAmbientAudio } from '../hooks/useAmbientAudio';
import { ErrorModal } from '../components/ui/ErrorModal';
import { useTown, type Participant } from '../hooks/useTown';
import { useStageMicrophone } from '../hooks/useStageMicrophone';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { DeleteAccountDialog } from '../components/settings/DeleteAccountDialog';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { ParticipantProfile } from '../components/profile/ParticipantProfile';
import { ReportForm } from '../components/legal/ReportForm';
import { saveProfile, type SavedProfile } from '../services/profileRepository';
import {
  RolePicker,
  Registration,
  emptyProfile,
  type MemberProfile,
} from '../components/auth/Registration';
import { BuskingBook } from '../components/park/BuskingBook';
import { ChannelPicker } from '../components/park/ChannelPicker';
import { AccountPanel } from '../components/profile/AccountPanel';
import { HourlyClock } from '../components/layout/HourlyClock';
import { DialogPanel, PanelHeading } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Flaticon } from '../components/ui/Flaticon';
import { AvatarEditor } from '../components/avatar/AvatarEditor';
import { type Account } from './LoginPage';
import { useEffect, useRef, useState } from 'react';
import { Park, Position } from '../components/park/Park';
import { readSaved } from '../utils/storage';
import { koreanHour } from '../utils/time';
import {
  Avatar,
  Stage,
  stages as demoStages,
  populations as demoPopulations,
  defaultAvatar,
} from '../data/model';

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
export function TownPage({ account, initial }: { account: Account; initial: SavedProfile | null }) {
  const [enteringChannel, setEnteringChannel] = useState<number | null>(null);
  const entryPending = useRef(false);
  const [entrySceneReady, setEntrySceneReady] = useState(false);
  const [entryRevision, setEntryRevision] = useState(0);
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
  const timeTransition = useParkTimeTransition(entered);
  useEffect(() => {
    if (timeTransition.active) setPanel(null);
  }, [timeTransition.active]);
  const [toast, setToast] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dismissedTownError, setDismissedTownError] = useState('');
  const [queue, setQueue] = useState<number | null>(null);
  const [performing, setPerforming] = useState<number | null>(null);
  const [reaction, setReaction] = useState<{ symbol: string; at: number } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Participant | null>(null);
  const [now, setNow] = useState(new Date());
  const dialog = useRef<HTMLDialogElement>(null);
  const position = useRef<Position>({ x: 650, y: 470 });
  const mapPositions = useRef(new Map<string, Position>());
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
  useAmbientAudio(
    position,
    entered,
    timeTransition.active || microphone.state === 'on' || voice.status === 'listening',
    timeTransition.night,
  );
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
    if (s.id === BAR_STAGE_ID && !timeTransition.night) {
      notify('달빛 바 무대는 저녁 7시부터 아침 6시까지 열려요.');
      return;
    }
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
    if (s.id === BAR_STAGE_ID && !timeTransition.night) {
      notify('아직 달빛 바 공연 시간이 아니에요.');
      return;
    }
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
    if (entryPending.current) return;
    entryPending.current = true;
    setEntrySceneReady(false);
    setEnteringChannel(id);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!account.demo) await town.act('enter', id);
      setEntryRevision((value) => value + 1);
      setEntered(true);
      setChannel(id);
      setNear(null);
      position.current = { x: 650, y: 470 };
      setPanel(null);
      notify(`${String(id + 1).padStart(2, '0')}번 공원에 도착했어요.`);
    } catch (error) {
      setActionError((error as Error).message);
      entryPending.current = false;
      setEnteringChannel(null);
    }
  };
  const title = (_eyebrow: string, name: string) => (
    <PanelHeading title={name} onClose={entered ? () => setPanel(null) : undefined} />
  );
  const hour = koreanHour();
  const night = timeTransition.night;
  return (
    <>
      <main id="app" className={entered ? '' : 'before-entry'}>
        {enteringChannel !== null && (
          <ChannelEntryDialog
            channel={enteringChannel}
            avatar={memberProfile.completed ? avatar : undefined}
            ready={entrySceneReady}
            onComplete={() => {
              entryPending.current = false;
              setEnteringChannel(null);
            }}
          />
        )}
        <TimeTransition phase={timeTransition.phase} message={timeTransition.message} />
        {entered && (
          <>
            <Park
              onReady={() => setEntrySceneReady(true)}
              key={`${entryRevision}|${timeTransition.revision}|${channel}|${stages.map((s) => `${s.id}:${s.x}:${s.y}`).join('|')}`}
              night={night}
              timeTransition={timeTransition.active}
              focusNpc={timeTransition.focusNpc}
              mapPositions={mapPositions}
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
            <TownHeader
              channel={channel}
              profileIcon={avatar.profileIcon}
              onProfile={() => setPanel('account')}
              onSettings={() => setPanel('settings')}
            />
            <ParkIntroduction hour={hour} night={night} />
            <StageDirectory
              stages={stages}
              population={populations[channel]}
              performing={performing}
              name={avatar.name}
              openStage={openStage}
            />
            <StageLabels
              stages={stages}
              near={near}
              performing={performing}
              name={avatar.name}
              openStage={openStage}
            />
            <MovementJoystick motion={motion} />
            <PerformanceControls
              queue={queue}
              performing={performing}
              queuePlace={queuePlace}
              stages={stages}
              voice={voice}
              microphone={microphone}
              endsAt={town.performance?.ends_at}
              now={now}
              onCancel={() => {
                void serverAction('cancel');
              }}
              onFinish={async () => {
                try {
                  await town.act('finish');
                  position.current.y += 70;
                  notify('공연을 마쳤어요. 수고했어요!');
                } catch (error) {
                  setActionError((error as Error).message);
                }
              }}
              onReaction={(symbol, sound) => {
                setReaction({ symbol: symbol, at: Date.now() });
                playSound(sound);
                if (
                  symbol === '♡' &&
                  !account.demo &&
                  audiblePerformance &&
                  audiblePerformance.user_id !== account.id
                ) {
                  void fanAction(audiblePerformance.user_id, 'heart', true).catch((error) =>
                    notify(error.message),
                  );
                }
              }}
            />
            <ParkMinimap
              position={position}
              mapPositions={mapPositions}
              stages={stages}
              participants={town.state.participants.filter((p) => p.id !== account.id)}
            />
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
            <SettingsMenu
              onChannels={() => setPanel('channels')}
              onFollowing={() => setPanel('following')}
              onDelete={() => setDeletingAccount(true)}
              signingOut={signingOut}
              onSignOut={async () => {
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
            />
          </>
        )}
        {panel === 'profile' && (
          <>
            {title('LIVE BUSKING', '지금 노래하는 사람')}
            <StageProfile
              selected={selected}
              selectedMusician={selectedMusician}
              accountId={account.id}
              demo={account.demo}
              muted={muted.includes(selected.id)}
              onProfile={() => {
                if (selectedMusician) {
                  setSelectedPerson(selectedMusician);
                  setPanel('participant');
                }
              }}
              onListen={() => {
                position.current = { x: selected.x, y: selected.y + 90 };
                setNear(selected);
                setPanel(null);
              }}
              onMute={() =>
                setMuted(
                  muted.includes(selected.id)
                    ? muted.filter((id) => id !== selected.id)
                    : [...muted, selected.id],
                )
              }
              onReport={() => {
                if (selectedMusician && selectedMusician.id !== account.id) {
                  setSelectedPerson(selectedMusician);
                  setPanel('report');
                }
              }}
              onQueue={() => setPanel('queue')}
            />
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
              own={selectedPerson.id === account.id}
              demo={account.demo}
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
