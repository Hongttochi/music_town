import type { Avatar } from '../model';
import { clothingColors, outfits } from '../clothing';
import { ModularPortrait } from '../ModularPortrait';
import { Button } from './ui/Button';

export function ClothingEditor({
  avatar,
  onChange,
}: {
  avatar: Avatar;
  onChange: (value: Avatar) => void;
}) {
  return (
    <>
      <h3 className="editor-field-title">오늘 입을 옷</h3>
      <div className="part-options part-catalog clothing-catalog">
        {outfits.map(({ label, ...outfit }) => (
          <Button
            key={label}
            variant="choice"
            aria-pressed={
              avatar.clothingStyle === outfit.clothingStyle &&
              avatar.shirt === outfit.shirt &&
              avatar.pants === outfit.pants
            }
            onClick={() => onChange({ ...avatar, ...outfit })}
          >
            <ModularPortrait lazy avatar={{ ...avatar, ...outfit, instrument: 'none' }} />
            <span>{label}</span>
          </Button>
        ))}
      </div>
      {(['shirt', 'pants'] as const).map((field) => (
        <div key={field}>
          <h4 className="editor-field-title">{field === 'shirt' ? '상의 색' : '하의 색'}</h4>
          <div className="appearance-swatches">
            {clothingColors.map(({ label, color }) => (
              <Button
                key={color}
                aria-label={`${field === 'shirt' ? '상의' : '하의'} ${label}`}
                aria-pressed={!!avatar.clothingStyle && avatar[field] === color}
                style={{ background: color }}
                onClick={() =>
                  onChange({
                    ...avatar,
                    clothingStyle: avatar.clothingStyle || 'plain',
                    [field]: color,
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
