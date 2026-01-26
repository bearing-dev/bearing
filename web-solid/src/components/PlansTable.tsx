import { For, createMemo } from 'solid-js';
import { state, selectPlan, setFocusedPanel, setPlanSortColumn, setPlanSortDirection, type Plan } from '../stores/state';
import styles from './PlansTable.module.css';

function sortPlans(plans: Plan[], column: string, direction: 'asc' | 'desc'): Plan[] {
  const sorted = [...plans];
  const dir = direction === 'asc' ? 1 : -1;

  if (column === 'default') {
    const statusOrder: Record<string, number> = { draft: 0, active: 0, done: 1, archived: 2 };
    sorted.sort((a, b) => {
      const aStatus = statusOrder[a.status] ?? 3;
      const bStatus = statusOrder[b.status] ?? 3;
      if (aStatus !== bStatus) return (aStatus - bStatus) * dir;
      return a.title.localeCompare(b.title) * dir;
    });
  } else if (column === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title) * dir);
  } else if (column === 'project') {
    sorted.sort((a, b) => a.project.localeCompare(b.project) * dir);
  } else if (column === 'status') {
    sorted.sort((a, b) => (a.status || '').localeCompare(b.status || '') * dir);
  } else if (column === 'issue') {
    sorted.sort((a, b) => ((a.issue || 0) - (b.issue || 0)) * dir);
  }

  return sorted;
}

export function PlansTable() {
  const filtered = createMemo(() =>
    state.plans.filter(p => p.project === state.selectedProject)
  );

  const sorted = createMemo(() =>
    sortPlans(filtered(), state.planSortColumn, state.planSortDirection)
  );

  const handleSort = (column: string) => {
    if (state.planSortColumn === column) {
      setPlanSortDirection(state.planSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPlanSortColumn(column);
      setPlanSortDirection('asc');
    }
  };

  const handleClick = (path: string) => {
    selectPlan(path);
    setFocusedPanel('plans-table');
  };

  const getSortClass = (column: string) => {
    if (state.planSortColumn !== column) return styles.sortable;
    return `${styles.sortable} ${state.planSortDirection === 'asc' ? styles.sortAsc : styles.sortDesc}`;
  };

  return (
    <section class={styles.panel}>
      <div class={styles.header}>[1] Plans + Issues</div>
      <div class={styles.table} tabIndex={0} data-panel="plans-table">
        <div class={styles.tableHeader}>
          <span class={`${styles.colTitle} ${getSortClass('title')}`} onClick={() => handleSort('title')}>Title</span>
          <span class={`${styles.colProject} ${getSortClass('project')}`} onClick={() => handleSort('project')}>Project</span>
          <span class={`${styles.colStatus} ${getSortClass('status')}`} onClick={() => handleSort('status')}>Status</span>
          <span class={`${styles.colIssue} ${getSortClass('issue')}`} onClick={() => handleSort('issue')}>Issue</span>
        </div>
        <div class={styles.tableBody}>
          <For each={sorted()}>
            {(plan) => (
              <div
                class={`${styles.tableRow} ${state.selectedPlanPath === plan.path ? styles.selected : ''}`}
                onClick={() => handleClick(plan.path)}
              >
                <span class={styles.colTitle}>{plan.title}</span>
                <span class={styles.colProject}>{plan.project}</span>
                <span class={styles.colStatus}>
                  <span class={styles[`status${plan.status}`]}>{plan.status || 'draft'}</span>
                </span>
                <span class={styles.colIssue}>
                  {plan.issue && `#${plan.issue}`}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}
