export function RoleIcon({ musician = false }: { musician?: boolean }) {
  return (
    <span className={`role-art ${musician ? 'role-art-musician' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 80 80" width="64" height="64" fill="none">
        {musician ? (
          <>
            <path d="m35 42-16 21a5 5 0 0 0 7 7l21-18" fill="#638e8c" />
            <path d="m30 49 8 8" stroke="#416b6a" strokeWidth="3" />
            <circle cx="49" cy="30" r="19" fill="#e6b567" />
            <path
              d="m37 17 25 25M33 24l23 23M43 12l24 24m-25 9 20-20m-27 13 20-20"
              stroke="#fff1cc"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="m67 56 3 5 5 1-4 4v5l-5-3-5 1 2-5-2-5Z" fill="#dba184" />
            <circle cx="16" cy="26" r="3" fill="#e6b567" />
          </>
        ) : (
          <>
            <path
              d="M18 44V33a22 22 0 0 1 44 0v11"
              stroke="#637fa2"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M23 30a17 17 0 0 1 34 0"
              stroke="#a7c4da"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect x="12" y="37" width="17" height="27" rx="8" fill="#e8b168" />
            <rect x="51" y="37" width="17" height="27" rx="8" fill="#e8b168" />
            <path d="M24 43v15m32-15v15" stroke="#f8db9d" strokeWidth="4" strokeLinecap="round" />
            <path d="M39 48v15l9-3V46l-9 2" fill="#93ab82" />
            <ellipse cx="35" cy="64" rx="5" ry="3.5" fill="#93ab82" />
          </>
        )}
      </svg>
    </span>
  );
}
