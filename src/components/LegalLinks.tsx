import './legal-links.css';

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="이용 정책">
      <a href="/privacy/" target="_blank" rel="noopener noreferrer">
        개인정보처리방침
      </a>
      <a href="/terms/" target="_blank" rel="noopener noreferrer">
        이용약관
      </a>
      <a href="/safety/" target="_blank" rel="noopener noreferrer">
        안전 가이드
      </a>
    </nav>
  );
}
