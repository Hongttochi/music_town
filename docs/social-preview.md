# 링크 공유 이미지

- 이미지: `public/og/music-town-v1.png` (1734 × 907 PNG)
- 생성: 내장 image_gen 도구, 2026-11-05
- 참조: 기존 `music-town-brand-v3.png` 로고와 `docs/screenshots/park.png` 실제 게임 화면
- 용도: 카카오톡 등 링크 공유용 대표 이미지. 실제 게임 스크린샷과 구분되는 홍보 일러스트입니다.
- 메타태그: 루트 `index.html`에 정적으로 포함합니다. 로그인이나 JavaScript 실행이 필요하지 않습니다.

## 생성 프롬프트

Create a finished wide landscape social-sharing cover image for MUSIC TOWN, approximately 1.91:1 aspect ratio (1200x630 target composition). Use case: ads-marketing. Reference 1 is the official logo; faithfully preserve its coral cottage roof, cream house with dark forest-green musical note and rounded dark green words MUSIC TOWN on two lines. Reference 2 shows the actual game characters and park art style. Make an original polished illustration, NOT a screenshot and NO UI. Cozy soft stylized game art with big-headed small-bodied human characters, matte texture, warm sage-green grass, leafy apple trees, wood stage, gentle afternoon light. Center the official logo prominently, large and crisply legible in the middle of the canvas, occupying the central 45% width with a subtle natural cream clearing behind it, no rectangular card. Around the logo a small intimate park concert: one cute guitarist singing near a microphone on the right, 5 or 6 diverse cute human characters seated or standing along the lower foreground and left, quietly listening attentively with relaxed happy faces, some with eyes peacefully closed. Gaze and body poses clearly listening to the performer. Keep all characters full and comfortably inside margins. Rich but uncluttered greenery framing the corners, soft shadows. Logo is the main focal point. No additional text, slogans, watermarks, UI controls, borders, giant musical symbols or random letters. Preserve logo spelling exactly MUSIC TOWN. Final image must be opaque, polished and read beautifully as a small KakaoTalk link preview.

## 배포 후 확인

1. `https://music-town-hb2j.vercel.app/og/music-town-v1.png`가 로그인 없이 열리는지 확인합니다.
2. 페이지 원본 HTML의 `og:image`와 `og:url`이 실제 배포 도메인을 가리키는지 확인합니다. 도메인 변경 시 canonical과 Twitter 이미지 URL도 함께 수정합니다.
3. 기존 공유 카드가 남으면 카카오 개발자 도구의 OG 캐시를 초기화한 뒤 링크를 다시 공유합니다. 이미 보낸 메시지 카드의 갱신은 보장하지 않습니다.

공식 안내: https://developers.kakao.com/docs/ko/tool/common
