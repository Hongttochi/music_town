import { Panel } from './components/ui/Panel';
import { Button } from './components/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { AvatarTurntable } from './components/AvatarTurntable';
import { PartOptions } from './PartOptions';
import { hairNames, eyeNames, noseNames, hairColors } from './avatarParts';
import { Flaticon } from './Flaticon';
import { skinTones, eyeColors } from './appearance';
import type { Avatar } from './model';
import './avatar-editor.css';
import { EquipmentEditor } from './components/EquipmentEditor';
import { ClothingEditor } from './components/ClothingEditor';
export function AvatarEditor({
  avatar,
  onChange,
  onContinue,
}: {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<'skin' | 'hair' | 'eyes' | 'nose' | 'equipment' | 'clothing'>(
    'hair',
  );
  const preview = useRef<HTMLDivElement>(null);
  const appearanceKey = JSON.stringify({ ...avatar, name: undefined });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = preview.current?.animate(
      [
        { transform: 'translateY(3px) scale(.97)', opacity: 0.8 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
    return () => animation?.cancel();
  }, [appearanceKey]);

  return (
    <div className="character-workshop">
      <Panel className="workshop-mirror">
        <div ref={preview} className="avatar-preview-motion">
          <AvatarTurntable avatar={avatar} />
        </div>
        <p>{avatar.name.trim() || '나의 캐릭터'}</p>
      </Panel>
      <div className="workshop-desk">
        <label className="editor-label editor-field-title" htmlFor="nickname">
          공원에서 뭐라고 부를까요?
        </label>
        <input
          className="nickname-input"
          id="nickname"
          value={avatar.name}
          maxLength={12}
          placeholder="닉네임을 적어 주세요"
          onChange={(e) => onChange({ ...avatar, name: e.target.value })}
        />
        <div className="part-tabs" role="tablist" aria-label="꾸밀 부위">
          {(
            [
              { key: 'skin', label: '피부' },
              { key: 'hair', label: '머리' },
              { key: 'eyes', label: '눈' },
              { key: 'clothing', label: '옷' },
              { key: 'equipment', label: '\uC545\uC138\uC11C\uB9AC' },
              { key: 'nose', label: '코' },
            ] as const
          ).map((item) => (
            <Button
              key={item.key}
              id={`part-tab-${item.key}`}
              role="tab"
              aria-selected={tab === item.key}
              aria-controls="part-panel"
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div key={tab} id="part-panel" role="tabpanel" aria-labelledby={`part-tab-${tab}`}>
          {tab === 'equipment' && <EquipmentEditor avatar={avatar} onChange={onChange} />}
          {tab === 'clothing' && <ClothingEditor avatar={avatar} onChange={onChange} />}
          {tab === 'hair' && (
            <>
              <h3 className="editor-field-title">어떤 머리가 좋아요?</h3>
              <PartOptions avatar={avatar} field="hair" labels={hairNames} onChange={onChange} />
              <h4 className="editor-field-title">머리 색</h4>
              <div className="appearance-swatches">
                {hairColors.map((color) => (
                  <Button
                    key={color}
                    aria-label={`머리 색 ${color}`}
                    aria-pressed={(avatar.hairColor || hairColors[0]) === color}
                    style={{ background: color }}
                    onClick={() => onChange({ ...avatar, hairColor: color })}
                  />
                ))}
              </div>
            </>
          )}
          {tab === 'eyes' && (
            <>
              <h3 className="editor-field-title">나만의 눈매를 골라요</h3>
              <PartOptions avatar={avatar} field="eyeShape" labels={eyeNames} onChange={onChange} />
              <h4 className="editor-field-title">눈동자 색</h4>
              <div className="appearance-swatches">
                {eyeColors.map((tone) => (
                  <Button
                    key={tone.label}
                    aria-label={tone.label}
                    aria-pressed={(avatar.eyeColor ?? '') === tone.color}
                    style={{ background: tone.color || '#eee8d8' }}
                    onClick={() => onChange({ ...avatar, eyeColor: tone.color })}
                  >
                    {!tone.color ? '기본' : ''}
                  </Button>
                ))}
              </div>
            </>
          )}
          {tab === 'nose' && (
            <>
              <h3 className="editor-field-title">코도 내 취향대로!</h3>
              <PartOptions
                avatar={avatar}
                field="noseShape"
                labels={noseNames}
                onChange={onChange}
              />
              <p className="editor-note">머리와 눈은 그대로, 코만 바뀌어요.</p>
            </>
          )}
          {tab === 'skin' && (
            <>
              <h3 className="editor-field-title">편안한 내 피부색</h3>
              <div className="skin-options">
                {skinTones.map((tone) => (
                  <Button
                    key={tone.label}
                    aria-pressed={(avatar.skinTone ?? '') === tone.color}
                    onClick={() => onChange({ ...avatar, skinTone: tone.color })}
                  >
                    <span style={{ background: tone.color || '#f4bf9b' }} />
                    {tone.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
        <Button
          variant="primary"
          className="village-confirm"
          disabled={!avatar.name.trim()}
          onClick={onContinue}
        >
          <Flaticon name="leaf" size={21} /> 좋아, 이 모습으로 갈래!
        </Button>
      </div>
    </div>
  );
}
