export const profileIcons = [
  { id: 'leaf', label: '잎사귀' },
  { id: 'music', label: '음표' },
  { id: 'headphones', label: '헤드폰' },
  { id: 'mic', label: '마이크' },
  { id: 'star', label: '별' },
  { id: 'moon', label: '달' },
] as const;

export function ProfileIcon({ id, size = 18 }: { id?: string; size?: number }) {
  const index = Math.max(
    0,
    profileIcons.findIndex((item) => item.id === id),
  );
  return (
    <span
      className="profile-icon-art"
      aria-hidden="true"
      style={{
        width: size + 10,
        height: size + 10,
        backgroundImage: 'url(/art/profile-icons-v1.png)',
        backgroundSize: '300% 200%',
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
