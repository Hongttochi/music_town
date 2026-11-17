import { useLayoutEffect, useRef, useState } from 'react';
import './tabs.css';

// The underline slides to the selected tab.
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = host.current?.querySelector<HTMLElement>(`[data-id="${value}"]`);
    if (el) setInk({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);
  return (
    <div className="a-tabs" role="tablist" ref={host}>
      {items.map((t) => (
        <button
          key={t.id}
          data-id={t.id}
          role="tab"
          aria-selected={t.id === value}
          className="a-tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <small>{t.count}</small>}
        </button>
      ))}
      <span className="a-tab-ink" style={ink} />
    </div>
  );
}
