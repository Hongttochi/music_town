import { ArrowUpRight, VolumeX } from 'lucide-react';
import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import { FanProfile } from '../profile/FanProfile';
import { ProfileBio } from '../profile/ProfileBio';
import type { Stage } from '../../data/model';
import type { Participant } from '../../hooks/useTown';
type Props = {
  selected: Stage;
  selectedMusician: Participant | undefined;
  accountId: string;
  demo: boolean;
  muted: boolean;
  onProfile: () => void;
  onListen: () => void;
  onMute: () => void;
  onReport: () => void;
  onQueue: () => void;
};
export function StageProfile({
  selected,
  selectedMusician,
  accountId,
  demo,
  muted,
  onProfile,
  onListen,
  onMute,
  onReport,
  onQueue,
}: Props) {
  return (
    <>
      {' '}
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
                onClick={onProfile}
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
        own={selectedMusician?.id === accountId}
        demo={demo}
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
        <Button variant="secondary" className="secondary" onClick={onListen}>
          무대 앞에서 듣기
        </Button>
      </div>
      <div className="actions musician-secondary-actions">
        <Button
          variant="ghost"
          className="text-button flex items-center justify-center gap-1"
          onClick={onMute}
        >
          <VolumeX size={12} />
          {muted ? '음소거 해제' : '나에게만 음소거'}
        </Button>
        <Button variant="ghost" className="text-button" onClick={onReport}>
          공연 신고
        </Button>
        <Button variant="ghost" className="text-button" onClick={onQueue}>
          이 자리 대기
        </Button>
      </div>
      <p className="notice">
        무대 가까이 가면 공연을 들을 수 있어요. 소리가 나지 않으면 ‘소리 켜기’를 눌러 주세요.
      </p>
    </>
  );
}
