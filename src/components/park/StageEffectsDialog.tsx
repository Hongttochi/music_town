import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DialogPanel } from '../ui/Panel';
import { stageEffectPresets, type StageEffects } from '../../audio/stageEffects';
import { AudioKnob } from './AudioKnob';
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
      <div className="effects-machine">
        <header className="effects-machine-header">
          <div>
            <strong>TOWN ECHO</strong>
            <span>공연 음향</span>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </header>
        <div className="effects-machine-face">
          <div className="effects-mode-panel">
            <span className="effects-panel-label">
              <i aria-hidden="true" /> SOUND MODE
            </span>
            <div className="stage-effect-presets">
              {stageEffectPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  aria-pressed={Object.keys(settings).every(
                    (key) =>
                      settings[key as keyof StageEffects] ===
                      preset.settings[key as keyof StageEffects],
                  )}
                  onClick={() => onChange(preset.settings)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className="effects-knob-bank">
            {(
              [
                ['volume', '마이크 볼륨', 'MIC VOLUME', 150],
                ['reverb', '리버브 · 공간 울림', 'REVERB', 60],
                ['echo', '에코 · 반복 울림', 'ECHO', 50],
              ] as const
            ).map(([key, label, caption, max]) => (
              <AudioKnob
                key={key}
                label={label}
                caption={caption}
                max={max}
                value={settings[key]}
                onChange={(value) => onChange({ ...settings, [key]: value })}
              />
            ))}
          </div>
        </div>
        <footer className="effects-machine-footer">
          <span className="effects-jack" aria-hidden="true" />
          <span>위아래로 드래그 · 방향키로 미세 조절</span>
          <small>관객에게 적용</small>
        </footer>
      </div>
    </DialogPanel>
  );
}
