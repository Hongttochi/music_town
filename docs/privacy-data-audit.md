# MUSIC TOWN 개인정보 점검 — 2026-11-06

## 운영자가 제공한 정보 — 2026-11-06

- 개인정보 보호 담당자: DooNow. 문의 이메일: teamsda01@gmail.com.
- 주 데이터 서버 소재지: 대한민국(운영자 제공). 개별 제공업체의 전체 처리·지원·로그·백업 국가를 확인한 것은 아니다.
- 만 14세 미만 이용 허용. 현재 앱에는 연령 확인·법정대리인 동의 및 동의자 확인 기능이 없다. 방침 문구의 추가로 이 기능이 구현되지는 않으며, 필요한 동의·확인 절차를 마련해야 한다.
- 적용 시점: 서비스 개시일부터. 정확한 개시일은 미제공이므로 특정 날짜를 임의로 시행일로 사용하지 않는다.
- 보유기간 제안(미승인): 계정·프로필은 탈퇴 시 삭제, 신고·문의는 처리 완료 후 90일. 90일은 서비스 운영 제안이며 법정 공통 기간 또는 이미 적용된 자동 파기 주기가 아니다. 운영자 선택과 실제 삭제 절차가 갖추어지기 전 확정 방침으로 표기하지 않는다.

## 2026-11-06 갱신

공개 문서를 정중한 문체와 조항 구조로 개정했다. 소셜 로그인 세션에 관한 부수 설명을 안전 가이드에서 삭제했다. 현재 코드에는 LiveKit 실시간 음성 송출, 본인 인증 기반 계정 삭제 API, 브라우저 효과음·볼륨 설정이 있으므로, 과거의 ‘음성·탈퇴 기능 없음’ 문구를 수정했다. Vercel 배포와 jsDelivr 앱 글꼴 요청도 공개 문서에 반영했다.

아래 11월 5일 점검표는 당시 기록이며 현재 기능 전체를 대표하지 않는다. 특히 음성 미구현·탈퇴 미구현 표기는 과거 상태다. 신규 방침도 개정 검토본이며 운영자·보호책임자 정보, 처리 근거, 신고·로그·백업 보유기간, 외부 계약·리전·국외 이전 세부사항과 시행일은 확인이 남아 있다. 원격 DB·운영 콘솔 설정은 이번 문구 정리에서 변경하거나 검증하지 않았다. 미확정 기간·국가·즉시 완전 파기를 사실처럼 기재하지 않았다.

참고: [개인정보 보호법 제30조(2026.9.11 시행)](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029334833).

## 2026-11-05 점검 기록

운영자가 지정한 문의·신고·권리행사 이메일: `teamsda01@gmail.com`.
화면의 긴 내부 검토 배너는 제거했으며, 미확정 운영사항은 이 문서에서 추적한다. 문서 상단의 초안 상태는 유지한다.
안전 가이드 `/safety/` 추가: 소셜 계정 보안 점검, 로그인 기기 확인, 프로필 점검, 운영자 이메일 문의. 이메일 발송은 수행하지 않았다.

현재 소스 기준 점검이다. 운영 콘솔·원격 DB 적용 상태·계약·로그·백업은 확인하지 않았다.
`public/privacy/index.html`, `public/terms/index.html`은 **검토용 초안**이다. 링크 추가는 약관 동의나 법률 검토 완료가 아니다.

## 코드에서 확인한 데이터 흐름

| 위치                                                                      | 입력·저장·전송                                                                                                                                                            | 범위·기간                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/auth.ts`, `src/LoginGate.tsx`                                        | Google/Kakao OAuth → Supabase Auth. PKCE, 세션 영속 저장. Kakao 요청 scope: profile_nickname profile_image. Google 기본 scope 및 실제 반환 metadata는 운영 설정 확인 필요 | 계정 ID, 제공자 identity, 이메일·이름·이미지 등 제공자 데이터와 토큰. 이메일 등을 화면에서 쓰지 않아도 Auth에 저장될 수 있음. 삭제·세션 만료 정책 확인 필요 |
| `src/components/Registration.tsx`, `AvatarEditor.tsx`, `AccountPanel.tsx` | 이름·외형·뱃지·역할·선택 자기소개·SNS 주소 입력                                                                                                                           | 프로필 및 캐릭터 수정                                                                                                                                       |
| `src/profileRepository.ts`, migration 001                                 | member_profiles upsert/select, updated_at·completed                                                                                                                       | DB 자동 보유기간 없음. auth.users 삭제 시 cascade. 실제 원격 RLS 확인 필요                                                                                  |
| `src/main.tsx`, `src/model.ts`                                            | localStorage mt-{uid}-avatar / -profile / -follow, mt-last-report                                                                                                         | 브라우저 수동 삭제 전까지 보존. 로그아웃으로 이 항목들이 지워지지 않음. 신고는 서버에 안 감                                                                 |
| `src/useTown.ts`, migration 002                                           | RPC town_action: 사용자 세션·client UUID·채널·게임 좌표·무대·대기. 1.5초 heartbeat/poll. Realtime 채널 revision                                                           | 같은 채널 참가자의 사용자 ID·avatar·bio·role·SNS·좌표와 공연/대기 정보 반환. 이메일·client UUID는 참가자 응답에 제외                                        |
| migration 002 town_advance                                                | last_seen 45초 이상 경과 세션 삭제, 공연 만료·대기 승격 정리                                                                                                              | 요청 시 실행. 예약 정리 아님. 서버 요청 없으면 삭제 지연. 로그·백업 삭제와 별개                                                                             |
| `src/style.css` 첫 줄                                                     | jsDelivr 외부 Pretendard CSS/폰트 요청                                                                                                                                    | CDN에 IP·브라우저 등 요청 정보 전달 가능. provider 보유기간 확인 또는 자체 호스팅 필요                                                                      |
| `src/components/AccountPanel.tsx`, `src/main.tsx`                         | Instagram/SoundCloud 외부 링크                                                                                                                                            | 클릭 시 외부 이동. 실제 정책 확인 필요                                                                                                                      |
| `src/main.tsx`, `src/Park.tsx`                                            | 반응·음소거 UI 상태                                                                                                                                                       | 현재 클라이언트 메모리. 반응 서버 공유·음성 송출·녹음 없음                                                                                                  |

현재 앱 코드에서 광고, 분석 SDK, AI 입력 저장, 결제, GPS, getUserMedia/WebRTC, 음성 녹음은 확인되지 않았다. 배포 인프라의 접속 로그와 OAuth 제공자의 쿠키까지 없다는 뜻은 아니다.

## 정식 공개 전 확정할 내용

1. 운영자/개인정보 담당자 이름과 실제 수신 가능한 이메일. 문의·신고·권리행사 접수 및 이의신청 업무 절차.
2. 웹 호스팅 업체, Supabase 계약 법인·리전 및 하위처리자, CDN 정책. 국외 이전 여부와 국가·받는 자/연락처·항목·목적·시기/방법·기간·근거·거부방법/효과.
3. 실제 Google/Kakao 동의 화면 scope와 테스트 계정 반환 필드. 불필요한 권한 축소 검토.
4. 계정 삭제·접수 기한, 관리자 삭제 절차, 로그/백업 보유·파기 주기. 임의의 ‘30일’이나 ‘탈퇴 즉시 완전 파기’를 넣지 않음.
5. 이용 연령과 아동 동의. 약관 동의 버전·시각 기록 및 필요 시 선택 항목 공개/제공 동의. 방침 열람과 동의를 구별.
6. 실제 신고 저장·운영자 검토·제재·이의신청 구현. 현재 데모 신고를 실제 신고로 안내하지 않음.
7. 음성 도입 전 공급자·전송 범위·녹음 여부·신고 증거 정책 및 필요한 안내/동의. 음악 공연 관련 권리·플랫폼 라이선스 검토.
8. 확정 후 초안 표시·noindex 제거, 시행일 명시·기존 버전 보관. 확정본과 동의/운영 구현의 일치 여부 법률 검토.

## 공개 경로와 설정

- 정적 파일 `/privacy/`, `/terms/`는 인증·앱 JS 없이 읽을 수 있다. 로그인·프로필·등록 화면에서 새 탭으로 연결한다.
- 배포 서버는 `/privacy/` → `privacy/index.html`, `/terms/` → `terms/index.html`을 앱 SPA fallback보다 먼저 제공해야 한다.
- 최종 공개 도메인의 `/privacy/` 주소를 Google OAuth 브랜딩의 개인정보처리방침 URL에도 동일하게 등록한다. 이용약관 URL은 `/terms/`. 이 콘솔 설정은 아직 변경하지 않았다.
- 로컬 문서 추가는 배포·원격 DB 변경이 아니다.

## 공식 참고 자료

- [개인정보 보호법 제30조 — 2026.9.11 시행 조문](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029334833)
- [개인정보 국외 이전 관련 조문](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334869)
- [성폭력처벌법 제13조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029508407)
- [Google OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies)
- [Google 브랜드 확인](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
- [Supabase 사용자 정보](https://supabase.com/docs/guides/auth/users), [세션](https://supabase.com/docs/guides/auth/sessions)

법령상 요건이 충족되는 경우의 책임과 서비스 이용 제한을 구분했다. ‘성희롱 적발 즉시 법적 처벌’·‘무조건 고소’·모든 운영자 책임 면제·음성 상시 녹음 같은 문구는 넣지 않았다.
