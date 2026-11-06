import { ProfileSocialLinks } from './ProfileSocialLinks';
import { ProfileBio } from './ProfileBio';
import type { Participant } from '../useTown';
import { ModularPortrait } from '../ModularPortrait';
import { Button } from './ui/Button';
import './participant-profile.css';

export function ParticipantProfile({
  person,
  onReport,
  fanStats,
}: {
  fanStats?: React.ReactNode;
  person: Participant;
  onReport: () => void;
}) {
  return (
    <div className="participant-profile">
      <div className="participant-identity">
        <ModularPortrait avatar={person.avatar} />
        <div className="participant-identity-details">
          <small>{person.role === 'musician' ? '뮤지션' : '관람객'}</small>
          <div className="profile-name-line">
            <h3>{person.avatar.name}</h3>
            {person.role === 'musician' && (
              <ProfileSocialLinks instagram={person.instagram} soundcloud={person.soundcloud} />
            )}
          </div>
        </div>
      </div>
      <section className="participant-about" aria-label="자기소개">
        <h4>자기소개</h4>
        <div className="participant-bio">
          <ProfileBio text={person.bio || '아직 자기소개가 없어요.'} />
        </div>
      </section>
      {fanStats}
      <Button variant="ghost" className="participant-report" onClick={onReport}>
        신고하기
      </Button>
    </div>
  );
}
