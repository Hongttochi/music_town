# Logflare 운영 로그

로그 경로는 브라우저 → Vercel `/api/logs` → Logflare입니다. Supabase 로그 테이블·RPC·SQL 변경은 없습니다.

## 연결

1. Logflare에서 Source를 만들고 Source UUID를 복사합니다.
2. 해당 Source에만 `ingest:source:<source-id>` 권한이 있는 Access Token을 생성합니다.
3. Vercel 환경변수를 설정합니다.
   - `LOGFLARE_SOURCE_ID`: Source UUID
   - `LOGFLARE_API_KEY`: 위 ingestion token. **VITE_ 접두사 금지**
   - `LOG_ALLOWED_ORIGINS`: 허용할 사이트 origin. 예: `https://music-town-hb2j.vercel.app`. 여러 개는 쉼표로 구분하고 경로나 마지막 `/`는 제외합니다. Preview URL도 명시적으로 추가합니다.
   - `VITE_LOGGING_ENABLED=true`: 브라우저 수집 활성화. 빌드 시 반영되므로 재배포합니다.
4. Source의 Backend TTL과 처리 리전을 운영 정책에 맞게 확인하고 개인정보처리방침에 실제 보관 기간·처리 위치를 반영합니다. 현재 저장소에는 해당 계약 정보를 추정해 넣지 않았습니다.
5. Vercel Firewall에서 `/api/logs`에 IP별 요청 제한을 적용합니다. 코드의 분당 600건 제한은 **인스턴스 단위**이므로 분산 공격에 대한 전역 제한이 아닙니다.
6. 배포 후 채널 입장·퇴장을 실행하고 Network에서 `/api/logs`의 204, Logflare Source에서 `channel_enter`, `channel_leave`를 확인합니다. 환경변수 미설정은 503, origin 불일치는 403, upstream 실패는 502입니다. 브라우저 UI에 로그 전송 오류를 띄우지 않습니다.

공식 문서: https://docs.logflare.app/concepts/ingestion/ 및 https://docs.logflare.app/concepts/access-tokens/

## 수집 범위

- 전역 JavaScript 오류·처리되지 않은 Promise 오류
- 로그인 성공 이벤트(기존 세션 복원 제외), OAuth 시작/콜백 실패
- 공원 RPC 실패 및 음성 토큰 API·음성 연결 실패
- 서버 스냅샷에서 확인된 채널 입장·퇴장, 자신의 공연 시작·종료(대기열 승격 포함)
- 발생 시각, 페이지 실행 동안 유지되는 임의 세션 UUID, 배포 커밋, 환경, 허용된 오류 분류·동작 코드·채널/무대 번호·HTTP 상태·오류 행/열

원문 오류 메시지, 스택, URL·쿼리·해시, 계정 ID, 이메일, IP, 사용자 입력, 자기소개, 음성 및 토큰은 Logflare 전송 필드에 포함하지 않습니다. 브라우저 요청의 네트워크 정보는 호스팅 제공자가 별도로 처리할 수 있습니다. 세션 UUID는 메모리에만 보관하며 새로고침하면 바뀝니다.

로그 원문은 서버에서도 허용 목록으로 다시 구성합니다. 로그인 전 오류도 받는 공개 endpoint이므로 Origin 확인은 인증이 아닙니다. 이벤트는 클라이언트가 보낸 **진단용 정보**이며 감사 기록·정산·정확한 이용 통계로 사용하지 않습니다.

1.5초 단위 배치, 배치 최대 20건, 브라우저 분당 40건, 동일 이벤트 5초 중복 억제를 적용합니다. 성공한 heartbeat/snapshot은 기록하지 않습니다. 네트워크 오류·종료 시 로그는 유실될 수 있으며 재시도하지 않습니다. 탭 종료에 따른 서버 세션 만료나 페이지 밖에서 끝난 공연은 종료 이벤트가 누락될 수 있습니다.

`npm run dev`는 Vite 정적 서버이므로 `/api/logs`를 실행하지 않습니다. 로컬 수집을 확인하려면 Vercel 개발 서버를 사용하고 로컬 origin을 허용 목록에 넣습니다. 기본 플래그는 false입니다.

## 검증

`node --test tests/logs.test.mjs`는 민감 필드 제거, 서버 키 사용, 요청 검증, 제한·업스트림 오류 처리와 브라우저 배치/중복 억제를 확인합니다. 실제 Source 수신 확인은 위 환경변수를 설정한 배포에서 별도로 수행합니다.
