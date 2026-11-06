import type { ReactNode } from 'react';
import './profile-bio.css';

/** Keep profile text as text; only explicit web addresses become external links. */
export function ProfileBio({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const pattern = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
  for (const match of text.matchAll(pattern)) {
    const start = match.index!;
    // Avoid matching a web-looking fragment inside an email or another scheme.
    if (start > 0 && /[\w@/=:]/.test(text[start - 1])) continue;
    let label = match[0].replace(/[.,!?;:'"。，！？、”’]+$/u, '');
    for (const [open, close] of [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ]) {
      while (label.endsWith(close) && label.split(close).length > label.split(open).length)
        label = label.slice(0, -1);
    }
    let href: string;
    try {
      const url = new URL(/^www\./i.test(label) ? `https://${label}` : label);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        continue;
      href = url.href;
    } catch {
      continue;
    }
    parts.push(text.slice(cursor, start));
    parts.push(
      <a
        className="profile-bio-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        key={start}
      >
        {label}
      </a>,
    );
    cursor = start + label.length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
