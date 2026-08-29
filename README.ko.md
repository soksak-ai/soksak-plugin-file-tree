# soksak-plugin-file-tree

Soksak의 side surface에 표시되는 file explorer tree입니다. Code와 text file은 설치된 viewer로
열고 media file도 해당 viewer plugin에 위임합니다. 이 plugin은 tree만 소유합니다.

## 제공 항목

- `tree` view: OS watcher 기반 lazy file tree와 Git status decoration
- Cwd 추종 toggle: 기본은 project root이고 활성화하면 focused terminal의 working directory를 추종
- Command: `open`, `refresh`, `follow`, `ping`
- Permission: `ui`, `fs:read`, `terminal`, `data`, `commands`

File open은 Core의 공개 command를 통해 설치된 viewer에 위임합니다. Checkout이나 특정 viewer
repository를 탐색하지 않습니다.

## Build와 release

Node와 pnpm version, dependency version은 `.node-version`과 `package.json`이 정확히 소유합니다.
`make verify`는 typecheck, test와 canonical `main.js` byte를 검증합니다. `make attest`는 SDK와 Spec
receipt를 포함한 immutable release를 생성하며 local store에는 kind/id/version별로 공개합니다.
