# Bearing TUI

> **Experimental:** This TUI is in early development.

Beautiful terminal UI for Bearing worktree management, inspired by lazygit.

## Requirements

- Python 3.10+
- Bearing workspace with state files (`local.jsonl`, `workflow.jsonl`)

## Installation

```bash
cd ~/Projects/bearing-tui/tui
pip install -e .
```

## Usage

```bash
# Set your workspace directory
export BEARING_WORKSPACE=~/Projects

# Run the TUI
bearing-tui

# Or run directly
BEARING_WORKSPACE=~/Projects python -m bearing_tui
```

## Layout

```
┌─ Bearing ──────────────────────────────────────────────────────┐
│ ┌─ Projects ─────┐ ┌─ Worktrees ─────────────────────────────┐ │
│ │ ▶ bearing      │ │ BRANCH              DIRTY  PR    STATUS │ │
│ │   sailkit      │ │ ▶ go-rewrite              OPEN  ●      │ │
│ │   portfolio    │ │   docs-site               MERGED       │ │
│ └────────────────┘ └────────────────────────────────────────┘ │
│ ┌─ Details ────────────────────────────────────────────────┐  │
│ │ Branch: go-rewrite | PR: #10 (OPEN) | Purpose: Go CLI    │  │
│ └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Focus projects panel |
| `l` / `→` | Focus worktrees panel |
| `r` | Refresh data |
| `q` | Quit |

## Development

```bash
cd ~/Projects/bearing-tui/tui
pip install -e ".[dev]"
python -m bearing_tui
```
