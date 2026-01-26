import { state, setView, type View } from '../stores/state';
import styles from './TabBar.module.css';

export function TabBar() {
  const tabs: { key: View; label: string; numKey: string; letterKey: string }[] = [
    { key: 'operational', label: 'orktrees + PRs', numKey: '1', letterKey: 'W' },
    { key: 'planning', label: 'lans + Issues', numKey: '2', letterKey: 'P' },
  ];

  return (
    <nav class={styles.tabBar}>
      {tabs.map(tab => (
        <button
          class={`${styles.tab} ${state.currentView === tab.key ? styles.active : ''}`}
          onClick={() => setView(tab.key)}
        >
          <span class={styles.numKey}>{tab.numKey}</span>
          <span class={styles.letterKey}>{tab.letterKey}</span>{tab.label}
        </button>
      ))}
    </nav>
  );
}
