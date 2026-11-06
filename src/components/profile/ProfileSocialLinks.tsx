import './profile-social-links.css';

export function ProfileSocialLinks({
  instagram,
  soundcloud,
  onEditMissing,
}: {
  instagram?: string;
  soundcloud?: string;
  onEditMissing?: () => void;
}) {
  const links = (
    [
      ['instagram', '인스타그램', instagram],
      ['soundcloud', '사운드클라우드', soundcloud],
    ] as const
  ).flatMap(([kind, label, value]) => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol)) return [];
      return [
        {
          kind,
          label,
          href: url.href,
          address: value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
        },
      ];
    } catch {
      return [];
    }
  });
  if (!links.length && !onEditMissing) return null;
  return (
    <div className="profile-social-links" aria-label="뮤지션 소셜 링크">
      {onEditMissing &&
        (
          [
            ['instagram', 'Instagram 등록', instagram],
            ['soundcloud', 'SoundCloud 등록', soundcloud],
          ] as const
        )
          .filter(([, , value]) => !value)
          .map(([kind, label]) => (
            <button key={kind} type="button" className="profile-social-add" onClick={onEditMissing}>
              <img src={`/icons/brands/${kind}.svg`} width={16} height={16} alt="" />
              {label}
            </button>
          ))}
      {links.map(({ kind, label, href, address }) => (
        <a
          key={kind}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label}: ${address} (새 탭)`}
          title={address}
        >
          <img src={`/icons/brands/${kind}.svg`} width={16} height={16} alt="" />
          <span>{address}</span>
        </a>
      ))}
    </div>
  );
}
