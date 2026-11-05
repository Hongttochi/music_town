import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Flaticon } from '../Flaticon';
import { useSoundSettings } from '../useSoundEffects';
import { Button } from './ui/Button';

export function SoundEffectsSetting() {
  const { enabled, volume, setVolume } = useSoundSettings();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const percent = enabled ? Math.round(volume * 100) : 0;
  return (
    <div className="sound-effects-setting">
      <Button
        variant="ghost"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <Flaticon name="alarm" size={16} />
        <span className="sound-effects-label">효과음</span>
        <span className="sound-effects-state">{percent === 0 ? '꺼짐' : `${percent}%`}</span>
        {expanded ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </Button>
      {expanded && (
        <div className="sound-effects-slider" id={id}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent}
            aria-label="효과음 볼륨"
            aria-valuetext={percent === 0 ? '꺼짐' : `${percent}%`}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
          />
          <output aria-hidden="true">{percent}%</output>
        </div>
      )}
    </div>
  );
}
