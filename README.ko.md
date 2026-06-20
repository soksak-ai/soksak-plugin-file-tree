# soksak-plugin-files

soksak 파일 탐색기: 좌측 사이드바 파일 트리 + 미디어 뷰어(이미지·PDF·영상·오디오). 코드·텍스트
파일은 에디터 플러그인에 위임하고, 이 플러그인은 미디어를 확장자로 가져갑니다.

## 제공 기능

- **파일 트리**(`sidebar-left` 뷰) — lazy 로딩, OS 워처 기반(폴링 없음), git 상태 데코레이션,
  `@pierre/trees` 기반.
- **셸 cwd 추종 토글** — 기본 꺼짐(프로젝트 루트 표시). 켜면 포커스된 터미널 pane 의 작업
  디렉토리를 추종(`ctx.paneId` + `app.terminal`). 상태는 프로젝트별로 영속.
- **미디어 뷰어**(`fileViewers`) — 이미지/PDF/영상/오디오, `app.fs.readBinary` 로 렌더.

테마는 호스트 CSS 변수 + `theme.changed` 로 추종(엔진 중립, 계약 A10/A13). 파일 열기는 코어
`editor.open` 명령으로 라우팅되어 스켈레톤이 적절한 뷰어를 고릅니다.

## 명령

- `files.open {path}` — 파일을 콘텐츠로 열기(`editor.open` 경유)
- `files.refresh {project?}` — 활성 트리 디스크 재나열
- `files.follow {project?, on?}` — 셸 cwd 추종 토글/설정
- `files.ping` — 적재/버전 확인

## 권한

`ui`, `fs:read`, `git:read`, `terminal`, `data`, `commands`

## 의존성

`soksak-plugin-editor` (이 플러그인이 가져가지 않는 코드/텍스트 파일을 렌더)

## 빌드

```
npm install
npm run build   # → main.js
```
