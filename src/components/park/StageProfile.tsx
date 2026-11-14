import { ChevronRight, Headphones, VolumeX, Volume2, Users, ListPlus } from 'lucide-react';
import { Flaticon } from '../ui/Flaticon';
import { Button } from '../ui/Button';
import { ProfileIcon } from '../profile/ProfileIcon';
import { ProfileBio } from '../profile/ProfileBio';
import type { Avatar, Stage } from '../../data/model';
import type { Participant } from '../../hooks/useTown';
import './stage-profile.css';
type Props = {
  selected: Stage;
  selectedMusician: Participant | undefined;
  performerAvatar?: Avatar;
  own: boolean;
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
  performerAvatar,
  own,
  muted,
  onProfile,
  onListen,
  onMute,
  onReport,
  onQueue,
}: Props) {
  return (
    <section className="stage-profile-card" aria-label="공연 정보">
      {!own && (
        <div className="stage-top-controls">
          <Button variant="ghost" onClick={onMute} aria-pressed={muted}>
            {muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {muted ? '음소거 해제' : '음소거'}
          </Button>
          <Button variant="ghost" onClick={onReport}>
            <Flaticon name="siren" size={14} />
            신고
          </Button>
        </div>
      )}
      <div className="stage-performer">
        <div className="stage-performer-icon">
          <ProfileIcon id={performerAvatar?.profileIcon} avatar={performerAvatar} size={32} />
        </div>
        <div className="stage-performer-copy">
          <p className="stage-live-label">
            <span aria-hidden="true" />
            뮤지션
          </p>
          <h3>{selected.artist || '공연자'}</h3>
        </div>
        {selectedMusician && (
          <Button
            variant="ghost"
            className="stage-profile-link"
            onClick={onProfile}
            aria-label={`${selected.artist} 프로필 보기`}
          >
            프로필 <ChevronRight size={14} aria-hidden="true" />
          </Button>
        )}
      </div>
      {selected.bio && (
        <p className="stage-performer-bio">
          <ProfileBio text={selected.bio} />
        </p>
      )}
      <div className="stage-location-row">
        <span>{selected.name}</span>
        <span className="stage-listeners">
          <Users size={15} />
          <span>{selected.listeners}명 관람</span>
        </span>
      </div>
      {!own && (
        <>
          <Button variant="primary" className="stage-listen-button" onClick={onListen}>
            <Headphones size={19} />
            무대 앞에서 듣기
          </Button>
          <div className="stage-secondary-controls">
            <Button variant="ghost" onClick={onQueue}>
              <ListPlus size={15} />
              대기
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
