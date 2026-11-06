import { Button } from '../ui/Button';
import type { Avatar } from '../../data/model';
import { ModularPortrait } from './ModularPortrait';
export function PartOptions({
  avatar,
  field,
  labels,
  onChange,
}: {
  avatar: Avatar;
  field: 'hair' | 'eyeShape' | 'noseShape';
  labels: string[];
  onChange: (avatar: Avatar) => void;
}) {
  return (
    <div className="part-options part-catalog">
      {labels.map((label, index) => (
        <Button
          variant="choice"
          key={label}
          aria-pressed={(avatar[field] ?? 0) === index}
          onClick={() => onChange({ ...avatar, [field]: index })}
        >
          <ModularPortrait lazy avatar={{ ...avatar, [field]: index }} />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}
