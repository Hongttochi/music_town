import { ProfileBio } from './ProfileBio';
import { useId, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { ErrorModal } from '../ui/ErrorModal';
import type { Avatar } from '../../data/model';
import type { MemberProfile } from '../auth/Registration';
import { ProfileIcon, profileIcons } from './ProfileIcon';
import { ProfileSocialLinks } from './ProfileSocialLinks';
import './account-panel.css';

export function AccountPanel({
  avatar,
  onCustomize,
  profile,
  onEditProfile,
  onChooseIcon,
  fanStats,
  fanCounts,
}: {
  fanStats?: React.ReactNode;
  fanCounts?: React.ReactNode;
  avatar: Avatar;
  onCustomize: () => void;
  profile: MemberProfile;
  onEditProfile: () => void;
  onChooseIcon: (id: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [savingIcon, setSavingIcon] = useState(false);
  const [choosingBadge, setChoosingBadge] = useState(false);
  const badgePickerId = useId();
  const badgeButton = useRef<HTMLButtonElement>(null);
  return (
    <div className="account-panel">
      <div className="account-identity">
        <button
          ref={badgeButton}
          type="button"
          className="account-badge"
          aria-label="프로필 뱃지 바꾸기"
          aria-expanded={choosingBadge}
          aria-controls={badgePickerId}
          disabled={savingIcon}
          onClick={() => setChoosingBadge((open) => !open)}
        >
          <ProfileIcon id={avatar.profileIcon} avatar={avatar} size={40} />
        </button>
        <div className="account-name">
          <span className="account-role">{profile.role === 'musician' ? '뮤지션' : '관람객'}</span>
          <div className="profile-name-line">
            <div className="account-name-summary">
              <strong>{avatar.name}</strong>
              {fanCounts}
            </div>
            {profile.role === 'musician' && (
              <ProfileSocialLinks
                instagram={profile.instagram}
                soundcloud={profile.soundcloud}
                onEditMissing={onEditProfile}
              />
            )}
          </div>
        </div>
      </div>
      <section
        id={badgePickerId}
        className="account-section account-badge-picker"
        hidden={!choosingBadge}
      >
        <h3>프로필 뱃지 선택</h3>
        <div className="profile-icon-options">
          {profileIcons.map((item) => (
            <Button
              key={item.id}
              variant="choice"
              aria-label={item.label}
              aria-pressed={(avatar.profileIcon || 'person') === item.id}
              disabled={savingIcon}
              onClick={async () => {
                setSavingIcon(true);
                try {
                  await onChooseIcon(item.id);
                  setChoosingBadge(false);
                  badgeButton.current?.focus();
                } catch {
                  setError('아이콘을 저장하지 못했어요. 다시 선택해 주세요.');
                } finally {
                  setSavingIcon(false);
                }
              }}
            >
              <ProfileIcon id={item.id} avatar={avatar} size={18} />
            </Button>
          ))}
        </div>
      </section>
      <section className="account-section account-bio-section">
        <h3>자기소개</h3>
        <p className={`account-bio ${profile.bio ? '' : 'is-empty'}`}>
          <ProfileBio text={profile.bio || '아직 소개가 없어요. 나의 이야기를 들려주세요.'} />
        </p>
      </section>
      {fanStats}
      <div className="account-edit-actions">
        <Button variant="secondary" onClick={onEditProfile}>
          <img src="/icons/pencil.png" width={18} height={18} alt="" /> 소개 수정
        </Button>
        <Button variant="secondary" onClick={onCustomize}>
          <img src="/icons/tshirt.png" width={19} height={19} alt="" /> 캐릭터 꾸미기
        </Button>
      </div>
      {error && (
        <ErrorModal title="요청을 완료하지 못했어요" message={error} onClose={() => setError('')} />
      )}
    </div>
  );
}
