import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { defaultTheme, presets, type Theme } from '../../data/themes';
import './theme-panel.css';

const same = (a: Theme, b: Theme) =>
  (Object.keys(a) as (keyof Theme)[]).every((k) => a[k] === b[k]);
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="a-field">
      <span>{label}</span>
      <span className="a-color">
        <input
          type="text"
          value={text}
          aria-label={`${label} 색상 코드`}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
            setText(v);
            if (isHex(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setText(value)}
        />
        <label style={{ background: value }}>
          <input
            type="color"
            value={value}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </span>
    </div>
  );
}

function Range(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="a-range">
      <span>{props.label}</span>
      <output>
        {props.value}
        {props.unit}
      </output>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function ThemePanel({
  open,
  onClose,
  theme,
  setTheme,
}: {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}) {
  const set =
    <K extends keyof Theme>(k: K) =>
    (v: Theme[K]) =>
      setTheme({ ...theme, [k]: v });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const current = presets.find((p) => same(p.theme, theme));

  return (
    <>
      <div className={`a-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`a-panel ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
        <div className="a-panel-head">
          <div>
            <h2>화면 설정</h2>
            <p>{current ? `${current.name} 테마` : '직접 만든 테마'} · 이 브라우저에만 저장돼요</p>
          </div>
          <button className="a-icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="a-panel-body">
          <section className="a-sec">
            <h4>프리셋</h4>
            <div className="a-presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  className="a-preset"
                  aria-pressed={current?.id === p.id}
                  onClick={() => setTheme(p.theme)}
                >
                  <i
                    style={{
                      background: `radial-gradient(circle at 70% 20%, ${p.theme.glow1}, transparent 70%), linear-gradient(${p.theme.angle}deg, ${p.theme.frame1}, ${p.theme.frame2})`,
                    }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="a-sec">
            <h4>모드</h4>
            <div className="a-chips" style={{ marginBottom: 0 }}>
              {(
                [
                  ['dark', '어둡게'],
                  ['light', '밝게'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  className="a-chip"
                  aria-pressed={theme.mode === m}
                  onClick={() => set('mode')(m)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="a-cap" style={{ margin: '8px 0 0' }}>
              글자와 테두리 색을 밝은 바탕 또는 어두운 바탕에 맞춰요
            </p>
          </section>

          <section className="a-sec">
            <h4>배경</h4>
            <ColorField label="바탕색" value={theme.bg} onChange={set('bg')} />
            <ColorField label="빛 1" value={theme.glow1} onChange={set('glow1')} />
            <ColorField label="빛 2" value={theme.glow2} onChange={set('glow2')} />
            <Range
              label="빛 세기"
              value={theme.glow}
              min={0}
              max={150}
              unit="%"
              onChange={set('glow')}
            />
          </section>

          <section className="a-sec">
            <h4>프레임 그라데이션</h4>
            <div
              className="a-preview"
              style={{
                background: `linear-gradient(${theme.angle}deg, ${theme.frame1}, ${theme.frame2})`,
              }}
            />
            <ColorField label="시작 색" value={theme.frame1} onChange={set('frame1')} />
            <ColorField label="끝 색" value={theme.frame2} onChange={set('frame2')} />
            <Range
              label="방향"
              value={theme.angle}
              min={0}
              max={360}
              unit="°"
              onChange={set('angle')}
            />
          </section>

          <section className="a-sec">
            <h4>카드</h4>
            <ColorField label="카드 색" value={theme.card} onChange={set('card')} />
            <Range
              label="카드 진하기"
              value={theme.cardTint}
              min={0}
              max={100}
              unit="%"
              onChange={set('cardTint')}
            />
          </section>

          <section className="a-sec">
            <h4>강조색</h4>
            <div
              className="a-preview"
              style={{ background: `linear-gradient(90deg, ${theme.acc1}, ${theme.acc2})` }}
            />
            <ColorField label="밝은 쪽" value={theme.acc1} onChange={set('acc1')} />
            <ColorField label="진한 쪽" value={theme.acc2} onChange={set('acc2')} />
          </section>
        </div>
        <div className="a-panel-foot">
          <button className="a-btn a-btn-ghost" onClick={() => setTheme(defaultTheme)}>
            <RotateCcw size={14} /> 기본값
          </button>
          <button className="a-btn a-btn-solid" onClick={onClose}>
            완료
          </button>
        </div>
      </aside>
    </>
  );
}
