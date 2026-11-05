# MUSIC TOWN 로그인 연결

## 현재 상태

Supabase 클라이언트와 Google/Kakao OAuth 진입, PKCE 콜백 처리, 세션 확인, 로그아웃, 로그인 후 캐릭터 설정과 프로필 저장 API를 구현했습니다. 실제 로그인 가능 여부는 배포 환경의 Supabase/OAuth 설정을 확인해야 합니다.

설정이 없으면 로그인 버튼은 비활성화됩니다. 개발 서버에서만 명시적인 개발용 체험 버튼이 제공됩니다. 프로덕션 빌드에는 이 버튼이 없습니다. 브라우저 UI 입장 제한은 향후 실시간 서버의 인증/권한 검사를 대신하지 않습니다.

## 1. Supabase

1. https://supabase.com/dashboard 에서 프로젝트를 만듭니다.
2. 프로젝트의 URL과 **publishable key**를 확인합니다.
3. `.env.example`을 `.env.local`로 복사하고 아래 두 값만 설정합니다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

`service_role`, `sb_secret_`, Google/Kakao client secret은 브라우저 코드나 `VITE_*` 환경 변수에 넣지 않습니다. 공급자 비밀키는 Supabase 대시보드에서만 설정합니다.

4. Authentication의 URL Configuration에서 Site URL을 실제 서비스 주소로 지정하고, Redirect URLs에 개발 주소 `http://127.0.0.1:5173/`와 실제 배포 주소를 허용합니다. 개발용 localhost를 사용한다면 해당 주소도 별도 등록합니다.

## 2. Google

- Google Cloud Console에서 OAuth 동의 화면과 웹 애플리케이션 OAuth 클라이언트를 만듭니다.
- Supabase의 Google Provider 화면에 나온 callback URL을 Google의 Authorized redirect URIs에 그대로 등록합니다.
- Google Client ID와 Client Secret을 Supabase의 Google Provider 설정에 저장하고 활성화합니다.
- 테스트 모드라면 이용할 Google 계정을 테스트 사용자로 등록합니다.

공식 안내: https://supabase.com/docs/guides/auth/social-login/auth-google

## 3. Kakao

- Kakao Developers에서 앱을 만들고 카카오 로그인을 활성화합니다.
- Supabase의 Kakao Provider 화면에서 안내하는 callback URL을 카카오 Redirect URI에 그대로 등록합니다.
- 필요한 프로필 동의 항목을 설정합니다. 현재 클라이언트가 요청하는 범위는 `profile_nickname profile_image`입니다.
- 해당 Provider 안내에 따라 앱 키와 client secret을 Supabase에 설정합니다.

공식 안내: https://supabase.com/docs/guides/auth/social-login/auth-kakao

## 4. 검증

환경 파일 수정 후 개발 서버를 재시작합니다. 배포 버전은 공개 환경 변수를 주입하고 재빌드해야 합니다.

- Google와 Kakao 각각 실제 계정으로 로그인하고 캐릭터 설정으로 돌아오는지 확인
- 동의 취소, 공급자 오류, 만료된 세션 처리 확인
- 캐릭터를 고르고 피부/눈동자 색을 바꾼 후 채널에 입장
- 새로고침 시 세션 유지, 로그아웃 후 로그인 화면 복귀
- 서로 다른 계정에서 캐릭터/팔로우 로컬 설정이 섞이지 않는지 확인
- 프로덕션 빌드에서 개발용 체험이 제공되지 않는지 확인

로그인 이용자의 프로필과 외형은 `member_profiles` 테이블을 통해 저장하고 불러옵니다. 편집 초안과 팔로우는 계정 ID별 브라우저 localStorage를 사용합니다. 현재 저장소에는 안내된 DB 마이그레이션 파일이 없으므로, 배포 전 테이블·RLS·RPC 구성을 확보하고 검증해야 합니다.
