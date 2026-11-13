import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Flaticon } from '../ui/Flaticon';
import { useSoundSettings } from '../../hooks/useSoundEffects';
import { Button } from '../ui/Button';
import './sound-settings.css';

export function SoundEffectsSetting() {
  const { enabled, volume, setVolume, ambientVolume, setAmbientVolume } = useSoundSettings();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const percent = enabled ? Math.round(volume * 100) : 0;
  return (
    <div className="sound-effects-setting" data-expanded={expanded}>
      <Button
        variant="ghost"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <Flaticon name="alarm" size={16} />
        <span className="sound-effects-label">소리 설정</span>
        {expanded ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </Button>
      <div className="sound-effects-reveal" id={id} aria-hidden={!expanded} inert={!expanded}>
        <div className="sound-effects-reveal-inner">
          <div className="sound-settings-controls">
            <label className="sound-settings-row">
              <span>배경음</span>
              <div className="sound-effects-slider">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(ambientVolume * 100)}
                  aria-label="배경음 볼륨"
                  aria-valuetext={
                    ambientVolume === 0 ? '꺼짐' : `${Math.round(ambientVolume * 100)}%`
                  }
                  onChange={(event) => setAmbientVolume(Number(event.target.value) / 100)}
                />
                <output aria-hidden="true">{Math.round(ambientVolume * 100)}%</output>
              </div>
            </label>
            <label className="sound-settings-row">
              <span>선택·효과음</span>
              <div className="sound-effects-slider">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={percent}
                  aria-label="선택·효과음 볼륨"
                  aria-valuetext={percent === 0 ? '꺼짐' : `${percent}%`}
                  onChange={(event) => setVolume(Number(event.target.value) / 100)}
                />
                <output aria-hidden="true">{percent}%</output>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
