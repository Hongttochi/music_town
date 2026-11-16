import type { TreeSeason } from '../../scene/park/treeSeason';
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
      <p>내 화면에서 공원의 시간과 계절을 미리 볼 수 있어요. 다른 이용자에게는 적용되지 않아요.</p>
      <fieldset>
        <legend>시간</legend>
        <div className="admin-lab-options">
          {(
            [
              ['auto', '실제 시간'],
              ['day', '낮'],
              ['night', '밤'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={time === value ? 'primary' : 'secondary'}
              aria-pressed={time === value}
              onClick={() => onTime(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>계절</legend>
        <div className="admin-lab-options">
          {(
            [
              ['auto', '실제 계절'],
              ['spring', '봄'],
              ['summer', '여름'],
              ['autumn', '가을'],
              ['winter', '겨울'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={season === value ? 'primary' : 'secondary'}
              aria-pressed={season === value}
              onClick={() => onSeason(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <p className="admin-lab-note">
        계절은 나무 색상에 반영돼요. 공연 운영 시간은 실제 시간을 따릅니다. 새로고침하면 미리보기가
        해제돼요.
      </p>
      <Button variant="ghost" disabled={time === 'auto' && season === 'auto'} onClick={onReset}>
        실제 시간·계절로 돌아가기
      </Button>
    </div>
  );
}
