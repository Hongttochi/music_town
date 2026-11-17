# 운영실(/admin) 실제 데이터 연결

운영실은 Supabase 로그인과 관리자 확인을 거친 사람에게만 실제 데이터를 보여준다.
`VITE_SUPABASE_URL`이 없는 환경(로컬 개발 등)에서는 같은 모양의 데모 데이터로 열리고, 상단에 `데모` 표시가 붙는다.
운영 DB에는 아직 적용하지 않았다.

## 적용 순서

1. Supabase SQL Editor에서 `supabase/migrations/202611150003_admin_console.sql` 전체를 실행한다.
   기존 `member_profiles`, `town_channels`, `town_stages`, `town_sessions`, `town_performances`, `town_queue`,
   `profile_fans`, `profile_daily_activity`가 있어야 하고, 신고 보관 SQL(`202611150001_report_retention.sql`)을 먼저 적용해야 한다.
   다시 실행해도 된다.
2. Supabase → Authentication → URL Configuration → Redirect URLs에 운영 주소의 `/admin/`을 추가한다.
   예: `https://music-town-hb2j.vercel.app/admin/`. 빠지면 로그인 후 메인 화면으로 돌아간다.
3. 마스터 관리자: Vercel 서버 환경 변수 `ADMIN_EMAILS`(관리자 실험실과 같은 변수)에 이메일을 넣고,
   `SUPABASE_SECRET_KEY`가 설정돼 있는지 확인한 뒤 재배포한다. `/admin`에 로그인하면 `/api/admin-role`이
   확인된 이메일을 비교해 DB에 마스터 권한을 2시간짜리로 등록하고, 운영실이 열려 있는 동안 30분마다 갱신한다.
   목록에서 이메일을 빼면 다음 확인 때 바로, 늦어도 2시간 뒤에는 권한이 사라진다.
4. 일반 관리자: 마스터가 운영실 **회원 관리**에서 지정·해제한다. 이메일이 없는 카카오 계정도 지정할 수 있고,
   만료되지 않는다. 일반 관리자는 운영실 전체를 쓰고 앱의 관리자 실험실·GM 표시도 받지만, 관리자 지정은 못 한다.
5. 이용 통계: Amplitude 대시보드의 Share → Embed를 켜고 복사한 링크를 SQL Editor에서 넣는다.
   임베드 링크는 로그인 없이 열리므로 공개 저장소나 앱 코드에 넣지 않는다.
   ```sql
   insert into public.admin_embeds(title, url)
   values ('활성 사용자 & 머문 시간', 'https://app.amplitude.com/analytics/share/embed/<ID>');
   ```
   로컬 데모에서 보려면 `.env.local`에 `VITE_DEMO_AMPLITUDE_EMBED=<링크>`를 넣는다. Vercel에는 넣지 않는다.
   링크가 새면 Amplitude에서 Embed 스위치를 끄면 바로 막힌다.

## 마이그레이션이 만드는 것

| 이름                                                                                 | 내용                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin_members`                                                                      | 관리자 명단(`master`/`admin`). 마스터는 만료 시각이 있는 동기화 행이다. 이용자는 직접 읽거나 쓸 수 없다.                                                                                                                                                                        |
| `admin_sync_role()`                                                                  | `/api/admin-role`이 서버 비밀 키로만 호출한다. 마스터를 등록·제거하고 현재 권한을 돌려준다.                                                                                                                                                                                     |
| `admin_members_list()` / `admin_set_admin()`                                         | 회원 목록(캐릭터 이름·로그인 방식·가입일·최근 방문·권한)과 일반 관리자 지정·해제. 지정은 마스터만, 자기 자신과 마스터는 바꿀 수 없다.                                                                                                                                           |
| `admin_whoami()`                                                                     | 로그인한 본인의 ID, 관리자 여부, 권한(`master`/`admin`)을 돌려준다.                                                                                                                                                                                                             |
| `admin_overview()`                                                                   | 지금 접속(45초 안에 신호), 정리 대기 세션, 채널별 인원, 진행 중 공연·대기열, 처리할 신고, 오늘 방문·가입, 최근 14일 방문자.                                                                                                                                                     |
| `admin_live()`                                                                       | 채널·무대별 공연자 이름, 시작·종료 시각, 대기 인원.                                                                                                                                                                                                                             |
| `admin_shows()`                                                                      | 최근 7일 무대 시간, 무대에 선 사람 수, 새 팔로우·하트, 공연 수·평균 시간·중간 종료, 뮤지션 순위.                                                                                                                                                                                |
| `admin_funnel(days, provider)`                                                       | 최근 N일 가입자의 가입 → 프로필 완성 → 공원 방문 → 첫 무대 → 팔로워 생김. 바로 전 N일 가입자와 비교. Google/Kakao로 나눠 볼 수 있다.                                                                                                                                            |
| `admin_reports()` / `admin_set_report_status()`                                      | `private.town_reports`의 신고 목록과 상태 변경. 접수 → 검토 중 → 조치 완료/반려만 허용하고, 처리한 신고는 되돌릴 수 없다. 처리는 `private.close_town_report()`로 일반 보관(90일)을 적용하고 처리자는 `admin:<운영자 ID>`로 남긴다. 다른 운영자가 먼저 바꿨으면 덮어쓰지 않는다. |
| `town_notices` + `admin_notices()` / `admin_save_notice()` / `admin_delete_notice()` | 공지 작성·게시·내리기·삭제. 내용이 빈 임시 공지는 한 번에 하나만. 게시하려면 제목과 본문이 있어야 한다.                                                                                                                                                                         |
| `admin_embeds` + `admin_embeds()`                                                    | 이용 통계 화면에 띄울 Amplitude 임베드 링크. `https://*.amplitude.com/` 주소만 저장되고 관리자만 읽는다.                                                                                                                                                                         |
| `town_notice_board()`                                                                | 공원 게시판용. 게시 중인 공지만 최신 순. 기존 공지 2개를 처음 한 번 옮겨 둔다.                                                                                                                                                                                                  |
| `private.performance_log` + 트리거                                                   | 공연이 끝나면 지워지는 `town_performances` 대신 공연 기록을 남긴다.                                                                                                                                                                                                             |

모든 운영실 함수는 관리자가 아니면 `ADMIN_REQUIRED`로 거부한다. 이름은 프로필 캐릭터 이름만 쓰고 이메일 등 계정 정보는 내보내지 않는다.

## 알아둘 점

- 공연 수·평균 공연 시간·중간 종료 비율, 개요의 "오늘 공연"은 마이그레이션 적용 이후 공연부터 쌓인다.
- 방문자·무대 시간은 기존 `profile_daily_activity`를 쓰므로 그 기능을 적용한 날부터 값이 있다.
- 무대 앞 청취자 수, 응원(하트·박수·응원봉) 반응은 서버에 저장하지 않아 운영실에 없다.
- 공원 게시판은 `town_notice_board()`를 읽고, 함수가 없거나 실패하면 앱에 실린 `src/data/notices.ts`를 보여준다.
- `town_channels`의 `name`, `capacity`는 운영 DB마다 다를 수 있어 함수가 유연하게 읽는다. 정원이 없으면 인원만 표시한다.
- 위반·분쟁 기록을 1년 보관하거나 예외 보존을 거는 일은 운영실에서 하지 않는다. `docs/reporting-setup.md`의 SQL 절차를 따른다.
- 오류·음성 화면은 아직 연결 전이다. 오류 기록은 Logflare 조회 키, 음성은 LiveKit 서버 API를 쓰는 서버 함수가 필요하다.

## 검증

`node --test tests/admin-console.test.mjs`: 비관리자·익명 거부, 테이블 직접 접근 차단, 재실행, 개요·실시간·공연 집계, 공연 기록 트리거, 퍼널과 로그인 방식 필터, 신고 상태 흐름과 동시 변경 방지, 공지 시드·게시·빈 임시 공지 제한·글자 수 제한·삭제.
로컬 테스트는 운영 DB 적용과 로그인 리디렉션 설정 확인을 대신하지 않는다.
