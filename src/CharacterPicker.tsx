import { characterStyles, normalizeStyle } from './characterStyles';
import { useEffect, useRef, useState } from 'react';
import { loadCharacterImage, renderCharacterRow } from './characterTexture';
export function CharacterPortrait({
  index,
  skin = '',
  eyes = '',
}: {
  index: number;
  skin?: string;
  eyes?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    loadCharacterImage()
      .then((image) => {
        if (!active || !canvas.current) return;
        const row = renderCharacterRow(image, index, skin, eyes);
        canvas.current.width = 256;
        canvas.current.height = row.height;
        canvas.current
          .getContext('2d')!
          .drawImage(row, 0, 0, 256, row.height, 0, 0, 256, row.height);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [index, skin, eyes]);
  const frame = characterStyles[normalizeStyle(index)],
    height = frame.bottom - frame.top;
  return (
    <div className="character-portrait" style={{ aspectRatio: `256 / ${height}` }}>
      <canvas
        ref={canvas}
        aria-label={frame.name}
        role="img"
        style={{ width: '100%', height: '100%' }}
      />
      {failed && <span role="alert">캐릭터를 불러오지 못했어요</span>}
    </div>
  );
}
export function CharacterPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="character-picker" aria-label="캐릭터 선택">
      {characterStyles.map((style, i) => (
        <button
          key={style.name}
          type="button"
          aria-pressed={normalizeStyle(value) === i}
          className={normalizeStyle(value) === i ? 'chosen' : ''}
          onClick={() => onChange(i)}
        >
          <CharacterPortrait index={i} />
          <span>{style.name}</span>
        </button>
      ))}
    </div>
  );
}
