import './sparkline.css';

export function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * 100,
    30 - ((v - min) / (max - min || 1)) * 26,
  ]);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg className="a-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
      <path d={`${d} L100,34 L0,34 Z`} fill="var(--t-acc1)" fillOpacity="0.12" />
      <path className="ln" d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
