<div align="center">
  <img src="./build/icon.svg" width="96" height="96" alt="What Have I Done Today icon">
  <h1 align="center">What Have I Done Today</h1>
  <p align="center">A system-tray daily log app for tracking your accomplishments.</p>
  <p align="center">
    <a href="#features">Features</a> ·
    <a href="#install">Install</a> ·
    <a href="#development">Development</a> ·
    <a href="#build">Build</a>
  </p>
</div>

---

A minimalist Electron app that lives in your system tray. Log short daily entries with optional colored tags, view your history, and track your activity with a GitHub-style calendar.

Built with Electron, React, TypeScript, SQLite, and the [Zed Light System](https://base-ui.com) design language.

## Features

- **Quick logging** — Type an entry and press Enter. Tag it with colors.
- **History** — Browse past entries by date. Edit or delete from the history view.
- **Dashboard** — GitHub-style activity calendar and weekly breakdown by tag.
- **Inline editing** — Double-click any entry to edit. Three-dot menu for copy, tags, delete.
- **Settings** — Always-on-top, auto-hide on blur, sound effects, and data storage location.
- **Audio feedback** — Subtle Web Audio API sounds for log/delete actions (toggleable).
- **Tags** — Create, edit, and delete colored tags to categorize your entries.

## Install

### Linux

Download the latest `.AppImage` from the [releases page](https://github.com/viet/whid/releases).

```bash
chmod +x What-Have-I-Done-Today-*.AppImage
./What-Have-I-Done-Today-*.AppImage
```

### macOS / Windows

Download the `.dmg` (macOS) or `.exe` (Windows) from the [releases page](https://github.com/viet/whid/releases).

### From source

```bash
git clone https://github.com/viet/whid.git
cd whid
pnpm install
pnpm dist
```

The packaged app will be in `release/`.

## Development

```bash
pnpm dev
```

Opens the Electron app with hot-reload. The app lives in your system tray — click the tray icon or press `Ctrl+Alt+L` to toggle the window.

### Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron 31 |
| UI | React 18, TypeScript |
| Styling | CSS custom properties (Zed Light System) |
| Database | SQLite via better-sqlite3 |
| UI primitives | Base UI (Menu, Switch, ToggleGroup) |
| Icons | Lucide React |
| Charts | Recharts, react-activity-calendar |

## Build

```bash
pnpm build     # Compile TypeScript + Vite
pnpm dist      # Package into platform installer
```

Output goes to `release/`. Current targets:

| Platform | Format |
|----------|--------|
| Linux | AppImage |
| macOS | DMG |
| Windows | NSIS installer |
