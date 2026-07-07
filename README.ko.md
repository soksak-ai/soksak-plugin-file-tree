# soksak-plugin-file-tree

soksak 좌측 사이드바 파일 탐색기 트리. 코드·텍스트 파일은 에디터에서 열리고, 미디어 파일은 별도
미디어 뷰어 플러그인이 처리합니다 — 이 플러그인은 트리만 소유합니다.

## 제공 기능

- **파일 트리**(`sidebar-left` 뷰) — lazy 로딩, OS 워처 기반(폴링 없음), git 상태 데코레이션,
  `@pierre/trees` 기반.
- **셸 cwd 추종 토글** — 기본 꺼짐(프로젝트 루트 표시). 켜면 포커스된 터미널 pane 의 작업
  디렉토리를 추종(`ctx.paneId` + `app.terminal`). 상태는 프로젝트별로 영속.

파일 열기는 코어 `editor.open` 명령으로 라우팅되어, 스켈레톤이 그 파일형에 등록된 뷰어를 고릅니다
(엔진 중립, 계약 A13). 테마는 호스트 CSS 변수 + `theme.changed` 로 추종.

## 명령

- `file-tree.open {path}` — 파일을 콘텐츠로 열기(`editor.open` 경유)
- `file-tree.refresh {project?}` — 활성(또는 지정) 트리 디스크 재나열, `{ ok, project, follow }` 반환
- `file-tree.follow {project?, on?}` — 셸 cwd 추종 토글/설정, `{ ok, follow, project }` 반환
- `file-tree.ping` — 적재/버전 확인

## 권한

`ui`, `fs:read`, `git:read`, `terminal`, `data`, `commands`

## 의존성

없음. 트리는 코어 `editor.open` 명령으로만 파일을 열고, 설치된 뷰어(에디터 엔진·미디어 뷰어 등)가
렌더합니다. 특정 뷰어 엔진에 묶이지 않습니다(A13). 열린 파일을 보려면 뷰어 플러그인을 따로 설치하세요
(없으면 빈 뷰어가 표시됩니다).

## 빌드

```
npm install
npm run build   # → main.js
```
