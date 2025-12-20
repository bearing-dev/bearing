# Sailkit

Worktree-based workflow for parallel AI-assisted development.

## Why

When multiple AI agents work on the same codebase, they can step on each other if they switch branches in shared folders. Sailkit enforces a worktree-per-task pattern that keeps agents isolated.

## Install

```bash
git clone https://github.com/sailkit-dev/sailkit-dev ~/Projects/sailkit-dev
~/Projects/sailkit-dev/install.sh
```

The installer prompts for scope (project-level or global) and creates symlinks to Sailkit's skills.

## Concepts

- **Base folders** (e.g., `fightingwithai.com/`) stay on `main`
- **Worktrees** (e.g., `fightingwithai.com-feature/`) are created for tasks
- **Manifest** (`manifest.jsonl`) tracks all folders, their purpose, and ancestry

## Commands

Run from your Projects folder:

| Command | Description |
|---------|-------------|
| `./sailkit-dev/scripts/worktree-new <repo> <branch>` | Create worktree for branch |
| `./sailkit-dev/scripts/worktree-cleanup <repo> <branch>` | Remove worktree after merge |
| `./sailkit-dev/scripts/worktree-sync` | Rebuild manifest from git state |
| `./sailkit-dev/scripts/worktree-list` | Display manifest as ASCII table |
| `./sailkit-dev/scripts/worktree-register <folder>` | Register existing folder as base |
| `./sailkit-dev/scripts/worktree-check` | Validate invariants (base folders on main) |

### Options

```bash
# Create worktree with metadata
./sailkit-dev/scripts/worktree-new myrepo feature-x --based-on develop --purpose "Add login"
```

## Manifest

The manifest (`manifest.jsonl`) is the source of truth. It's JSON-L format—one JSON object per line:

```jsonl
{"folder":"myrepo","repo":"myrepo","branch":"main","base":true}
{"folder":"myrepo-feature","repo":"myrepo","branch":"feature","base":false,"basedOn":"main","purpose":"Add login"}
```

Agents should interact via scripts, never edit the manifest directly.

## Testing

```bash
./test/smoke-test.sh
```

Runs 14 smoke tests covering all commands and the installer.

## Hooks

Sailkit can run checks automatically on session start. Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/sailkit-dev/scripts/worktree-check --quiet"
          }
        ]
      }
    ]
  }
}
```

The `--quiet` flag suppresses output when all invariants pass. Violations are always reported.

## Slash Commands

After install, these slash commands are available:

| Command | Description |
|---------|-------------|
| `/worktree-status` | Check invariants and display worktree table |

## Future Ideas

Documented for future consideration:

- **Auto-fix with --force**: `worktree-check --fix` to automatically checkout main on violating base folders. Would need `--force` flag to handle dirty working directories.
- **Git hooks in repos**: Pre-checkout hooks in each repo's `.git/hooks/` to block unsafe branch switches. Requires meta-tooling to install hooks.
- **Cross-repo coordination**: Track which agent owns which worktree to prevent conflicts.
- **Platform testing**: CI that tests on Windows (path separators), different shells (fish, zsh, PowerShell).
