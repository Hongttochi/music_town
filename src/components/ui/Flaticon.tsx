export type IconName =
  | 'chat'
  | 'music'
  | 'bench'
  | 'blackboard'
  | 'setting'
  | 'alarm'
  | 'delete'
  | 'logout'
  | 'mic'
  | 'musical'
  | 'leaf'
  | 'microphone'
  | 'heart'
  | 'clap'
  | 'lightstick'
  | 'bell'
  | 'map'
  | 'map-3d'
  | 'terms-3d'
  | 'document-3d'
  | 'privacy-3d'
  | 'safety-3d'
  | 'mail-3d'
  | 'terms'
  | 'privacy'
  | 'safety'
  | 'mail'
  | 'earrings'
  | 'necklace';
export function Flaticon({
  name,
  size = 24,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`flaticon ${className}`}
      src={`/icons/${name}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
export function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`town-brand ${className}`}
      src="/art/music-town-brand-v3.png"
      alt="MUSIC TOWN"
      width={230}
      height={81}
    />
  );
}
export function IconCredits() {
  return (
    <details className="icon-credits">
      <summary>아이콘 출처</summary>
      <a
        href="https://www.flaticon.com/free-icon/music-note_14782535"
        target="_blank"
        rel="noreferrer"
      >
        Music note: Naufal Fikri Azhar · Flaticon
      </a>
      <a href="https://www.flaticon.com/free-icon/leaf_12017906" target="_blank" rel="noreferrer">
        Leaf: Corner Pixel · Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/microphone_106100"
        target="_blank"
        rel="noreferrer"
      >
        Microphone: Freepik · Flaticon
      </a>
      <a href="https://www.flaticon.com/free-icon/heart_833472" target="_blank" rel="noreferrer">
        Heart: Kiranshastry ? Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/clapping_5708124"
        target="_blank"
        rel="noreferrer"
      >
        Clapping: juicy_fish ? Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/light-stick_3278171"
        target="_blank"
        rel="noreferrer"
      >
        Light stick: flatart_icons ? Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/notification-bell_9849259"
        target="_blank"
        rel="noreferrer"
      >
        Notification bell: Magnific ? Flaticon
      </a>
      <a href="https://www.flaticon.com/free-icon/map_854878" target="_blank" rel="noreferrer">
        Map: Magnific ? Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/earrings_1135987"
        target="_blank"
        rel="noreferrer"
      >
        Earrings: Made by Made Premium ? Flaticon
      </a>
      <a
        href="https://www.flaticon.com/free-icon/necklace_13410339"
        target="_blank"
        rel="noreferrer"
      >
        Necklace: VectorPortal ? Flaticon
      </a>
    </details>
  );
}
