# soksak-plugin-files

A file explorer for soksak: a left-sidebar file tree plus media viewers
(image, PDF, video, audio). Code and text files are delegated to the editor
plugin; this plugin claims media files by extension.

## What it provides

- **File tree** (`sidebar-left` view) — lazy-loaded, OS-watcher driven
  (no polling), with git status decorations, built on `@pierre/trees`.
- **Shell-cwd follow toggle** — off by default (lists the project root). When on,
  the tree tracks the focused terminal pane's working directory
  (`ctx.paneId` + `app.terminal`); the state persists per project.
- **Media viewers** (`fileViewers`) — image / pdf / video / audio, rendered from
  `app.fs.readBinary`.

Theme follows the host through CSS variables and `theme.changed` (engine-neutral,
contract A10/A13). Opening a file routes through the core `editor.open` command,
so the right viewer is chosen by the skeleton.

## Commands

- `files.open {path}` — open a file as content (via `editor.open`)
- `files.refresh {project?}` — re-list the active tree from disk
- `files.follow {project?, on?}` — toggle/set shell-cwd follow
- `files.ping` — load/version check

## Permissions

`ui`, `fs:read`, `git:read`, `terminal`, `data`, `commands`

## Dependencies

`soksak-plugin-editor` (renders code/text files this plugin does not claim)

## Build

```
npm install
npm run build   # → main.js
```
