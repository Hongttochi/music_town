# 신고 접수 및 보관 운영

2026-11-15 기준 **로컬 구현·검증**, 운영 DB 적용 전이다. 운영 DB 연결 설정이 없어 원격 실행·Cron 작동은 확인하지 않았다. 아래 SQL 적용 및 확인 전에는 운영 자동 파기가 활성화되었다고 안내하지 않는다.

## 적용 순서

기존 `member_profiles`, `town_sessions`가 있는 DB의 관리자 SQL Editor에서 실행한다.

1. `supabase/migrations/202611150001_report_retention.sql`
2. 기존 사건의 보존 근거를 검토하고 필요한 사건에만 아래 개별 보존을 설정한다.
3. `supabase/migrations/202611150002_report_retention_cron.sql`

첫 SQL은 기존 `public.town_reports`가 있으면 내용을 보존하여 `private.town_reports`로 옮기고, 없으면 생성한다. 계정/프로필 외래 키를 제거하여 탈퇴가 신고를 연쇄 삭제하거나 탈퇴 자체를 막지 않도록 한다. Auth 이메일·소셜 원본 식별자·토큰은 복제하지 않는다. 이전 신고 마이그레이션은 현재 저장소에 없어 새 SQL에 신고 RPC도 포함했다. 과거 기본 멀티플레이 SQL은 다시 실행하지 않는다.

종결일을 알 수 없는 기존 완료 사건은 접수일을 기준으로 보수적으로 만료를 계산한다. 적용 시점부터 새로 1년을 부여하지 않는다. 두 SQL은 재실행할 수 있다. 두 번째 SQL은 `pg_cron`을 활성화하고 매시 17분 파기를 예약한다. 확장 설치/권한 오류를 무시하고 적용 완료로 처리하지 않는다.

## 접수 및 초기 검토

같은 채널의 캐릭터 또는 공연 프로필 → 신고 → 사유·10~1000자 설명 → 서버 접수 번호.
현재 존재하는 인증 계정과 같은 채널의 유효 세션을 검증한다. 분당 3건 제한, 동일 요청 재시도 중복 방지, 신고 내용 비공개를 적용한다. 대상이 떠나면 이메일 문의를 안내한다.

```sql
select id, created_at, reporter_id, target_id, target_name, channel_id,
       reason, details, status, closed_at, retention_until, hold_until, hold_review_at
from private.town_reports order by created_at;
```

담당 운영자는 매일 새 신고와 만료 예정 사건을 확인한다. 7일 안에 초기 검토하는 것을 운영 목표로 삼고 성적 괴롭힘·위협 등 피해 위험이 큰 사건을 우선 검토한다. 접수는 운영자 알림이나 자동 제재 기능이 아니다. 미처리 상태만으로 자동 연장하지 않는다.

## 종결

일반·기각 사건은 완료 후 90일. 확인된 위반이라도 별도 필요성이 없으면 일반 기준을 사용하거나 즉시 삭제한다. 필요한 위반·분쟁 기록만 [판단 기준](privacy-retention-policy.md)에 따라 최대 1년을 적용한다.

```sql
-- UUID는 실제 접수 번호로 교체한다.
update private.town_reports set status='reviewing' where id='<접수 UUID>'::uuid;

-- 일반 종결/기각: 종결일을 기준으로 90일.
select private.close_town_report('<접수 UUID>'::uuid, 'dismissed', 'DooNow');

-- 구체적 사건 평가를 통과한 경우만 1년. 사유는 실제 평가 내용을 작성한다.
select private.close_town_report('<접수 UUID>'::uuid, 'resolved', 'DooNow',
  '<확인 사실, 필요한 항목, 대체 수단과 정보주체 권리 비교 평가>', true);
```

종결일은 반복 실행/편집으로 미룰 수 없다. 종결 사건을 다시 열지 않고 추가 사안은 별도 사건으로 검토한다. 본문에서 불필요한 실명·연락처·건강·성생활 등 민감한 정보를 제거한다. 성희롱 신고라는 사실만으로 불필요한 민감정보 처리가 허용되지는 않는다.

## 개별 예외 보존

수사·소송 또는 미종결 사건의 적법한 근거를 확인한 경우만 지정한다. 단순히 “향후 분쟁 가능”이라는 이유는 부족하다. 기관 요청도 주체·근거·범위를 확인한다. `legal_obligation`은 실제 법적 보존 의무, `legitimate_interest`는 별도 이익형량을 검토한 사건에 사용한다.

```sql
select private.set_town_report_hold('<접수 UUID>'::uuid,
  now()+interval '30 days', 'legitimate_interest', '<검토 문서/사건 참조>',
  '<필요 자료, 처리 근거와 권리 비교, 예상 종료일 등 구체적 사유>', 'DooNow');

-- 필요성이 사라지면 해제하고 이미 만료된 기록을 즉시 정리한다.
select private.set_town_report_hold('<접수 UUID>'::uuid, null, null, null, null, 'DooNow');
select private.purge_town_reports();
```

1회 지정은 최대 90일, 30일 이내마다 재검토한다. 더 긴 법정 의무나 실제 사건이 계속되면 기한 전에 근거를 다시 확인하여 갱신한다. 자동·무기한 연장하지 않는다.

```sql
select id, status, retention_until, hold_until, hold_review_at
from private.town_reports
where (status in ('pending','reviewing') and created_at < now()-interval '7 days')
   or greatest(retention_until,hold_until) <= now()+interval '7 days'
   or hold_review_at <= now();
```

## 파기 확인 및 장애 처리

```sql
select jobid, schedule, command, active from cron.job
where jobname='music-town-report-retention';

select d.start_time, d.status, d.return_message
from cron.job_run_details d join cron.job j on j.jobid=d.jobid
where j.jobname='music-town-report-retention' order by d.start_time desc limit 10;

select * from private.report_retention_runs order by ran_at desc limit 10;

select count(*) as overdue from private.town_reports
where retention_until<=now() and (hold_until is null or hold_until<=now());
```

파기 이력에는 실행 시각·삭제 건수만 90일 남긴다. 매일 실패/누락과 잔여 만료 건을 확인한다. 2시간 이상 실행이 없거나 실패했으면 원인을 해결하고 수동으로 `private.purge_town_reports()`를 실행하여 만료 건이 0인지 확인한다. 백업/로그 TTL은 별도다. 백업 복원 후 서비스 재개 전에 만료 파기를 재실행하고 탈퇴·개별 삭제 요청도 복원 데이터에 다시 반영한다.

## 검증 및 한계

- `node --test tests/report-retention.test.mjs tests/delete-account.test.mjs tests/profile-stats.test.mjs`
- PGlite PostgreSQL 엔진에서 접근 제한·접수 검증·기한·예외 보존·계정 삭제와 사건 보존·재실행을 검사한다.
- 운영 적용 후 두 테스트 계정으로 접수 → 탈퇴 → 일반 정보 삭제/신고 보존 → 테스트 사건 삭제 및 Cron 이력을 확인한다. 실제 피해 자료를 테스트에 쓰지 않는다.
- 실명 확인이나 재가입 차단 기능을 추가한 것은 아니다. 남은 서비스 UUID만으로 실제 사람을 식별할 수 있다는 보장은 없다. 모든 음성을 녹음하거나 Auth 원본을 일괄 보관하지 않는다.
- 이메일 문의는 자동으로 DB에 들어오지 않는다. 같은 기준으로 메일함·내보낸 사본·휴지통을 별도 삭제한다.
- 원격 DB·스케줄러·공급자 백업은 로컬 테스트로 검증되지 않는다.

공식 참고: [Supabase Cron 설치](https://supabase.com/docs/guides/cron/install), [예약 실행](https://supabase.com/docs/guides/cron/quickstart).
