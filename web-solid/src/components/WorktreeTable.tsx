import { For, createMemo } from 'solid-js';
import { state, selectWorktree, setFocusedPanel, setSortColumn, setSortDirection, type Worktree } from '../stores/state';
import styles from './WorktreeTable.module.css';

function sortWorktrees(worktrees: Worktree[], column: string, direction: 'asc' | 'desc'): Worktree[] {
  const sorted = [...worktrees];
  const dir = direction === 'asc' ? 1 : -1;

  if (column === 'default') {
    const prOrder: Record<string, number> = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
    sorted.sort((a, b) => {
      const aPr = prOrder[a.prState || ''] ?? 4;
      const bPr = prOrder[b.prState || ''] ?? 4;
      if (aPr !== bPr) return (aPr - bPr) * dir;
      if (a.dirty !== b.dirty) return ((b.dirty ? 1 : 0) - (a.dirty ? 1 : 0)) * dir;
      return a.folder.localeCompare(b.folder) * dir;
    });
  } else if (column === 'folder') {
    sorted.sort((a, b) => a.folder.localeCompare(b.folder) * dir);
  } else if (column === 'branch') {
    sorted.sort((a, b) => a.branch.localeCompare(b.branch) * dir);
  } else if (column === 'status') {
    sorted.sort((a, b) => {
      const aScore = a.dirty ? 0 : (a.unpushed > 0 ? 1 : 2);
      const bScore = b.dirty ? 0 : (b.unpushed > 0 ? 1 : 2);
      return (aScore - bScore) * dir;
    });
  } else if (column === 'pr') {
    const prOrder: Record<string, number> = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
    sorted.sort((a, b) => {
      const aPr = prOrder[a.prState || ''] ?? 4;
      const bPr = prOrder[b.prState || ''] ?? 4;
      return (aPr - bPr) * dir;
    });
  }

  return sorted;
}

export function WorktreeTable() {
  const filtered = createMemo(() =>
    state.worktrees.filter(w => w.repo === state.selectedProject)
  );

  const sorted = createMemo(() =>
    sortWorktrees(filtered(), state.sortColumn, state.sortDirection)
  );

  const handleSort = (column: string) => {
    if (state.sortColumn === column) {
      setSortDirection(state.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleClick = (folder: string) => {
    selectWorktree(folder);
    setFocusedPanel('worktree-table');
  };

  const getSortClass = (column: string) => {
    if (state.sortColumn !== column) return styles.sortable;
    return `${styles.sortable} ${state.sortDirection === 'asc' ? styles.sortAsc : styles.sortDesc}`;
  };

  return (
    <section class={styles.panel}>
      <div class={styles.header}>[1] Worktrees + PRs</div>
      <div class={styles.table} tabIndex={0} data-panel="worktree-table">
        <div class={styles.tableHeader}>
          <span class={`${styles.colFolder} ${getSortClass('folder')}`} onClick={() => handleSort('folder')}>Folder</span>
          <span class={`${styles.colBranch} ${getSortClass('branch')}`} onClick={() => handleSort('branch')}>Branch</span>
          <span class={`${styles.colStatus} ${getSortClass('status')}`} onClick={() => handleSort('status')}>Status</span>
          <span class={`${styles.colPr} ${getSortClass('pr')}`} onClick={() => handleSort('pr')}>PR</span>
        </div>
        <div class={styles.tableBody}>
          <For each={sorted()}>
            {(worktree) => (
              <div
                class={`${styles.tableRow} ${state.selectedWorktreeFolder === worktree.folder ? styles.selected : ''}`}
                onClick={() => handleClick(worktree.folder)}
              >
                <span class={styles.colFolder}>
                  {worktree.folder}
                  {worktree.base && <span class={styles.baseIndicator}>BASE</span>}
                </span>
                <span class={styles.colBranch}>{worktree.branch}</span>
                <span class={styles.colStatus}>
                  {worktree.dirty && <span class={styles.statusDirty}>*</span>}
                  {worktree.unpushed > 0 && <span class={styles.statusUnpushed}>{worktree.unpushed}↑</span>}
                  {!worktree.dirty && worktree.unpushed === 0 && <span class={styles.statusClean}>✓</span>}
                </span>
                <span class={styles.colPr}>
                  {worktree.prState && (
                    <span class={styles[`pr${worktree.prState.toLowerCase()}`]}>{worktree.prState}</span>
                  )}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}
