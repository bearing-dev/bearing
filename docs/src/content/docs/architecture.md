---
title: Architecture
description: System architecture and design decisions
---

# Architecture

## Overview

Bearing is a CLI tool for managing git worktrees with metadata tracking. It consists of a single binary with subcommands and an optional background daemon.

```
┌─────────────────────────────────────────────────────────────┐
│                      bearing CLI                             │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  worktree   │    plan     │   daemon    │       ai         │
│  commands   │  commands   │  commands   │   commands       │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       ▼             ▼             ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Internal Packages                          │
├────────────┬────────────┬────────────┬────────────┬─────────┤
│   jsonl    │    git     │     gh     │   daemon   │   ai    │
│  (store)   │  (wrapper) │  (client)  │  (health)  │ (claude)│
└─────┬──────┴─────┬──────┴─────┬──────┴─────┬──────┴────┬────┘
      │            │            │            │           │
      ▼            ▼            ▼            ▼           ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐
│ JSONL   │  │   git   │  │   gh    │  │  PID    │  │ claude │
│ files   │  │  binary │  │  CLI    │  │  file   │  │  CLI   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └────────┘
```

## Directory Structure

```
bearing/
├── cmd/bearing/main.go       # Entry point
├── internal/
│   ├── cli/                  # Cobra command handlers
│   │   ├── root.go           # Root command and global flags
│   │   ├── worktree_*.go     # Worktree subcommands
│   │   ├── plan_*.go         # Plan subcommands
│   │   ├── daemon.go         # Daemon commands
│   │   └── ai.go             # AI commands (opt-in)
│   ├── daemon/               # Background health monitor
│   │   ├── daemon.go         # Lifecycle management
│   │   └── health.go         # Health check logic
│   ├── jsonl/                # JSONL storage with locking
│   │   ├── store.go          # Read/write operations
│   │   ├── lock.go           # File locking
│   │   └── types.go          # Entry types
│   ├── git/                  # Git CLI wrapper
│   │   └── repo.go           # Worktree operations
│   ├── gh/                   # GitHub CLI wrapper
│   │   └── client.go         # Issue/PR operations
│   └── ai/                   # Claude CLI wrapper
│       └── client.go         # AI summarization
├── test/
│   ├── integration/          # End-to-end tests
│   └── testutil/             # Test helpers
└── docs/                     # This documentation site
```

## Data Flow

### Creating a Worktree

```
User runs: bearing worktree new myrepo feature-x
                        │
                        ▼
            ┌───────────────────┐
            │   cli/worktree    │
            │      new.go       │
            └─────────┬─────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   git/repo    │           │  jsonl/store  │
│               │           │               │
│ WorktreeAdd() │           │ Append to     │
│               │           │ workflow.jsonl│
└───────┬───────┘           │ and local.jsonl
        │                   └───────────────┘
        ▼
┌───────────────┐
│  git worktree │
│     add       │
└───────────────┘
```

### Daemon Health Check Loop

```
┌─────────────────────────────────────────────────────────┐
│                    daemon.Start()                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   Write PID to          │
            │   ~/.bearing/bearing.pid │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐◄────────────┐
            │     Wait for interval    │             │
            │     (default 5 min)      │             │
            └──────────────┬───────────┘             │
                           │                         │
                           ▼                         │
            ┌──────────────────────────┐             │
            │   For each worktree:     │             │
            │   - git status --porcelain│            │
            │   - git rev-list count   │             │
            │   - gh pr view (optional)│             │
            └──────────────┬───────────┘             │
                           │                         │
                           ▼                         │
            ┌──────────────────────────┐             │
            │   Write health.jsonl     │─────────────┘
            └──────────────────────────┘
```

## State Files

Bearing uses three JSONL files to track state:

| File | Purpose | Committed? |
|------|---------|------------|
| `workflow.jsonl` | Branch metadata (purpose, status) | Yes |
| `local.jsonl` | Local folder paths | No |
| `health.jsonl` | Daemon health cache | No |

### File Locking

JSONL operations use `flock()` for safe concurrent access:

```go
// Acquire shared lock for reads
lock.RLock()
defer lock.RUnlock()

// Acquire exclusive lock for writes
lock.Lock()
defer lock.Unlock()
```

## Command Categories

### Worktree Commands (Core)

| Command | Reads | Writes |
|---------|-------|--------|
| `new` | - | workflow.jsonl, local.jsonl |
| `cleanup` | local.jsonl | workflow.jsonl, local.jsonl |
| `list` | local.jsonl | - |
| `sync` | filesystem | local.jsonl |
| `status` | health.jsonl | - |
| `check` | local.jsonl | - |
| `register` | - | local.jsonl |
| `recover` | remote branches | local.jsonl |

### Plan Commands (GitHub Integration)

| Command | External Dependency |
|---------|---------------------|
| `pull` | `gh issue view` |
| `push` | `gh issue edit` |
| `sync` | `gh issue edit` (batch) |

### Daemon Commands

| Command | Effect |
|---------|--------|
| `start` | Fork background process, write PID file |
| `stop` | Send SIGTERM to PID, remove PID file |
| `status` | Check if PID exists and is bearing process |

### AI Commands (Opt-in)

Gated by `BEARING_AI_ENABLED=1`:

| Command | External Dependency |
|---------|---------------------|
| `summarize` | `claude` CLI |
| `classify-priority` | `claude` CLI |
| `suggest-fix` | `claude` CLI |

## Design Decisions

### Why JSONL?

- **Append-friendly**: New entries add without rewriting
- **Human-readable**: Easy to inspect and debug
- **Line-based**: Simple concurrent access with file locking
- **Git-friendly**: Diffs show individual entry changes

### Why Subcommands?

- **Discoverability**: `bearing --help` shows all capabilities
- **Consistency**: Same flags work across commands (`-w`, `--json`)
- **Extensibility**: Easy to add new command groups

### Why Shell Out to git/gh?

- **No dependencies**: Works with user's existing git/gh config
- **Auth handled**: User's GitHub tokens already work
- **Feature parity**: No need to reimplement git/GitHub APIs

### Why Background Daemon?

- **Periodic checks**: Health data updates without user action
- **Rate limiting**: Spreads GitHub API calls over time
- **Cached reads**: `worktree status` reads from cache, not live queries

## Testing Strategy

### Unit Tests

- `internal/jsonl/` - JSONL parsing, locking
- `internal/git/` - Git command parsing

### Integration Tests

Located in `test/integration/`, these:

1. Create temp directories
2. Initialize real git repos
3. Run `bearing` commands
4. Verify filesystem and JSONL state

Run with: `make integration`

### CI Pipeline

GitHub Actions runs on push/PR to `main` and `go-rewrite`:

1. Build binary
2. Run unit tests
3. Run integration tests with `BEARING_AI_ENABLED=0`
