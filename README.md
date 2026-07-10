# soksak-plugin-file-tree

A left-sidebar file explorer tree for soksak. Code and text files open in the editor; media
files are handled by a separate media-viewer plugin — this plugin owns only the tree.

## What it provides

- **File tree** (`sidebar-left` view) — lazy-loaded, OS-watcher driven (no polling), with
  git status decorations, built on `@pierre/trees`.
- **Shell-cwd follow toggle** — off by default (lists the project root). When on, the tree
  tracks the focused terminal pane's working directory (`ctx.paneId` + `app.terminal`); the
  state persists per project.

Opening a file routes through the core `editor.open` command, so the skeleton picks whatever
viewer is registered for that file type (engine neutrality, contract A13). Theme follows the
host through CSS variables and `theme.changed`.

## Commands

- `file-tree.open {path}` — open a file as content (via `editor.open`)
- `file-tree.refresh {project?}` — re-list the active (or specified) tree from disk; returns `{ ok, project, follow }`
- `file-tree.follow {project?, on?}` — toggle/set shell-cwd follow; returns `{ ok, follow, project }`
- `file-tree.ping` — load/version check

## UI nodes

The tree header exposes one operable node for `ui.tree` / `ui.input.click`:

- `follow` — the cwd-follow toggle button. Clicking it is the UI surface of the `follow`
  command (switches between the project root and the focused terminal's working directory).

File and folder rows are rendered by `@pierre/trees` inside its own shadow DOM, so they are
not individually addressable as light-DOM nodes. Their operation is exposed headlessly
instead: `open {path}` opens any file, and `refresh` re-lists the tree.

## Permissions

`ui`, `fs:read`, `git:read`, `terminal`, `data`, `commands`

## Dependencies

None. The tree opens files only through the core `editor.open` command; whatever file
viewer is installed (an editor engine, the media viewer, …) renders them. The tree is not
tied to any specific viewer engine (A13). Install a viewer plugin separately to see opened
files; with none installed, opening a file shows an empty viewer.

## Build

```
npm install
npm run build   # → main.js
```
