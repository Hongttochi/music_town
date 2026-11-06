import { Button } from '../ui/Button';
import { ModularPortrait } from './ModularPortrait';
import type { Avatar } from '../../data/model';

export function EquipmentEditor({
  avatar,
  onChange,
}: {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
}) {
  return (
    <div className="equipment-editor">
      {accessoryGroups.map((group) => (
        <section key={group.key}>
          <h3 className="editor-field-title">{group.label}</h3>
          <div className="part-options part-catalog equipment-options">
            {group.items.map(([value, label]) => (
              <Button
                key={value}
                variant="choice"
                aria-pressed={(avatar[group.key] || 'none') === value}
                onClick={() => onChange({ ...avatar, [group.key]: value })}
              >
                <ModularPortrait lazy avatar={{ ...avatar, [group.key]: value }} />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </section>
      ))}
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
            <ModularPortrait lazy avatar={{ ...avatar, instrument: item.key }} />
            <span>{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

const accessoryGroups = [
  {
    key: 'headwear',
    label: '모자',
    items: [
      ['none', '벗기'],
      ['snapback', '스냅백'],
      ['beanie', '비니'],
      ['bucket', '버킷햇'],
    ],
  },
  {
    key: 'earwear',
    label: '귀',
    items: [
      ['none', '빼기'],
      ['headset', '헤드셋'],
      ['airpods', '에어팟'],
    ],
  },
  {
    key: 'eyewear',
    label: '안경',
    items: [
      ['none', '벗기'],
      ['sunglasses', '선글라스'],
      ['glasses', '안경'],
    ],
  },
  {
    key: 'bag',
    label: '가방',
    items: [
      ['none', '벗기'],
      ['backpack', '백팩'],
      ['crossbody', '크로스백'],
    ],
  },
  {
    key: 'wristwear',
    label: '손목',
    items: [
      ['none', '빼기'],
      ['bracelet', '팔찌'],
      ['watch', '손목시계'],
      ['apple-watch', '애플워치'],
    ],
  },
] as const;
