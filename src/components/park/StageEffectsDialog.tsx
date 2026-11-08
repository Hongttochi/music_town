import { useEffect, useRef } from 'react';
import { DialogPanel, PanelHeading } from '../ui/Panel';
import { Button } from '../ui/Button';
import { stageEffectPresets, type StageEffects } from '../../audio/stageEffects';
import './stage-effects.css';
export function StageEffectsDialog({
  settings,
  onChange,
  onClose,
}: {
  settings: StageEffects;
  onChange: (value: StageEffects) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <DialogPanel
      ref={ref}
      className="stage-effects-dialog"
      aria-label="공연 음향 설정"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <PanelHeading title="공연 음향" onClose={onClose} />
      <p className="stage-effects-note">조절한 소리가 관객에게 그대로 전달돼요.</p>
      <div className="stage-effect-presets">
        {stageEffectPresets.map((preset) => (
          <Button
            key={preset.name}
            aria-pressed={Object.keys(settings).every(
              (key) =>
                settings[key as keyof StageEffects] === preset.settings[key as keyof StageEffects],
            )}
            onClick={() => onChange(preset.settings)}
          >
            {preset.name}
          </Button>
        ))}
      </div>
      {(
        [
          ['volume', '마이크 볼륨', 150],
          ['reverb', '리버브 · 공간 울림', 60],
          ['echo', '에코 · 반복 울림', 50],
        ] as const
      ).map(([key, label, max]) => (
        <label className="stage-effect-slider" key={key}>
          <span>
            {label}
            <output>{settings[key]}%</output>
          </span>
          <input
            type="range"
            min="0"
            max={max}
            step="1"
            value={settings[key]}
            aria-label={label}
            onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}
          />
        </label>
      ))}
    </DialogPanel>
  );
}
