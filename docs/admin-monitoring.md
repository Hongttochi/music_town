# 운영실 오류·음성 모니터링

`GET /api/admin-monitoring`은 운영실 Supabase 액세스 토큰으로 `getUser`와
`admin_whoami`를 확인한 뒤 Logflare와 LiveKit을 읽는다. 관리자 권한이 없으면
외부 서비스를 조회하지 않는다. 브라우저에는 서비스 키, 원본 메시지, 세션 ID,
방 이름, 참여자 신원을 보내지 않는다.

## 응답 계약

- `Authorization: Bearer <운영실 액세스 토큰>` 필수.
- `200`: `{ checkedAt, logs, voice }`. `checkedAt`은 서버 조회 시각이다.
- `logs.status`, `voice.status`: `ok`, `not_configured`, `error`.
  미설정·실패 응답은 `{ status, reason }`만 반환하며 0건으로 표시하지 않는다.
- 정상 `logs`: `from`, `sampleSize`, `sampled`, `logs`, `errorCodes`,
  `loginOk`, `loginFail`, `micDenied`. 최근 24시간 중 최신 1,000개 이벤트가 모집단이며,
  오류 목록은 그중 최신 50개만 반환한다. 상한에 도달하면 `sampled: true`이다.
- 이벤트: `{ at, event, code, operation, channel }`. 허용된 이벤트명·분류 코드만 노출한다.
- 정상 `voice`: `rooms`, `participants`, `publishers`. `town-performance-<32자리 hex>`
  방만 집계한다. `publishers`는 LiveKit의 미디어 발행 참여자 수이며 실제 음질 지표가 아니다.
- `401` 로그인 없음·만료, `403` 비관리자, `405` GET 이외,
  `503` 인증 설정 없음, `502` 인증/권한 조회 실패.
- 두 외부 서비스는 독립적으로 실패할 수 있다. 한쪽 실패로 다른 쪽 값을 버리지 않는다.
- 인스턴스별 15초 캐시, UI는 보이는 동안 30초마다 갱신한다.
  캐시 반환 전에도 매번 관리자 권한을 확인한다. 응답은 `Cache-Control: no-store`이다.

## Logflare 연결

로그 수집 설정은 [logflare-setup.md](./logflare-setup.md)를 먼저 따른다.
수집용 `LOGFLARE_API_KEY`는 조회에 재사용하지 않는다.

1. Logflare에서 인증이 활성화된 Query Endpoint를 만든다.
   Endpoint 기능 사용 권한이 필요한 계정은 Logflare에서 먼저 활성화해야 한다.
2. Endpoint가 아래 필드의 행을 `result` 배열로 반환하도록 쿼리를 설정한다.
   `at`은 ISO 날짜 문자열, `channel`은 정수 또는 null이다.
   운영 데이터만 조회하도록 source/environment 조건을 설정한다.
3. Endpoint 캐시는 15~30초로 설정한다. 기본 3,600초 캐시를 유지하면 화면이 늦게 갱신된다.
4. 해당 Endpoint만 조회할 수 있는 query 토큰을 발급한다.
5. Vercel 서버 환경 변수 `LOGFLARE_QUERY_ENDPOINT`(이름 또는 UUID),
   `LOGFLARE_QUERY_API_KEY`를 설정하고 배포한다. `VITE_` 접두사를 붙이지 않는다.

BigQuery의 반복 레코드형 metadata를 사용하는 source의 예시다.
`YOUR_SOURCE`를 실제 source 이름으로 바꾸고, source의 필드 타입에 맞춰 검증한다.
다른 백엔드는 같은 출력 필드·기간·정렬·행 제한을 유지하는 해당 SQL 문법을 사용한다.

```sql
select
  cast(timestamp as string) as at,
  event_message as event,
  m.code as code,
  m.operation as operation,
  m.channel as channel
from `YOUR_SOURCE`, unnest(metadata) as m
where timestamp >= timestamp_sub(current_timestamp(), interval 24 hour)
  and timestamp <= current_timestamp()
  and m.environment = 'production'
order by timestamp desc
limit 1000
```

오류가 없더라도 이벤트가 수집되지 않았을 가능성이 있다. 브라우저 전송은 best effort이고
사용자가 입력할 수 있으므로 감사 기록이나 완전한 로그인 실패율로 해석하지 않는다.
제공자별 로그인 실패율과 서버 토큰 발급 성공률은 수집 계약이 없어 표시하지 않는다.

## LiveKit 연결

기존 음성 기능과 동일한 서버 환경 변수 `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`을 사용한다. RoomService의 ListRooms 권한이 필요하다.
운영실은 방을 만들거나 수정하지 않는다. 활성 방이 없으면 정상 연결 상태로 0을 표시한다.

## 검증

`node --test tests/admin-monitoring.test.mjs`는 실제 Supabase SDK·LiveKit SDK와 로컬 HTTP
모형 서비스를 통해 인증·관리자 제한, 개인정보 제외, 캐시의 권한 재확인 및 부분 장애를 검사한다.
외부 계정의 실제 권한과 배포 환경 변수는 검증하지 않는다.
배포 후 관리자 계정으로 화면을 열어 두 서비스가 `ok`인지 확인하고,
테스트 공연 중 참여자 수와 실제 Logflare 이벤트를 대조한다.

참고: [Logflare Endpoints](https://docs.logflare.app/concepts/endpoints/),
[Logflare access tokens](https://docs.logflare.app/concepts/access-tokens/),
[LiveKit Room service](https://docs.livekit.io/reference/other/roomservice-api/).
