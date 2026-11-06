import { Moon, Sun } from 'lucide-react';
export function ParkIntroduction({ hour, night }: { hour: number; night: boolean }) {
  return (
    <aside className="intro">
      <span className="eyebrow">YOUR EVERYDAY MUSIC ESCAPE</span>
      <h1>
        오늘은 어떤 음악을
        <br />
        만나게 될까요?
      </h1>
      <p>발길이 닿는 곳에서, 새로운 목소리를 만나세요.</p>
      <div className="weather">
        {night ? <Moon size={16} /> : <Sun size={16} />}
        <span>
          {night ? '별빛이 머무는 밤' : hour >= 17 ? '노을이 물드는 저녁' : '햇살 좋은 오후'}
        </span>
        <i />
        채팅 없이, 음악으로 함께
      </div>
    </aside>
  );
}
