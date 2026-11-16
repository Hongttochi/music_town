import { treeSeason, type TreeSeason } from '../../scene/park/treeSeason';
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
      <fieldset>
        <legend>시간</legend>
        <div className="admin-lab-options">
          {(
            [
              ['auto', '실제 시간', 'alarm'],
              ['day', '낮', 'sun'],
              ['night', '밤', 'crescent-moon'],
            ] as const
          ).map(([value, label, icon]) => (
            <Button
              key={value}
              variant={time === value ? 'primary' : 'secondary'}
              className={`admin-lab-choice admin-lab-choice--${value}`}
              aria-label={label}
              aria-pressed={time === value}
              onClick={() => onTime(value)}
            >
              <img src={`/icons/${icon}.png`} width={18} height={18} alt="" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>계절</legend>
        <div className="admin-lab-options admin-lab-seasons">
          {(
            [
              ['auto', '실제 계절', treeSeason()],
              ['spring', '봄', 'spring'],
              ['summer', '여름', 'summer'],
              ['autumn', '가을', 'autumn'],
              ['winter', '겨울', 'winter'],
            ] as const
          ).map(([value, label, icon]) => (
            <Button
              key={value}
              variant={season === value ? 'primary' : 'secondary'}
              className={`admin-lab-choice admin-lab-choice--${value}`}
              aria-label={label}
              aria-pressed={season === value}
              onClick={() => onSeason(value)}
            >
              <img src={`/icons/${icon}.png`} width={18} height={18} alt="" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </fieldset>
      <Button
        className="admin-lab-reset"
        variant="secondary"
        disabled={time === 'auto' && season === 'auto'}
        onClick={onReset}
      >
        <img src="/icons/refresh.png" width={16} height={16} alt="" />
        실제 시간·계절로 돌아가기
      </Button>
    </div>
  );
}
