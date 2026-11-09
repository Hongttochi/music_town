<p align="center">
  <img src="public/art/music-town-brand-v3.png" width="240" alt="MUSIC TOWN" />
</p>

# 산책하다 만나는, 새로운 음악. MUSIC TOWN

나만의 캐릭터로 공원을 걷고, 작은 무대 앞에서 하트와 박수로 응원을 보내 보세요.

PC 웹과 모바일 **가로 화면**에서 이용하는 공원 버스킹 웹앱을 만들고 있습니다.

- PC: WASD 또는 방향키로 이동하고 마우스로 메뉴를 이용합니다.
- 모바일·태블릿: 가로 모드에서 터치 조이스틱으로 이동합니다. 세로 모드에서는 기기를 돌리라는 안내가 표시됩니다.

| Type | Link |
| --- | --- |
| 소스 코드 | [Hongttochi/music_town](https://github.com/Hongttochi/music_town) |
| 문의 | [teamsda01@gmail.com](mailto:teamsda01@gmail.com) |
| 로그인 연결 | [Google · Kakao 설정 안내](docs/auth-setup.md) |

<br />

## Screenshots

모바일 가로 화면에서 촬영한 개발용 데모입니다. 화면의 인원과 뮤지션은 예시 데이터이며, 로그인 화면은 OAuth 미설정 상태입니다.

### 공원 산책

<img src="docs/screenshots/park.png" width="100%" alt="캐릭터와 작은 무대, 터치 조이스틱과 응원 버튼이 있는 공원" />

| 로그인 | 캐릭터 꾸미기 |
| :---: | :---: |
| <img src="docs/screenshots/login.png" width="460" alt="MUSIC TOWN 로그인 화면" /> | <img src="docs/screenshots/avatar.png" width="460" alt="머리와 피부, 옷과 액세서리를 고르는 캐릭터 편집 화면" /> |

| 채널 선택 | 내 프로필 |
| :---: | :---: |
| <img src="docs/screenshots/channels.png" width="460" alt="나무 표지판 형태의 공원 채널 목록" /> | <img src="docs/screenshots/profile.png" width="460" alt="프로필 배지와 자기소개, 음악 링크" /> |

| 설정 | 이용약관 |
| :---: | :---: |
| <img src="docs/screenshots/settings.png" width="460" alt="채널 변경과 정책 문서를 모은 설정 메뉴" /> | <img src="docs/screenshots/terms.png" width="460" alt="공통 로고 헤더와 캐릭터가 있는 이용약관 문서" /> |

<br />

## Features

| 기능 | 설명 |
| --- | --- |
| 공원 산책 | 터치 조이스틱으로 이동하는 3D 공원과 캐릭터 추적 카메라 |
| 캐릭터 꾸미기 | 머리·눈·피부색, 의상, 액세서리와 악기 선택 |
| 프로필 | 배지, 자기소개, 인스타그램·사운드클라우드 링크 |
| 채널과 무대 | 5개 채널, 6개 버스킹 자리, 공연 신청과 대기 UI |
| 응원 | 하트·박수·응원봉 리액션 애니메이션 |
| 이용자 보호 | 다른 이용자 프로필에서 신고 접수, 정책 문서와 안전 가이드 |

채널·프로필 저장·신고 접수는 Supabase 설정이 필요합니다. 실제 마이크 음성 전송은 아직 구현되지 않았습니다.

<br />

## Architecture

```mermaid
flowchart LR
    User[모바일 브라우저] --> App[React · TypeScript]
    App --> World[Three.js 공원 · 2D 캐릭터]
    App --> Local[localStorage 초안 · 팔로우]
    App --> Auth[Supabase Auth]
    Auth --> OAuth[Google · Kakao]
    App --> Profiles[프로필 저장 API]
    App --> Town[채널 · 공연 · 신고 RPC]
    Profiles -. DB 설정 필요 .-> DB[(Supabase PostgreSQL)]
    Town -. DB 설정 필요 .-> DB
    App --> Policies[정적 정책 문서]
```

클라이언트 코드의 연결 구조입니다. 운영 DB 구성과 원격 기능 검증은 배포 전 확인 항목을 참고하세요.

<br />

## 실행

```sh
npm install
npm run dev
```

`http://127.0.0.1:5173`에서 실행합니다. Windows PowerShell에서 실행 정책 오류가 나면 `npm.cmd`를 사용합니다.

```sh
npm run build
```

TypeScript 검사 후 `dist/`에 배포 파일을 생성합니다.

## 기술 구성

- React 19 + TypeScript + Vite
- Tailwind CSS 4: Vite 플러그인, 유틸리티 기반 UI 구성
- Three.js / WebGL: 3D 공원과 추적 카메라. 캐릭터는 AI 생성 투명 이미지의 4방향 스프라이트로 표시하며 이동 시 흔들림/상하 움직임을 적용합니다. 관절 기반 걷기 애니메이션은 아닙니다.
- Lucide React 아이콘
- PWA manifest: 홈 화면용 기본 메타데이터. 서비스 워커와 푸시는 미구현

## 체험

로그인 → 캐릭터 설정 → 채널 선택 → 공원 입장. 실제 로그인 연결은 [인증 설정 안내](docs/auth-setup.md)를 따릅니다. 인증 설정이 없는 개발 서버에서는 '개발용 체험'으로 설정 화면을 확인할 수 있습니다. 프로덕션에는 이 우회 버튼이 없습니다.

- 키보드 WASD/방향키 또는 터치 조이스틱으로 산책
- 5개 채널, 채널당 30명 상한 표시, 가득 찬 채널 입장 차단
- 6개 버스킹 자리, 다른 이용자 프로필 열기, 팔로우, 개별 음소거 상태, 서버 신고 접수 UI
- 캐릭터 외형·의상·장비·프로필 배지를 선택합니다. 로그인 이용자의 프로필은 Supabase 저장 API에 연결되어 있으며, 편집 초안과 팔로우는 계정 ID별로 브라우저에 저장합니다.
- 무음 리액션 애니메이션, 한국 시간 기준 낮/저녁/밤
- 실제 계정의 채널·공연·대기열 상태는 Supabase RPC를 통해 갱신합니다. DB 적용과 두 계정 검증이 필요합니다.
- 모바일 세로 화면은 가로 전환 안내, PC는 모바일 지원 안내를 표시합니다. 터치 조작, 노치 여백, 키보드 높이와 짧은 가로 화면에 대응합니다.

## 프로토타입 범위

개발용 체험은 가상 데이터를 사용합니다. 실제 계정 모드에는 로그인·프로필·채널·참가자·공연 대기열·신고 RPC 클라이언트가 구현되어 있습니다. 마이크/WebRTC 전송, 녹음과 실제 음성 믹싱은 미구현이며 리액션은 현재 사용자 화면에서만 표시됩니다.

운영 환경의 OAuth 설정, DB 권한과 RPC, 신고 운영 절차, 실제 모바일 성능은 배포 전에 검증해야 합니다. 신고 접수는 DB 저장 방식이며 운영자 이메일 자동 발송이나 푸시는 구현되어 있지 않습니다.

## 배포 전 확인

### Vercel

1. Vercel에서 `Hongttochi/music_town` GitHub 저장소를 Import합니다. Root Directory는 저장소 루트입니다.
2. Framework Preset은 **Vite**입니다. `vercel.json`에 설치 명령 `npm ci`, 빌드 명령 `npm run build`, 출력 폴더 `dist`를 지정했습니다.
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 등록한 뒤 Deploy합니다. 환경 변수를 바꾸면 재배포해야 합니다.
4. Supabase Authentication의 Site URL과 Redirect URLs에 실제 Vercel 배포 주소를 등록합니다. 이 앱의 로그인 복귀 주소는 `https://배포도메인/`입니다.
5. 모바일 가로 화면으로 로그인·프로필·채널 입장을 확인하고 `/terms/`, `/privacy/`, `/safety/`도 직접 열어 확인합니다.

정책 문서는 각 정적 HTML로 연결하며, 앱은 `/`에서 실행됩니다. 기존 `.openai/hosting.json`은 제거했습니다. Vercel 대시보드에서 프로젝트 연결과 환경 변수 등록은 별도로 진행해야 합니다.

설정 기준: [Vercel의 Vite 배포 안내](https://vercel.com/docs/frameworks/frontend/vite), [vercel.json 설정](https://vercel.com/docs/project-configuration/vercel-json).

### 서비스 연결 확인

- 빌드 시 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 주입합니다. `.env`와 비밀키는 Git에 올리지 않습니다.
- OAuth Site URL과 Redirect URLs를 실제 배포 주소에 맞춥니다.
- **현재 저장소에는 안내 문서에서 참조하는 `supabase/migrations/*.sql`과 `tests/*.test.mjs`가 없습니다.** DB 파일을 확보하고 실제 스키마·권한·RPC를 확인한 뒤 로그인, 채널 입장, 신고 접수를 검증해야 합니다. 프런트엔드 빌드 성공만으로 DB 동작을 보장하지 않습니다.
- 정적 호스팅은 `dist/`를 사용하고 `/terms/`, `/privacy/`, `/safety/`의 HTML 파일을 SPA fallback보다 먼저 제공합니다.
- 개인정보처리방침과 약관은 검토용 초안입니다. 운영 정보와 시행일을 확정해야 합니다.
- 이번 작업은 소스 푸시이며, 별도의 컨테이너 이미지 빌드·레지스트리 푸시나 운영 배포는 수행하지 않았습니다.

## 파일 구성

```text
src/
  main.tsx             # React 실행, 전역 스타일과 로그 수집 초기화
  app/App.tsx          # 로그인·프로필 로딩·Provider 조합
  pages/               # LoginPage, TownPage: 화면 흐름과 기능 연결
  components/
    ui/                # 공통 Button, Panel, ErrorModal, Flaticon
    layout/            # TownHeader, DeviceGuide, HourlyClock
    park/              # 공원 뷰, 조이스틱, 무대 목록·라벨·공연 제어, 미니맵
    profile/           # 내/상대방 프로필, 활동 기록, 소셜 링크
    settings/          # 설정 메뉴, 효과음 설정, 계정 탈퇴
    avatar/            # 캐릭터 편집과 미리보기
    auth/              # 가입과 프로필 로딩
    legal/             # 약관 링크와 신고 화면
  hooks/               # 공원 상태, 음성, 마이크, 효과음, 장면 생명주기
  providers/           # 효과음 엔진과 설정 상태 제공
  contexts/            # 공유 상태 계약
  services/            # 인증, 프로필 저장, 로그 전송
  scene/
    park/              # Three.js 장면 생성, 지형·다리·카페·게시판·모닥불
    avatar/            # 캐릭터 합성, 옷·장비, 앉기·마시기 렌더링
  data/                # 기본 데이터, 캐릭터 부품, 커피 메뉴, 공지, 사운드 목록
  types/               # 공원 좌표와 화면/장면 간 타입 계약
  utils/               # 저장소 읽기, 시간, 오디오 재개, 원격 이동 계산
  styles/              # 전역 스타일, 모바일 레이아웃, 공용 모달 스타일
  assets/, sounds/     # 빌드에 포함되는 이미지와 음원
```

페이지는 사용자 동작과 화면 전환을 연결하고, 컴포넌트는 props와 콜백으로 UI를 구성합니다.
`Park`는 캔버스와 상호작용 UI를 표시하고, `useParkScene`은 생성·정리 생명주기를,
`scene/park/createParkScene.ts`는 Three.js 렌더링을 담당합니다.
새 공통 버튼·제목·모달은 `components/ui`를 사용하고, 기능 전용 스타일은 해당 컴포넌트 옆에 둡니다.
외부 API 코드는 `services`, DOM과 무관한 계산은 `utils`에 둡니다.

- `public/art/`: 캐릭터 부품과 마을 소품 등 원본 이미지
- `public/icons/ATTRIBUTION.md`: 아이콘 원작자·출처
- `tests/`, `scripts/check-*.mjs`: 자동 검증과 렌더링 점검

## 검증

`npm run build`로 TypeScript와 Vite 빌드, `node --test tests/*.test.mjs`로 API·프로필·이동 회귀 테스트를 실행합니다. `node scripts/check-button-sounds.mjs`, `node scripts/check-river-boundary.mjs`, `node scripts/check-seating.mjs`는 효과음·다리 충돌·착석 렌더링을 검증합니다. 캐릭터 합성 이미지는 `node scripts/check-avatar.mjs`와 `node scripts/check-clothing.mjs`로 확인할 수 있습니다. 로컬 데모의 브라우저 검증과 실제 운영 DB·기기 검증은 별개입니다. 과거 UI 점검 기록은 [design-qa.md](design-qa.md)를 참고하세요.

## Credits

- 아이콘: [Flaticon 원작자 및 출처](public/icons/ATTRIBUTION.md)
- 문서 폰트: Pretendard · [OFL 라이선스](public/fonts/OFL.txt)
- 스크린샷: 현재 앱의 로컬 데모를 Chromium 모바일 에뮬레이션으로 캡처했습니다. 실제 휴대폰 촬영이나 성능 검증을 뜻하지 않습니다.
