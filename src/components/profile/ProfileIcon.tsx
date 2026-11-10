import { UserRound } from 'lucide-react';
import type { Avatar } from '../../data/model';
import { ModularPortrait } from '../avatar/ModularPortrait';
import './profile-icon.css';

const illustratedIcons = [
  { id: 'leaf', label: '잎사귀' },
  { id: 'music', label: '음표' },
  { id: 'headphones', label: '헤드폰' },
  { id: 'mic', label: '마이크' },
  { id: 'star', label: '별' },
  { id: 'moon', label: '달' },
] as const;
export const profileIcons = [
  { id: 'person', label: '사람 (기본)' },
  { id: 'character', label: '내 캐릭터' },
  ...illustratedIcons,
] as const;

export function ProfileIcon({
  id,
  size = 18,
  avatar,
}: {
  id?: string;
  size?: number;
  avatar?: Avatar;
}) {
  const index = illustratedIcons.findIndex((item) => item.id === id);
  if (id === 'character' && avatar) {
    return (
      <span
        className="profile-character-badge"
        style={{ width: size + 10, height: size + 10 }}
        aria-hidden="true"
      >
        <ModularPortrait avatar={avatar} />
      </span>
    );
  }
  if (index < 0) {
    return (
      <span
        className="profile-person-badge"
        style={{ width: size + 10, height: size + 10 }}
        aria-hidden="true"
      >
        <UserRound size={size + 6} strokeWidth={1.7} />
      </span>
    );
  }
  return (
    <span
      className="profile-icon-art"
      aria-hidden="true"
      style={{
        width: size + 10,
        height: size + 10,
        backgroundImage: 'url(/art/profile-icons-v1.png)',
        backgroundSize: '300% 200%',
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
