import { ArrowUpRight, Headphones, VolumeX, Volume2, Users, Flag, ListPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import { ProfileBio } from '../profile/ProfileBio';
import type { Stage } from '../../data/model';
import type { Participant } from '../../hooks/useTown';
import './stage-profile.css';
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
  muted,
  onProfile,
  onListen,
  onMute,
  onReport,
  onQueue,
}: Props) {
  return (
    <section className="stage-profile-card" aria-label="공연 정보">
      <div className="stage-performer">
        <div className="stage-performer-icon">
          <Flaticon name="music" size={32} />
        </div>
        <div className="stage-performer-copy">
          <p className="stage-live-label">
            <span aria-hidden="true" />
            지금 공연 중
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
            프로필 <ArrowUpRight size={14} />
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
      <Button variant="primary" className="stage-listen-button" onClick={onListen}>
        <Headphones size={19} />
        무대 앞에서 듣기
      </Button>
      <div className="stage-secondary-controls">
        <Button variant="ghost" onClick={onMute} aria-pressed={muted}>
          {muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
          {muted ? '음소거 해제' : '음소거'}
        </Button>
        <Button variant="ghost" onClick={onQueue}>
          <ListPlus size={15} />
          공연 대기
        </Button>
        <Button variant="ghost" onClick={onReport}>
          <Flag size={14} />
          신고
        </Button>
      </div>
    </section>
  );
}
