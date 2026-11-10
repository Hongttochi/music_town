import './town-header.css';
import { Button } from '../ui/Button';
import { ProfileIcon } from '../profile/ProfileIcon';
import { Flaticon } from '../ui/Flaticon';
import type { Avatar } from '../../data/model';
export function TownHeader({
  channel,
  profileIcon,
  avatar,
  onProfile,
  onSettings,
  onRankings,
}: {
  channel: number;
  profileIcon?: string;
  avatar?: Avatar;
  onProfile: () => void;
  onSettings: () => void;
  onRankings: () => void;
}) {
  return (
    <header className="topbar">
      <div className="header-center">
        <span className="live-dot" />
        <span>초록 공원 · CH {String(channel + 1).padStart(2, '0')}</span>
      </div>
      <div className="header-right">
        <Button
          className="icon-button ranking-button"
          onClick={onRankings}
          aria-label="뮤지션 랭킹"
          title="뮤지션 랭킹"
        >
          <img src="/icons/achievement-award.png" width={22} height={22} alt="" />
        </Button>
        <Button className="avatar-button" onClick={onProfile} aria-label="마이페이지">
          <ProfileIcon id={profileIcon} avatar={avatar} size={10} />
        </Button>
        <Button className="icon-button" onClick={onSettings} aria-label="설정">
          <Flaticon name="setting" size={18} className="settings-button-icon" />
        </Button>
      </div>
    </header>
  );
}
