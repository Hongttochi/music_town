import type { TreeSeason } from '../../scene/park/treeSeason';
import {
  Clock3,
  Sun,
  Moon,
  CalendarDays,
  Flower2,
  TreeDeciduous,
  Leaf,
  Snowflake,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import './admin-lab.css';

export type LabTime = 'auto' | 'day' | 'night';
export type LabSeason = 'auto' | TreeSeason;

export function AdminLab({
  time,
  season,
  onTime,
  onSeason,
  onReset,
}: {
  time: LabTime;
  season: LabSeason;
  onTime: (value: LabTime) => void;
  onSeason: (value: LabSeason) => void;
  onReset: () => void;
}) {
  return (
    <div className="admin-lab">
      <div className="admin-lab-intro">
        <div className="admin-lab-icon">
          <img src="/icons/test-tubes.png" width={40} height={40} alt="" />
        </div>
        <div>
          <span className="admin-lab-eyebrow">GM 전용 공간</span>
          <h3>공원의 다른 순간을 만나봐요</h3>
          <p>시간과 계절을 골라 나만의 풍경을 미리 보세요.</p>
        </div>
      </div>
      <fieldset>
        <legend>
          시간 <span>공원의 빛을 골라요</span>
        </legend>
        <div className="admin-lab-options">
          {(
            [
              ['auto', '실제 시간', Clock3],
              ['day', '낮', Sun],
              ['night', '밤', Moon],
            ] as const
          ).map(([value, label, Icon]) => (
            <Button
              key={value}
              variant={time === value ? 'primary' : 'secondary'}
              className={`admin-lab-choice admin-lab-choice--${value}`}
              aria-label={label}
              aria-pressed={time === value}
              onClick={() => onTime(value)}
            >
              <Icon size={23} aria-hidden="true" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          계절 <span>풍경에 색을 입혀요</span>
        </legend>
        <div className="admin-lab-options admin-lab-seasons">
          {(
            [
              ['auto', '실제 계절', CalendarDays],
              ['spring', '봄', Flower2],
              ['summer', '여름', TreeDeciduous],
              ['autumn', '가을', Leaf],
              ['winter', '겨울', Snowflake],
            ] as const
          ).map(([value, label, Icon]) => (
            <Button
              key={value}
              variant={season === value ? 'primary' : 'secondary'}
              className={`admin-lab-choice admin-lab-choice--${value}`}
              aria-label={label}
              aria-pressed={season === value}
              onClick={() => onSeason(value)}
            >
              <Icon size={23} aria-hidden="true" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </fieldset>
      <p className="admin-lab-note">
        내 화면에만 적용되며 다른 이용자에게는 적용되지 않아요. 겨울에는 강과 분수가 얼고 물소리가
        멈춰요. 공연 시간은 그대로이며, 새로고침하면 실제 풍경으로 돌아가요.
      </p>
      <Button
        className="admin-lab-reset"
        variant="secondary"
        disabled={time === 'auto' && season === 'auto'}
        onClick={onReset}
      >
        <RotateCcw size={14} aria-hidden="true" />
        실제 시간·계절로 돌아가기
      </Button>
    </div>
  );
}
