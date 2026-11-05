import type { Participant } from '../useTown';
import { ModularPortrait } from '../ModularPortrait';
import { Button } from './ui/Button';
import './participant-profile.css';

export function ParticipantProfile({
  person,
  onReport,
}: {
  person: Participant;
  onReport: () => void;
}) {
  return (
    <div className="participant-profile">
      <div className="participant-identity">
        <ModularPortrait avatar={person.avatar} />
        <div>
          <small>{person.role === 'musician' ? '뮤지션' : '관람객'}</small>
          <h3>{person.avatar.name}</h3>
        </div>
      </div>
      <p className="participant-bio">{person.bio || '아직 자기소개가 없어요.'}</p>
      {person.role === 'musician' && (
        <div className="participant-socials">
          {(['instagram', 'soundcloud'] as const).map(
            (kind) =>
              person[kind] && (
                <a key={kind} href={person[kind]} target="_blank" rel="noopener noreferrer">
                  <img src={`/icons/brands/${kind}.svg`} width={18} height={18} alt="" />
                  {kind === 'instagram' ? '인스타그램' : '사운드클라우드'}
                </a>
              ),
          )}
        </div>
      )}
      <Button variant="ghost" className="participant-report" onClick={onReport}>
        신고하기
      </Button>
    </div>
  );
}
