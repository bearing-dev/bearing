# Worktree Workflow

Use git worktrees to isolate tasks. Never switch branches in base folders.

## Rules

1. **Base folders stay on main** - Folders marked `base:true` in the manifest must never switch branches
2. **Create worktrees for tasks** - Use `./sailkit-dev/scripts/worktree-new`
3. **Check the manifest** - Run `./sailkit-dev/scripts/worktree-list` to see all folders
4. **Cleanup after merge** - Use `./sailkit-dev/scripts/worktree-cleanup`

## Commands

```bash
# View all worktrees
./sailkit-dev/scripts/worktree-list

# Create worktree
./sailkit-dev/scripts/worktree-new fightingwithai.com feature-branch --purpose "Add login"

# Remove after merge
./sailkit-dev/scripts/worktree-cleanup fightingwithai.com feature-branch

# Rebuild manifest from git state
./sailkit-dev/scripts/worktree-sync
```

## Unsafe operations (NEVER do these)

- `git checkout <branch>` in a base folder
- `git switch <branch>` in a base folder
- Editing `manifest.jsonl` directly
- Working in another agent's worktree

## Cross-repo tasks

When a task spans repos (e.g., library + consuming site), create worktrees in both:

```bash
./sailkit-dev/scripts/worktree-new bearing-dev feature-branch
./sailkit-dev/scripts/worktree-new fightingwithai.com feature-branch
```

## Recovery

If you accidentally switch a base folder off main:

```bash
git -C fightingwithai.com checkout main
```

## Manifest

The manifest (`sailkit-dev/manifest.jsonl`) tracks:
- Which folders are bases vs worktrees
- Branch ancestry (`basedOn`)
- Purpose of each worktree

Always use the scripts—never edit the manifest directly.
