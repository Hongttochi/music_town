import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import { SoundEffectsSetting } from './SoundEffectsSetting';
export function SettingsMenu({
  onChannels,
  onFollowing,
  onSignOut,
  onDelete,
  signingOut,
}: {
  onChannels: () => void;
  onFollowing: () => void;
  onSignOut: () => void;
  onDelete: () => void;
  signingOut: boolean;
}) {
  return (
    <div className="settings-menu">
      <SoundEffectsSetting />
      <Button variant="ghost" onClick={onChannels}>
        <Flaticon name="map-3d" size={16} />
        채널 변경
      </Button>
      <Button variant="ghost" onClick={onFollowing}>
        <Flaticon name="terms-3d" size={16} />
        팔로우한 사람들
      </Button>
      <div className="settings-policy-links">
        <a href="/terms/" target="_blank" rel="noopener noreferrer">
          <Flaticon name="document-3d" size={16} />
          이용약관
        </a>
        <a href="/privacy/" target="_blank" rel="noopener noreferrer">
          <Flaticon name="privacy-3d" size={16} />
          개인정보처리방침
        </a>
        <a href="/safety/" target="_blank" rel="noopener noreferrer">
          <Flaticon name="safety-3d" size={16} />
          안전 가이드
        </a>
        <a href="mailto:teamsda01@gmail.com">
          <Flaticon name="mail-3d" size={16} />
          문의하기
        </a>
      </div>
      <Button variant="ghost" disabled={signingOut} onClick={onSignOut}>
        <Flaticon name="logout" size={16} />
        {signingOut ? '로그아웃 중…' : '로그아웃'}
      </Button>
      <Button variant="ghost" className="delete-account-menu" onClick={onDelete}>
        <Flaticon name="delete" size={16} />
        탈퇴하기
      </Button>
    </div>
  );
}
