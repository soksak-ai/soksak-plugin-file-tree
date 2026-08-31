# soksak-plugin-file-tree

A left-sidebar file explorer tree for soksak. This plugin owns the tree. It requests file
opening from a viewer Plugin only when that implementation is declared in its manifest.

## What it provides

- **File tree** (`sidebar-left` view) — lazy-loaded, OS-watcher driven (no polling), with
  git status decorations, built on `@pierre/trees`.
- **Shell-cwd follow toggle** — off by default (lists the project root). When on, the tree
  tracks the focused terminal pane's working directory (`ctx.paneId` + `app.terminal`); the
  state persists per project.

Opening a file calls the viewer Plugin declared in `runtimeDependencies.plugins`. With no
declared viewer, the command returns `TARGET_NOT_FOUND`. Theme follows the host through CSS
variables and `theme.changed`.

## Commands

- `file-tree.open {path}` — request file opening from the declared viewer Plugin
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

`ui`, `fs:read`, `terminal`, `data`, `commands`

## Dependencies

The current manifest declares none. Without a declared viewer Plugin, `open` returns
`TARGET_NOT_FOUND` instead of selecting an installed implementation implicitly.

Plugin implementation relationships, when present, are read only from exact
`runtimeDependencies.plugins` references. The removed `dependencies` field is not accepted.

## Build

```
make verify
make attest STORE=/absolute/local-release-store OUT=/absolute/release-output
```
