---
title: worktree-status
description: Show health of all worktrees
---

# worktree-status

Shows a summary of worktree health across your entire workspace.

## What It Checks

- Uncommitted changes (dirty worktrees)
- Unpushed commits
- Stale worktrees (PR merged)
- Base folder violations
- Dead JSONL entries

## Output

```
WORKTREE HEALTH SUMMARY
=======================

DIRTY (uncommitted changes):
  myapp-feature                            4 files

UNPUSHED (commits not pushed):
  myapp-feature                            2 commits

STALE (PR merged, worktree lingering):
  myapp-old-feature                        PR merged

Summary: 45 healthy, 1 dirty, 1 unpushed, 1 stale
```

## JSON Mode

Use `--json` for programmatic access by agents.
