# 개발 환경 설정

README에는 로컬 체험 방법만 간단히 안내한다. 실제 서비스 연결은 아래 문서를 따라 각 환경의 설정을 확인한다.

## 실행

Node.js 22와 npm을 사용한다. `npm ci` 후 `.env.example`을 `.env`로 복사하고 값을 채운다. Windows에서는 파일을 직접 복사할 수 있으며 PowerShell 실행 정책 오류가 있으면 `npm.cmd`를 사용한다.

- `npm run dev`: Vite와 개발용 `/api/voice-token` 미들웨어, 기본 주소 `http://127.0.0.1:5173`.
- Supabase 설정이 없으면 개발 서버에만 ‘미리 둘러보기 · 데모’가 표시된다. 실제 계정·DB를 사용하지 않는 체험이다.
- `npm test`: API, PGlite DB, 이동·주민 행동·오디오·렌더링 테스트.
- `npm run build`: TypeScript 검사와 `dist/` 생성.
- `npm run preview`: 정적 빌드 미리보기. 계정 삭제/로그 API는 Vercel 개발 환경 또는 배포 환경에서 확인한다.

## 서비스 연결

| 설정                        | 문서                                                         |
| --------------------------- | ------------------------------------------------------------ |
| 공개·서버 전용 환경 변수    | [환경 변수 예시](../.env.example)                            |
| Google·카카오 로그인과 콜백 | [인증 설정](auth-setup.md)                                   |
| 계정·채널·공연·대기열       | [멀티플레이 설정](multiplayer-setup.md)                      |
| LiveKit 마이크 송출·청취    | [실시간 음성](live-audio-setup.md)                           |
| 팔로우·하트·활동 시간       | [팬 통계](profile-stats-setup.md), [랭킹](heart-rankings.md) |
| 신고 저장·종결·만료 파기    | [신고 운영](reporting-setup.md)                              |
| 선택적 Logflare 진단 로그   | [로그 설정](logflare-setup.md)                               |

`VITE_` 변수는 브라우저에 공개된다. Supabase Secret/Service Role, LiveKit API Secret, Logflare 토큰에는 이 접두사를 사용하지 않는다. 실제 값은 Git에 올리지 않는다.

## DB 구성 상태

현재 저장소에는 초기 `202611050001_member_profiles.sql`, `202611050002_multiplayer.sql`이 없다. 빈 Supabase 프로젝트에 포함된 SQL만 실행하여 전체 DB를 구성할 수는 없으므로 신규 환경은 기존 스키마·권한 정의부터 확보해야 한다. 기존 설정 문서에서 이 파일을 참조하는 부분도 이 상태를 전제로 읽는다.

이미 구성된 DB에는 변경분만 적용한다. 과거 `town_action` 정의를 다시 실행하면 활동 통계 래퍼를 덮어쓸 수 있다. 신고 보관 변경은 첫 SQL 적용 → 기존 사건의 유효한 보존 근거 검토 → Cron SQL 적용 → 접수·탈퇴·파기 이력 확인 순서다. 2026-11-15 작업 시 신규 신고 SQL과 Cron의 운영 적용은 확인하지 않았다.

## 배포

[Vercel 설정](../vercel.json)은 설치 `npm ci`, 빌드 `npm run build`, 출력 `dist/`를 사용한다. `/terms/`, `/privacy/`, `/safety/`는 인증 없이 읽을 수 있는 정적 문서다.

환경별 OAuth 콜백, 로그 허용 origin, DB 권한, LiveKit 연결을 설정한 뒤 두 계정과 실제 기기로 확인한다. GitHub CI와 Vercel 빌드 성공은 운영 DB/Cron 또는 실제 음성 검증을 대신하지 않는다. 운영 파기 절차와 공급자 로그·백업 TTL·국외 이전 세부사항은 [보관 기준](privacy-retention-policy.md)에 따라 확인한다.

브랜치·PR·main 병합·릴리스 흐름은 [개발 및 배포 규칙](../CONTRIBUTING.md)을 따른다.
