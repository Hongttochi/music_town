import { Flaticon } from '../Flaticon';
import { Button } from './ui/Button';
import { ModularPortrait } from '../ModularPortrait';
import type { Avatar } from '../model';

export function EquipmentEditor({
  avatar,
  onChange,
}: {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
}) {
  return (
    <div className="equipment-editor">
      <h3 className="editor-field-title">액세서리</h3>
      <div className="equipment-accessories">
        {(
          [
            { key: 'earrings', label: '귀걸이' },
            { key: 'necklace', label: '목걸이' },
          ] as const
        ).map((item) => (
          <Button
            key={item.key}
            variant="choice"
            aria-pressed={!!avatar[item.key]}
            onClick={() => onChange({ ...avatar, [item.key]: !avatar[item.key] })}
          >
            <Flaticon name={item.key} size={22} />
            {item.label}
          </Button>
        ))}
      </div>
      <h3 className="editor-field-title">들고 다닐 악기</h3>
      <div className="part-options part-catalog equipment-options">
        {(
          [
            { key: 'none', label: '빈손' },
            { key: 'guitar', label: '통기타' },
            { key: 'microphone', label: '마이크' },
            { key: 'electric', label: '일렉기타' },
            { key: 'ukulele', label: '우쿨렐레' },
            { key: 'tambourine', label: '탬버린' },
          ] as const
        ).map((item) => (
          <Button
            variant="choice"
            key={item.key}
            aria-pressed={(avatar.instrument || 'none') === item.key}
            onClick={() => onChange({ ...avatar, instrument: item.key })}
          >
            <ModularPortrait avatar={{ ...avatar, instrument: item.key }} />
            <span>{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
