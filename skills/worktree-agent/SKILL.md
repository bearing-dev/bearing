# Worktree Management Agent

A sub-agent pattern for handling worktree operations without cluttering the main conversation.

## When to Use

Invoke this agent when you need to:
- Check worktree status before starting work
- Create worktrees for a new task
- Clean up worktrees after merging
- Fix worktree invariant violations

## How to Invoke

Use the Task tool with `subagent_type: "Explore"` and a focused prompt:

```
Task: Check worktree status and report any issues

Run these commands and summarize the results:
1. worktree-check
2. worktree-list

Report:
- Any base folders not on main (violations)
- Active worktrees and their branches
- Recommended actions if any issues found
```

## Example: Starting a Task

```
Task: Set up worktrees for feature X

1. Run worktree-list to check current state
2. Create worktrees:
   - worktree-new repo-one feature-one
   - worktree-new repo-two feature-one
3. Report the created worktree paths
```

## Example: Finishing a Task

```
Task: Clean up worktrees for feature X

1. Run worktree-cleanup repo-one feature-one
2. Run worktree-cleanup repo-two feature-one
3. Confirm cleanup completed
```

## Benefits

- Main conversation stays focused on the actual task
- Worktree state management is isolated
- Agent returns a simple summary, not verbose command output
- Easier to track what worktrees exist without reading JSONL files
