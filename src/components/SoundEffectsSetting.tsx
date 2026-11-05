import { Flaticon } from '../Flaticon';
import { useSoundSettings } from '../useSoundEffects';
import { Button } from './ui/Button';

export function SoundEffectsSetting() {
  const { enabled, setEnabled } = useSoundSettings();
  return (
    <div className="sound-effects-setting">
      <Flaticon name="alarm" size={24} />
      <span className="sound-effects-label">효과음</span>
      <span className="sound-effects-state" aria-hidden="true">
        {enabled ? '켜짐' : '꺼짐'}
      </span>
      <Button
        className="sound-effects-switch"
        role="switch"
        aria-label="효과음"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
      >
        <span className="sound-effects-track" aria-hidden="true">
          <span />
        </span>
      </Button>
    </div>
  );
}
