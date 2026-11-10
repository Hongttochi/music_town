import './town-header.css';
import { Trophy } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProfileIcon } from '../profile/ProfileIcon';
import { Flaticon } from '../ui/Flaticon';
export function TownHeader({
  channel,
  profileIcon,
  onProfile,
  onSettings,
  onRankings,
}: {
  channel: number;
  profileIcon?: string;
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
          className="icon-button"
          onClick={onRankings}
          aria-label="뮤지션 랭킹"
          title="뮤지션 랭킹"
        >
          <Trophy size={18} aria-hidden="true" />
        </Button>
        <Button className="avatar-button" onClick={onProfile} aria-label="마이페이지">
          <ProfileIcon id={profileIcon} size={10} />
        </Button>
        <Button className="icon-button" onClick={onSettings} aria-label="설정">
          <Flaticon name="setting" size={18} className="settings-button-icon" />
        </Button>
      </div>
    </header>
  );
}
