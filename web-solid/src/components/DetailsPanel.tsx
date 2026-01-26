import { Show, createMemo } from 'solid-js';
import { state, getSelectedWorktree, getSelectedPlan } from '../stores/state';
import styles from './DetailsPanel.module.css';

export function DetailsPanel() {
  const worktree = createMemo(() => getSelectedWorktree());
  const plan = createMemo(() => getSelectedPlan());

  const worktreeDetails = createMemo(() => {
    const w = worktree();
    if (!w) return null;

    const rows = [
      { label: 'Folder:', value: w.folder },
      { label: 'Repo:', value: w.repo },
      { label: 'Branch:', value: w.branch },
      { label: 'Base:', value: w.base ? 'Yes' : 'No' },
    ];

    if (w.purpose) rows.push({ label: 'Purpose:', value: w.purpose });
    if (w.status) rows.push({ label: 'Status:', value: w.status });

    const healthParts: string[] = [];
    if (w.dirty) healthParts.push('Uncommitted changes');
    if (w.unpushed > 0) healthParts.push(`${w.unpushed} unpushed`);
    if (w.prState) healthParts.push(`PR: ${w.prState}`);
    if (healthParts.length > 0) {
      rows.push({ label: 'Health:', value: healthParts.join(', ') });
    }

    return rows;
  });

  const planDetails = createMemo(() => {
    const p = plan();
    if (!p) return null;

    const rows = [
      { label: 'Title:', value: p.title },
      { label: 'Project:', value: p.project },
      { label: 'Status:', value: p.status || 'draft' },
      { label: 'Path:', value: p.path },
    ];

    if (p.issue) rows.push({ label: 'Issue:', value: `#${p.issue}` });
    if (p.priority) rows.push({ label: 'Priority:', value: String(p.priority) });

    return rows;
  });

  const details = createMemo(() =>
    state.currentView === 'operational' ? worktreeDetails() : planDetails()
  );

  return (
    <section class={styles.section}>
      <div class={styles.header}>[2] Details</div>
      <div class={styles.panel} tabIndex={0} data-panel="details">
        <Show when={details()} fallback={
          <span class={styles.empty}>Select an item to view details</span>
        }>
          <div class={styles.content}>
            {details()!.map(row => (
              <div class={styles.row}>
                <span class={styles.label}>{row.label}</span>
                <span class={styles.value}>{row.value}</span>
              </div>
            ))}
          </div>
        </Show>
      </div>
    </section>
  );
}
