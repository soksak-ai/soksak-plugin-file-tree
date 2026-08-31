# soksak-plugin-file-tree

Soksak의 side surface에 표시되는 file explorer tree입니다. 이 Plugin은 tree를 소유합니다. Manifest에
viewer Plugin 구현이 선언된 경우에만 해당 Plugin에 파일 열기를 요청합니다.

## 제공 항목

- `tree` view: OS watcher 기반 lazy file tree와 Git status decoration
- Cwd 추종 toggle: 기본은 project root이고 활성화하면 focused terminal의 working directory를 추종
- Command: `open`, `refresh`, `follow`, `ping`
- Permission: `ui`, `fs:read`, `terminal`, `data`, `commands`

File open은 `runtimeDependencies.plugins`에 선언된 viewer Plugin을 호출합니다. 선언된 viewer가 없으면
command는 설치된 구현을 임의로 선택하지 않고 `TARGET_NOT_FOUND`를 반환합니다. 현재 manifest에는
viewer Plugin이 선언되어 있지 않습니다.

Plugin 구현 관계가 존재하면 정확한 `runtimeDependencies.plugins` 참조에서만 읽습니다. 제거된
`dependencies` 필드는 허용하지 않습니다.

## Build와 release

Node와 pnpm version, dependency version은 `.node-version`과 `package.json`이 정확히 소유합니다.
`make verify`는 typecheck, test와 canonical `main.js` byte를 검증합니다. `make attest`는 SDK와 Spec
receipt를 포함한 immutable release를 생성하며 local store에는 kind/id/version별로 공개합니다.
