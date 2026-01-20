---
title: Workflow Health
description: Automated detection of uncommitted changes, unpushed commits, and stale worktrees
---

# Workflow Health

Bearing monitors the health of your worktrees so you don't have to.

## The Problem

Without monitoring, issues accumulate silently:

- **Uncommitted changes** get lost when switching contexts
- **Unpushed commits** never make it to the remote
- **Merged PRs** leave stale worktrees cluttering your workspace
- **Base folders** drift off main, breaking the isolation model

Agents waste tokens rediscovering these issues. Humans forget to check.

## What Bearing Detects

| Issue | Description | Auto-fix |
|-------|-------------|----------|
| Dirty worktrees | Files modified but not committed | Prompt to commit |
| Unpushed commits | Commits exist locally but not on remote | Prompt to push |
| Stale worktrees | PR merged, worktree still exists | Cleanup |
| Base violations | Base folder on wrong branch | Recovery |
| Dead entries | JSONL references non-existent folder | Prune |

## How It Works

Ask Claude:
- "Check workflow health"
- "Are there any stale worktrees?"
- "What needs to be pushed?"

Bearing scans all worktrees and reports issues. No manual git commands needed.

## Benefits

**For agents:**
- Pre-flight checks before starting work
- JSON output for programmatic access
- Cached state avoids redundant git operations

**For humans:**
- Single command shows all issues
- No need to remember which worktrees have uncommitted work
- Automatic cleanup of merged PRs

## State Files

Health information is cached in `health.jsonl` (gitignored, machine-specific):

```jsonl
{"folder":"myapp-feature","dirty":true,"unpushed":2,"prState":"OPEN"}
```

This enables fast queries without re-scanning every time.
