---
title: Plan Sync
description: Bidirectional sync between local plans and issue trackers
---

# Plan Sync

Keep plans in your workspace, sync to GitHub Issues (or other trackers).

## The Problem

Plans live locally in `~/Projects/plans/` but you want:
- Visibility in GitHub UI
- Link PRs to issues
- Team comments and discussion
- Notifications

## How It Works

Plans are markdown files with frontmatter linking to issues:

```yaml
---
title: Add dark mode
github_repo: user/repo
github_issue: 42
synced_at: 2026-01-19T10:00:00Z
---

Plan content here...
```

Sync compares timestamps and pushes/pulls as needed.

## Benefits

**Local-first:**
- Edit in your editor with full vim/IDE support
- Claude reads/writes without API calls
- Works offline

**GitHub integration:**
- Issues appear in project boards
- Link PRs to issues
- Team discussion on GitHub

**Monorepo of plans:**
- All plans in `~/Projects/plans/`
- Cross-project visibility
- No pollution of repo histories

## Adapter Pattern

Supports multiple issue trackers:
- **GitHub** (implemented) - via `gh` CLI
- **Linear** (future)
- **Jira** (future)

No API keys stored - uses each tool's native auth.

## Usage

Ask Claude:
- "Sync my plans to GitHub"
- "Push this plan to GitHub Issues"
- "Pull issue #42 from sailkit"

Or run directly:
```bash
./bearing/scripts/plan-sync --dry-run
./bearing/scripts/plan-push plans/sailkit/005-deploy.md
./bearing/scripts/plan-pull user/repo 42
```
