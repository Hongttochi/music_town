# 실제 신고 접수 설정

## DB 적용

기존 001, 002 마이그레이션 이후 Supabase SQL Editor에서
`supabase/migrations/202611050003_reports.sql`을 실행한다.
원격 DB에는 아직 적용하지 않았다. 미적용 시 UI는 실패 안내를 표시하며 성공 접수로 처리하지 않는다.

## 이용 흐름

같은 채널의 다른 캐릭터 클릭 → 프로필 → 신고하기 → 사유 및 10~1000자 설명 → 서버 접수 번호.
공연 프로필의 신고 버튼도 같은 서버 접수를 사용한다. 대상이 떠났거나 연결이 끊기면 이메일 문의를 안내한다.

## 운영자 확인

Supabase 프로젝트 관리자의 Table Editor에서 `public.town_reports`를 확인한다.
`status`는 pending → reviewing → resolved/dismissed로 관리한다.
SQL Editor 조회 예시:

```sql
select id, created_at, reporter_id, target_id, target_name, channel_id, reason, details, status
from public.town_reports
where status in ('pending', 'reviewing')
order by created_at;
```

앱 이용자에게 테이블 SELECT/INSERT/UPDATE 권한을 부여하지 않는다. 신고 RPC만 실행 가능하다.
접수는 DB 저장이며 이메일 자동 발송이나 운영자에게 푸시 알림을 보내는 기능은 아니다.
운영자는 DB 확인 절차를 마련해야 한다. 제재를 자동으로 적용하지 않는다.
보관 기간·정기 파기·검토 및 이의신청 처리 기한은 운영 정책 확정 후 추가한다.

## 검증

- `node --test tests/reports.test.mjs`: 익명·다른 채널·자기 신고·잘못된 사유/길이 거부, 신고 내용 비공개, 동일 요청 재시도 중복 방지, 분당 3건 제한, 마이그레이션 재실행.
- 원격 적용 후 두 계정으로 같은 채널 입장, 다른 캐릭터 클릭 및 접수 번호 확인, 운영자 Table Editor에서 동일 ID 확인 필요.
- 로컬 테스트가 원격 설정 검증을 대신하지 않는다.
