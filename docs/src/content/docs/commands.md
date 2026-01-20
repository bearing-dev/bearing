---
title: Commands
description: Reference for all Bearing CLI commands
---

# Commands

All commands use subcommand syntax: `bearing <command> <subcommand> [args] [flags]`

## Worktree Commands

| Command | Description |
|---------|-------------|
| `bearing worktree new <repo> <branch>` | Create a worktree for a branch |
| `bearing worktree cleanup <repo> <branch>` | Remove a worktree after merge |
| `bearing worktree sync` | Rebuild manifest from git state |
| `bearing worktree list` | Display worktrees |
| `bearing worktree register <folder>` | Register existing folder as base |
| `bearing worktree check` | Validate invariants |
| `bearing worktree recover <base-folder>` | Recover worktrees from remote branches |
| `bearing worktree status` | Show health status (dirty, unpushed, PR state) |

## Plan Commands

| Command | Description |
|---------|-------------|
| `bearing plan pull <repo> <issue>` | Pull a GitHub issue into a local plan file |
| `bearing plan push <file>` | Push a plan file back to its GitHub issue |
| `bearing plan sync` | Sync all plan files with GitHub issues |

## Daemon Commands

| Command | Description |
|---------|-------------|
| `bearing daemon start` | Start the background health monitor |
| `bearing daemon stop` | Stop the daemon |
| `bearing daemon status` | Check if daemon is running |

## AI Commands (Opt-in)

| Command | Description |
|---------|-------------|
| `bearing ai summarize` | Summarize workspace state with AI |

Set `BEARING_AI_ENABLED=1` to enable AI features.

## Common Workflows

### Starting a new task

```bash
bearing worktree new myapp feature-auth --purpose "Add authentication"
cd myapp-feature-auth
# ... work on the feature ...
```

### Finishing a task

```bash
# After merging the PR
bearing worktree cleanup myapp feature-auth
```

### Checking workspace health

```bash
bearing worktree check
bearing worktree list --json
bearing worktree status
```

### Syncing plans with GitHub

```bash
# Pull issue content into a plan file
bearing plan pull myapp 42

# Edit the plan locally, then push back
bearing plan push plans/myapp/042-feature.md

# Or sync all plans
bearing plan sync
```

### Running the health daemon

```bash
# Start daemon (runs in background)
bearing daemon start --interval 300

# Check status
bearing daemon status

# Stop when done
bearing daemon stop
```
