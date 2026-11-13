# 실시간 공연 음성

LiveKit의 WebRTC 음성 서버를 사용합니다. Vercel은 접속 토큰만 발급하며 음성을 중계하거나 녹음하지 않습니다.

## 배포 설정

1. LiveKit Cloud 프로젝트를 만들거나 HTTPS/TURN을 구성한 LiveKit 서버를 준비합니다.
2. Vercel 프로젝트 Settings → Environment Variables에 다음 값을 설정합니다.
   - `LIVEKIT_URL`: 프로젝트의 `wss://...` 주소
   - `LIVEKIT_API_KEY`: LiveKit API key
   - `LIVEKIT_API_SECRET`: LiveKit API secret
3. 기존 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`도 서버 함수에서 사용합니다. 별도의 service_role 키는 필요하지 않습니다.
4. Production 환경에 저장하고 재배포합니다. 키에 `VITE_` 접두사를 붙이지 않습니다.

`npm run dev`는 Vite 화면과 `/api/voice-token` 개발용 미들웨어를 함께 실행합니다. 로컬 `.env`에 위 LiveKit 환경 변수와 Supabase 설정을 넣어야 합니다. 서버 전용 값은 브라우저에 전달하지 않으며, `VITE_` 접두사를 붙이면 안 됩니다. `npm run preview`는 정적 화면만 제공하므로 음성 API까지 검증하려면 개발 서버 또는 Vercel Preview를 사용합니다.

## 동작

- 실제 무대 배정을 받은 뮤지션만 마이크를 송출합니다. 브라우저 권한 허용이 필요합니다.
- 같은 채널에서 가까운 무대(기존 155 거리 범위)의 공연을 듣습니다. 다른 무대로 이동하면 음성 방이 전환됩니다.
- ‘나에게만 음소거’는 해당 무대의 연결을 끊습니다. 해제하면 다시 연결합니다.
- Safari 등의 자동 재생 제한은 ‘소리 켜기’로 해제합니다.
- 공연 종료, 타임아웃, 채널 이탈, 페이지 종료 시 음성과 마이크를 정리합니다.
- 공연자마다가 아니라 **공연 회차마다** 음성 방을 분리합니다. 지난 회차의 토큰으로 다음 공연을 들을 수 없습니다.

## 토큰 계약

`POST /api/voice-token`, `Authorization: Bearer <Supabase access token>`.

본문: `{ "channel": 1, "stage": 2, "client": "현재 town 세션 UUID" }`.

서버가 Supabase `/auth/v1/user`로 계정을 검증하고 기존 `town_action(snapshot)` RPC를 해당 사용자 토큰으로 호출합니다. 현재 채널 참가 여부와 유효한 공연을 확인합니다. 클라이언트가 넘기는 역할·계정·송출 권한은 사용하지 않습니다.

응답: `{ url, token, room, canPublish, performerId, expiresAt }`. 관람객은 구독만, 공연자는 마이크 트랙만 송출할 수 있습니다. 토큰은 최대 60초 동안 입장할 수 있습니다. 토큰 만료는 이미 연결된 참여자를 강제 퇴장시키는 기능이 아니며, 정상 클라이언트는 서버 스냅샷과 공연 종료 시각으로 연결을 종료합니다. 강제 제재용 서버 퇴장 처리는 별도 기능입니다.

오류: 400 잘못된 입력, 401 로그인 오류, 403 채널/공연 접근 거부, 405 메서드 오류, 503 환경 변수 미설정, 502 연결 오류. 모든 응답은 `Cache-Control: no-store`입니다.

## 검증

`node --test tests/voice-token.test.mjs`: 로컬 HTTP Supabase 모형 서버와 실제 LiveKit 토큰 서명/검증을 사용해 권한, 위조 입력, 만료, 회차 격리, 연결 오류를 검사합니다. 실제 Supabase 데이터베이스와 LiveKit 음성 통신을 검증하는 테스트는 아닙니다.

실제 배포 후 서로 다른 기기/계정으로 아래를 확인해야 합니다.

1. 뮤지션이 공연 시작 → 마이크 허용 → ‘LIVE · 송출 중’ 표시.
2. 같은 채널 관람객이 무대에 접근 → 필요하면 ‘소리 켜기’ → 목소리 재생.
3. 관람객 음소거/해제, 거리 이탈, 채널 이동 시 소리가 중단/재개.
4. 마이크 끄기/켜기, 권한 거부, 기기 분리, 네트워크 복구.
5. 공연 종료와 다음 대기자 승계 시 이전 음성이 종료되고 새 공연만 재생.
6. iPhone Safari 및 서로 다른 Wi-Fi/모바일 데이터 환경에서 재생.

참고: https://docs.livekit.io/reference/client-sdk-js/ · https://docs.livekit.io/home/server/generating-tokens
