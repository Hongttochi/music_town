import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import { ArrowUpRight } from 'lucide-react';
import type { Stage } from '../../data/model';
export function StageDirectory({
  stages,
  population,
  performing,
  name,
  openStage,
}: {
  stages: Stage[];
  population: number;
  performing: number | null;
  name: string;
  openStage: (stage: Stage) => void;
}) {
  return (
    <aside className="stage-list">
      <div className="section-title">
        <h2>
          공원의 소리 <span>LIVE</span>
        </h2>
        <span>{population} / 30</span>
      </div>
      {stages.map((s) => (
        <Button className="stage-item" key={s.id} onClick={() => openStage(s)}>
          <span className="stage-avatar" style={{ background: s.color + '55' }}>
            {s.artist ? <Flaticon name="musical" size={22} /> : <Flaticon name="mic" size={20} />}
          </span>
          <span className="stage-info">
            <strong>
              {performing === s.id ? name : s.artist || '당신의 무대'}
              {!s.artist && performing !== s.id && <em>비어 있어요</em>}
            </strong>
            <small>{s.name}</small>
          </span>
          {s.artist ? (
            <span className="equalizer">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <ArrowUpRight size={13} className="text-[#9aa789]" />
          )}
        </Button>
      ))}
      <div className="list-foot">
        <span className="live-dot" />
        가까운 무대의 소리가 들려요
      </div>
    </aside>
  );
}
