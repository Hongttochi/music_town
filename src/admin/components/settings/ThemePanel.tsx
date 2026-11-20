import { useEffect } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { defaultTheme, presets, type Theme } from '../../data/themes';
import './theme-panel.css';

type Accent = Pick<Theme, 'acc1' | 'acc2'>;
// Everything except the accent belongs to the preset's background.
const sameBase = (a: Theme, b: Theme) =>
  (Object.keys(a) as (keyof Theme)[]).every((k) => k === 'acc1' || k === 'acc2' || a[k] === b[k]);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const near = (a: string, b: string) =>
  rgb(a).reduce((sum, v, i) => sum + Math.abs(v - rgb(b)[i]), 0) < 48;
// One swatch per preset accent, skipping colors that look the same.
const accents: Accent[] = presets
  .map(({ theme: { acc1, acc2 } }) => ({ acc1, acc2 }))
  .filter((a, i, all) => all.findIndex((b) => near(a.acc1, b.acc1)) === i);
// The deeper accent shade is the picked color mixed 30% toward black.
const deepen = (hex: string) =>
  '#' +
  rgb(hex)
    .map((v) =>
      Math.round(v * 0.7)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const base = presets.find((p) => sameBase(p.theme, theme));
  const custom = !accents.some((a) => a.acc1 === theme.acc1);

  return (
    <>
      <div className={`a-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`a-panel ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
        <div className="a-panel-head">
          <div>
            <h2>화면 설정</h2>
            <p>이 브라우저에만 저장돼요</p>
          </div>
          <button className="a-icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="a-panel-body">
          <section className="a-sec">
            <h4>테마</h4>
            <div className="a-presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  className="a-preset"
                  aria-pressed={base?.id === p.id}
                  onClick={() => setTheme(p.theme)}
                >
                  <i
                    style={{
                      background: p.theme.frame1,
                    }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="a-sec">
            <h4>강조색</h4>
            <div className="a-swatches">
              {accents.map((a) => (
                <button
                  key={a.acc1}
                  className="a-swatch"
                  style={{ background: a.acc1 }}
                  aria-label={`강조색 ${a.acc1}`}
                  aria-pressed={theme.acc1 === a.acc1}
                  onClick={() => setTheme({ ...theme, ...a })}
                >
                  {theme.acc1 === a.acc1 && <Check size={14} />}
                </button>
              ))}
              <label
                className="a-swatch a-swatch-custom"
                style={custom ? { background: theme.acc1 } : undefined}
                aria-pressed={custom}
                title="직접 고르기"
              >
                {custom ? <Check size={14} /> : '+'}
                <input
                  type="color"
                  value={theme.acc1}
                  aria-label="강조색 직접 고르기"
                  onChange={(e) =>
                    setTheme({ ...theme, acc1: e.target.value, acc2: deepen(e.target.value) })
                  }
                />
              </label>
            </div>
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
