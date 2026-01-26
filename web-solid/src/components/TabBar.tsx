import { state, setView, type View } from '../stores/state';
import styles from './TabBar.module.css';

export function TabBar() {
  const tabs: { key: View; label: string; shortcut: string }[] = [
    { key: 'operational', label: 'Worktrees + PRs', shortcut: '1' },
    { key: 'planning', label: 'Plans + Issues', shortcut: '2' },
  ];

  return (
    <nav class={styles.tabBar}>
      {tabs.map(tab => (
        <button
          class={`${styles.tab} ${state.currentView === tab.key ? styles.active : ''}`}
          onClick={() => setView(tab.key)}
        >
          <span class={styles.shortcut}>[{tab.shortcut}]</span> {tab.label}
        </button>
      ))}
    </nav>
  );
}
