---
title: worktree-recover
description: Fix a base folder that's on the wrong branch
---

# worktree-recover

Recover a base folder that accidentally switched off main. Non-destructive: uncommitted work is moved to a proper worktree.

## The Problem

Base folders should always stay on `main`. Sometimes they end up on a feature branch through manual git operations or agent mistakes. This breaks the worktree workflow.

## Usage

```bash
./bearing/scripts/worktree-recover <base-folder>
```

## Arguments

| Argument | Description |
|----------|-------------|
| `base-folder` | Name of the base project folder |

## Example

```bash
./bearing/scripts/worktree-recover fightingwithai.com
```

Output:
```
Found: fightingwithai.com on 'content6' (expected: main)
⚠️  Uncommitted changes detected
Creating worktree: /Users/you/Projects/fightingwithai.com-content6
✓ Moved uncommitted changes to fightingwithai.com-content6
Resetting fightingwithai.com to main...
✓ fightingwithai.com recovered (now on main)
```

## What It Does

1. Checks if base folder is on the wrong branch
2. If uncommitted changes exist:
   - Creates a proper worktree for that branch
   - Moves uncommitted changes to the new worktree
3. Warns about unpushed commits
4. Resets the base folder to `main`

## Detection

Use `worktree-list` to find violations:

```
BASE FOLDER                BRANCH    EXPECTED
fightingwithai.com         content6  main      ← violation
surfing-game               main      main      ← ok
```

## Notes

- Non-destructive: work is moved, not lost
- Creates the worktree if it doesn't already exist
- If worktree already exists, stops and asks you to resolve manually
- Always pull latest main after recovery
