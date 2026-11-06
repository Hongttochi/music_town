import { Button } from '../ui/Button';
import type { Stage } from '../../data/model';
export function StageLabels({
  stages,
  near,
  performing,
  name,
  openStage,
}: {
  stages: Stage[];
  near: Stage | null;
  performing: number | null;
  name: string;
  openStage: (stage: Stage) => void;
}) {
  return (
    <div id="world-labels">
      {stages.map((s) => (
        <Button
          key={s.id}
          id={`label-${s.id}`}
          className={`world-label ${s.artist ? '' : 'empty'} ${near?.id === s.id ? 'selected' : ''}`}
          onClick={() => openStage(s)}
        >
          <b>{String(s.id + 1).padStart(2, '0')}</b>
          {performing === s.id ? name : s.artist || '빈 버스킹 자리'}
          {s.artist && <span className="ml-2 opacity-60">♫</span>}
        </Button>
      ))}
    </div>
  );
}
