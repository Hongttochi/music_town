import './toggle.css';

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button className="a-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span />
      {label}
    </button>
  );
}
