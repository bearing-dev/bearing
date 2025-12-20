# Worktree Status

Check the status of all worktrees and validate invariants.

## What This Does

1. Syncs the manifest with current git state
2. Displays all worktrees in a table
3. Checks for invariant violations (base folders not on main)
4. Reports any issues that need fixing

## Run

```bash
# Check for violations
./sailkit-dev/scripts/worktree-check

# View all worktrees
./sailkit-dev/scripts/worktree-list
```

## Fixing Violations

If a base folder is on the wrong branch:

```bash
git -C <folder> checkout main
```

## Output

Shows a table with columns:
- FOLDER: Directory name
- REPO: Parent repository
- BRANCH: Current branch
- BASE: Whether this is a base folder (should stay on main)
- BASED_ON: Parent branch (for worktrees)
