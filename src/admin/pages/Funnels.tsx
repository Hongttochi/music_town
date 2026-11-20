import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, TrendingDown } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { FunnelBars } from '../components/charts/FunnelBars';
import { Meter } from '../components/charts/Meter';
import { Toggle } from '../components/ui/Toggle';
import { ErrorCard } from '../components/ui/ErrorCard';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { type Funnel } from '../services/adminRepository';
import './funnels.css';

const periods = [7, 30, 90];
const segments = [
  { id: null, label: '전체', color: '' },
  { id: 'google', label: 'Google 로그인', color: '#7d95ff' },
  { id: 'kakao', label: 'Kakao 로그인', color: '#f4c56a' },
] as const;
const rate = (f: Funnel | null, key: 'value' | 'last' = 'value') => {
  const s = f?.steps;
  return s && s[0][key] ? (s[s.length - 1][key] / s[0][key]) * 100 : 0;
};

function Saved({ days, active, onPick }: { days: number; active: boolean; onPick: () => void }) {
  const { data } = useAdminRpc<Funnel>('admin_funnel', { days, provider: null });
  const now = rate(data);
  const delta = now - rate(data, 'last');
  const top = data?.steps[0].value || 1;
  return (
    <button className="a-saved" aria-pressed={active} onClick={onPick}>
      <div className="a-saved-row">
        <span>최근 {days}일 가입자</span>
        <span>{data ? `${now.toFixed(1)}%` : '…'}</span>
      </div>
      <div className="a-saved-sub">
        <span>가입 → 팔로워 생김</span>
        {data && (
          <span className={`a-delta ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(delta).toFixed(1)}%p
          </span>
        )}
      </div>
      <div className="a-mini">
        {(data?.steps ?? []).map((s) => (
          <i key={s.label} style={{ height: `${Math.max(8, (s.value / top) * 100)}%` }} />
        ))}
      </div>
    </button>
  );
}

export function Funnels() {
  const [days, setDays] = useState(30);
  const [seg, setSeg] = useState<string | null>(null);
  const [showLast, setShowLast] = useState(true);
  const [sel, setSel] = useState(1);
  const main = useAdminRpc<Funnel>('admin_funnel', { days, provider: seg });
  const google = useAdminRpc<Funnel>('admin_funnel', { days, provider: 'google' });
  const kakao = useAdminRpc<Funnel>('admin_funnel', { days, provider: 'kakao' });
  const f = main.data;

  const steps = f?.steps ?? [];
  const step = Math.min(Math.max(sel, 1), Math.max(steps.length - 1, 1));
  const leak = steps.slice(1).reduce(
    (best, s, i) => {
      const drop = steps[i].value ? 1 - s.value / steps[i].value : 0;
      return drop > best.drop ? { i: i + 1, drop } : best;
    },
    { i: 1, drop: -1 },
  );
  const stepRate = (x: Funnel | null) => {
    const a = x?.steps[step - 1]?.value ?? 0;
    return a ? (x!.steps[step].value / a) * 100 : 0;
  };

  return (
    <div className="a-grid a-funnel-layout">
      <div {...reveal(0)}>
        <div className="a-card">
          <p className="a-list-title">가입 시기별</p>
          {periods.map((d) => (
            <Saved key={d} days={d} active={d === days} onPick={() => setDays(d)} />
          ))}
          <p className="a-cap">초록·빨강은 바로 전 같은 기간 가입자와의 차이예요.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        <div {...reveal(1)}>
          {!f ? (
            <ErrorCard error={main.error} reload={main.reload} />
          ) : (
            <div className="a-card">
              <div className="a-card-head">
                <div>
                  <h3>최근 {days}일 가입자는 어디까지 갔을까</h3>
                  <p className="a-cap">
                    가입한 사람이 각 단계를 한 번이라도 거쳤는지 · 단계를 누르면 아래에 상세가
                    열려요
                  </p>
                </div>
                <Toggle on={showLast} onChange={setShowLast} label="지난 기간" />
              </div>
              <div className="a-chips">
                {segments.map((s) => (
                  <button
                    key={s.label}
                    className="a-chip"
                    aria-pressed={s.id === seg}
                    onClick={() => setSeg(s.id)}
                  >
                    {s.color && <i style={{ background: s.color }} />}
                    {s.label}
                  </button>
                ))}
              </div>
              {steps[0]?.value ? (
                <FunnelBars
                  key={`${days}-${seg}`}
                  steps={steps}
                  showLast={showLast}
                  selected={step}
                  onSelect={setSel}
                />
              ) : (
                <p className="a-empty">이 기간에 가입한 사람이 없어요</p>
              )}
              <div className="a-foot">
                <span>
                  전체 전환 <b>{rate(f).toFixed(2)}%</b>
                </span>
                <span>
                  지난 기간 <b>{rate(f, 'last').toFixed(2)}%</b>
                </span>
                <span>점선: 바로 전 {days}일 가입자</span>
                <span>단계를 눌러 상세 보기</span>
              </div>
            </div>
          )}
        </div>

        {f && steps[0]?.value > 0 && (
          <div className="a-grid g-2-1">
            <div {...reveal(2)}>
              <div className="a-card" style={{ height: '100%' }} key={`${step}-${days}-${seg}`}>
                <h3>
                  {step + 1}. {steps[step].label}
                </h3>
                <p className="a-cap">
                  “{steps[step - 1].label}” 다음 단계로 못 간 사람{' '}
                  {(steps[step - 1].value - steps[step].value).toLocaleString('ko-KR')}명
                </p>
                {[
                  ['Google 로그인', google.data],
                  ['Kakao 로그인', kakao.data],
                ].map(([label, x], i) => (
                  <div
                    className="a-chan"
                    key={label as string}
                    style={{ gridTemplateColumns: '100px 1fr 54px' }}
                  >
                    <span>{label as string}</span>
                    <Meter ratio={stepRate(x as Funnel | null) / 100} i={i} />
                    <span>{stepRate(x as Funnel | null).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div {...reveal(3)}>
              <div className="a-card" style={{ height: '100%' }}>
                <div className="a-leak">
                  <TrendingDown size={17} />
                </div>
                <p className="a-cap" style={{ marginTop: 0 }}>
                  가장 큰 이탈
                </p>
                <h3 style={{ marginTop: 6 }}>
                  {steps[leak.i - 1].label} → {steps[leak.i].label}
                </h3>
                <div
                  className="a-big"
                  style={{ fontSize: 30, marginTop: 8, color: 'var(--a-red)' }}
                >
                  −{(Math.max(0, leak.drop) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
