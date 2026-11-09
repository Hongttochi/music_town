# 개발 및 배포 규칙

## 브랜치

| 브랜치 | 역할 | 배포 대상 |
| --- | --- | --- |
| `main` | 운영에 반영할 검증된 코드 | 운영 사이트 |
| `develop` | 다음 배포를 준비하고 통합 검증하는 코드 | 개발 사이트 |
| `feat/#<이슈번호>` | 기능 개발 (`develop`에서 분기 → `develop`으로 PR) | PR 검증 |
| `fix/#<이슈번호>` | 일반 오류 수정 (`develop`에서 분기 → `develop`으로 PR) | PR 검증 |
| `chore/#<이슈번호>` | 설정 및 문서 작업 (`develop`에서 분기 → `develop`으로 PR) | PR 검증 |
| `hotfix/#<이슈번호>` | 운영 긴급 수정 (`main`에서 분기 → `main`으로 PR) | PR 검증 후 운영 배포 |

일반 작업 브랜치는 `develop`에서 만들고, 작업이 끝나면 `develop`으로 PR을 보낸다. 예: `feat/#123`. `#`은 실제 브랜치 이름에 포함하며 명령어에서는 브랜치 이름을 따옴표로 감싼다.
`main`과 `develop`에는 직접 푸시하지 않고 PR로 변경을 반영한다.

`main`, `develop`은 계속 유지한다. `feat`, `fix`, `chore`, `hotfix`는 이슈별 브랜치의 접두사이며, 같은 이름의 상시 브랜치를 별도로 만들지 않는다. 이슈별 브랜치는 PR 병합 후 삭제한다.

```text
main (운영)
├── develop (개발 통합)
│   ├── feat/#123  ──PR──> develop
│   ├── fix/#124   ──PR──> develop
│   └── chore/#125 ──PR──> develop
└── hotfix/#126   ──PR──> main ──동기화 PR──> develop

운영 배포: develop ──PR──> main ──배포 확인──> 태그 / Release
```

브랜치 생성 명령 예시 (번호는 실제 GitHub 이슈 번호로 바꾼다):

```sh
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c 'feat/#123'
git push -u origin 'feat/#123'
```

긴급 수정 브랜치 생성 예시:

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c 'hotfix/#126'
git push -u origin 'hotfix/#126'
```

## 작업 흐름

1. GitHub 이슈를 생성하고 작업 범위를 정한다.
2. 최신 `develop`에서 이슈 번호를 포함한 작업 브랜치를 만든다.
3. 구현 후 `npm run build`와 변경 영역에 해당하는 검증을 수행한다.
4. `develop`을 대상으로 PR을 생성한다. 제목은 `feat/#123: 프로필 편집 추가`처럼 작성하고, 본문에는 관련 이슈, 변경 내용, 검증 결과를 기록한다.
5. 리뷰 후 병합하고 개발 사이트에서 로그인 및 변경 기능을 검증한다.
6. 운영 배포 시 `develop` → `main` PR에 배포 범위와 검증 결과를 정리한다.
7. 운영 배포 PR은 merge commit으로 병합하여 두 장기 브랜치의 이력을 연결한다.
8. 운영 배포 확인 후 해당 `main` 커밋에 버전 태그와 GitHub Release를 만든다.

개발 PR에는 `Refs #123`으로 이슈를 연결하고, 운영 배포 PR에서 `Closes #123`으로 완료할 이슈를 명시한다. 실제 자동 종료 여부는 GitHub 기본 브랜치 설정에 따라 확인한다.

긴급 수정은 `main`에서 `hotfix/#<이슈번호>`를 만들고 `main`으로 PR을 보낸다. 배포 후 `main` → `develop` 동기화 PR을 merge commit으로 병합하여 수정 내용이 다음 배포에서 사라지지 않게 한다. 긴급 수정도 운영 배포 확인 후 patch 버전 태그와 Release를 만든다.

## 환경 분리

운영 사이트는 `main`, 별도 개발 사이트는 `develop`에 연결한다. 브랜치 생성만으로 사이트나 배포 연결이 생성되지는 않으므로 배포 서비스에서 각각 설정해야 한다.

- 운영 도메인은 운영 사이트에, 개발 도메인은 개발 사이트에 연결한다.
- 개발용 Supabase 프로젝트와 LiveKit 자격 증명을 별도로 구성한다.
- 각 사이트의 환경 변수는 `.env.example`을 기준으로 해당 환경의 값으로 설정한다.
- OAuth 콜백 및 허용 URL, `LOG_ALLOWED_ORIGINS`는 각 환경의 실제 주소에 맞춘다.
- DB migration은 개발 환경에서 검증한 뒤 운영 배포와 호환되는 순서로 운영에 적용한다.
- GitHub에서 `main`, `develop`의 PR 필수 및 강제 푸시 금지 규칙을 설정한다. 필수 상태 검사는 실제 CI를 구성한 뒤 지정한다.

이 문서는 목표 운영 규칙이며, 외부 서비스의 브랜치 보호 및 배포 설정을 자동으로 적용하지 않는다.

## 태그 및 릴리스

운영 릴리스에 `v<major>.<minor>.<patch>` 형식의 태그를 사용한다. `v1.11.1`은 형식 예시이며 현재 프로젝트의 버전을 뜻하지 않는다.

- major: 호환되지 않는 변경
- minor: 호환되는 기능 추가
- patch: 호환되는 버그 수정

Release는 배포가 확인된 `main` 커밋을 대상으로 작성하고, 이전 버전부터의 PR 변경 내역, 기여자 및 전체 비교 링크를 포함한다. 개발 사이트 배포에는 운영 릴리스 태그를 붙이지 않는다.

릴리스 본문 예시:

```markdown
## What's Changed
* [#123] feat: 프로필 편집 추가 by @contributor in #124
* [#125] fix: 로그인 오류 수정 by @contributor in #126

Full Changelog: https://github.com/Hongttochi/music_town/compare/v1.11.0...v1.11.1
```

Assets의 소스 코드 ZIP 및 tar.gz는 릴리스 태그에 해당하는 코드 아카이브를 사용한다. 별도 실행 파일이나 빌드 결과물 첨부가 필요해지면 추가 규칙을 정한다. 환경 변수 및 비밀 키 파일은 릴리스에 포함하지 않는다.

## GitHub Actions

- `.github/workflows/ci.yml`: `main`, `develop` 대상 PR 및 해당 브랜치 push에서 Node.js 22로 `npm ci`, `npm test`, `npm run build`를 수행한다. 브랜치 보호의 필수 검사는 실제 실행 후 `Build and test`로 지정한다.
- `.github/workflows/release.yml`: `v*` 태그 push 시 정식 버전 형식과 태그 커밋의 `main` 포함 여부를 검증한다. 테스트와 빌드 통과 후 Release를 생성한다. 기존 Release는 재실행으로 덮어쓰지 않는다.
- `.github/release.yml`: PR 라벨로 변경 내역을 분류한다. `feat`/`enhancement`, `fix`/`bug`/`hotfix`, 기타 변경 순으로 표시하고 `skip-changelog` 라벨은 제외한다. 라벨이 없어도 기타 변경에 포함한다. 이 설정 자체가 라벨을 생성하거나 PR에 붙이지는 않는다.

워크플로우와 릴리스 노트 설정을 먼저 `main`에 반영한다. 운영 배포를 확인한 **정확한 커밋 SHA**에 태그를 생성한다. 아래 버전과 SHA는 실제 값으로 바꾼다.

```sh
git fetch origin main --tags
git tag -a v1.2.3 <운영에-배포된-main-커밋-SHA> -m 'Release v1.2.3'
git push origin v1.2.3
```

태그 push 후 Actions의 Release 실행 결과를 확인한다. 실패하면 원인을 수정하고 동일 실행을 재실행한다. 코드 수정이 필요한 경우 새 커밋과 새 버전 태그를 사용한다. 이미 배포한 태그를 다른 커밋으로 옮기지 않는다.

태그 버전은 자동으로 증가하지 않으며 `package.json` 버전도 자동 변경하지 않는다. 버전 정합성이 필요하면 운영 배포 PR에서 `package.json`과 lockfile 버전을 함께 갱신한다. 첫 Release는 비교할 이전 태그가 없어 버전 간 비교 링크가 없을 수 있다.

Release 워크플로우는 사이트 배포나 운영 상태 확인을 수행하지 않는다. 태그를 만드는 사람이 운영 배포 성공을 먼저 확인한다. GitHub가 제공하는 소스 코드 ZIP/tar.gz를 사용하므로 별도의 압축 업로드 작업은 없다.
