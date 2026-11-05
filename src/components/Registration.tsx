import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { RoleIcon } from './RoleIcon';
import { Button } from './ui/Button';
import { ErrorModal } from './ui/ErrorModal';
import './registration.css';

export type MemberProfile = {
  role: 'listener' | 'musician';
  bio: string;
  instagram: string;
  soundcloud: string;
  completed: boolean;
};
export const emptyProfile: MemberProfile = {
  role: 'listener',
  bio: '',
  instagram: '',
  soundcloud: '',
  completed: false,
};

export function RolePicker({ onSelect }: { onSelect: (role: MemberProfile['role']) => void }) {
  return (
    <div className="role-picker">
      <Button variant="choice" onClick={() => onSelect('listener')}>
        <RoleIcon />
        <span>
          <strong>관람객</strong>
          <small>산책하며 음악을 듣고 응원해요</small>
        </span>
      </Button>
      <Button variant="choice" onClick={() => onSelect('musician')}>
        <RoleIcon musician />
        <span>
          <strong>뮤지션</strong>
          <small>나만의 목소리로 무대에 올라요</small>
        </span>
      </Button>
    </div>
  );
}

function validLink(value: string, domain: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' && (url.hostname === domain || url.hostname === 'www.' + domain)
    );
  } catch {
    return false;
  }
}

export function Registration({
  profile,
  onSave,
  onBack,
}: {
  profile: MemberProfile;
  onSave: (profile: MemberProfile) => Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const musician = draft.role === 'musician';
  return (
    <form
      className="registration-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          musician &&
          (!validLink(draft.instagram, 'instagram.com') ||
            !validLink(draft.soundcloud, 'soundcloud.com'))
        ) {
          setError('인스타그램과 사운드클라우드의 https:// 프로필 주소를 입력해 주세요.');
          return;
        }
        if (saving) return;
        setSaving(true);
        setError('');
        try {
          await onSave({
            ...draft,
            bio: draft.bio.trim(),
            instagram: musician ? draft.instagram.trim() : '',
            soundcloud: musician ? draft.soundcloud.trim() : '',
            completed: true,
          });
        } catch {
          setError(
            '\uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <p>소개와 링크는 나중에 채워도 괜찮아요.</p>
      <div className={`registration-fields ${musician ? 'has-social' : ''}`}>
        <div className="registration-bio">
          <label htmlFor="member-bio">
            <span className="registration-label">
              <UserRound size={15} aria-hidden="true" />
              자기소개
            </span>{' '}
            <span>{draft.bio.length}/300</span>
          </label>
          <textarea
            id="member-bio"
            maxLength={300}
            rows={4}
            value={draft.bio}
            placeholder={
              musician
                ? '어떤 음악을 들려주고 싶나요?'
                : '좋아하는 음악이나 나의 이야기를 들려주세요.'
            }
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          />
        </div>
        {musician && (
          <div className="registration-social">
            <label htmlFor="member-instagram">
              <span className="registration-label">
                <img
                  src="/icons/brands/instagram.svg"
                  width={16}
                  height={16}
                  alt=""
                  aria-hidden="true"
                />
                인스타그램
              </span>
            </label>
            <input
              id="member-instagram"
              type="url"
              placeholder="https://www.instagram.com/username"
              value={draft.instagram}
              onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
            />
            <label htmlFor="member-soundcloud">
              <span className="registration-label">
                <img
                  src="/icons/brands/soundcloud.svg"
                  width={20}
                  height={20}
                  alt=""
                  aria-hidden="true"
                />
                사운드클라우드
              </span>
            </label>
            <input
              id="member-soundcloud"
              type="url"
              placeholder="https://soundcloud.com/username"
              value={draft.soundcloud}
              onChange={(e) => setDraft({ ...draft, soundcloud: e.target.value })}
            />
          </div>
        )}
      </div>
      {error && (
        <ErrorModal
          title="저장 내용을 확인해 주세요"
          message={error}
          onClose={() => setError('')}
        />
      )}
      <div className="registration-actions">
        <Button type="button" variant="secondary" disabled={saving} onClick={onBack}>
          역할 다시 선택
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? '저장 중…' : '공원으로 가기'}
        </Button>
      </div>
    </form>
  );
}
