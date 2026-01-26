import { state, setView, type View } from '../stores/state';
import styles from './TabBar.module.css';

export function TabBar() {
  const tabs: { key: View; label: string; letterKey: string }[] = [
    { key: 'operational', label: 'orktrees + PRs', letterKey: 'W' },
    { key: 'planning', label: 'lans + Issues', letterKey: 'P' },
  ];

  return (
    <nav class={styles.tabBar}>
      {tabs.map(tab => (
        <button
          class={`${styles.tab} ${state.currentView === tab.key ? styles.active : ''}`}
          onClick={() => setView(tab.key)}
        >
          <span class={styles.letterKey}>{tab.letterKey}</span>{tab.label}
        </button>
      ))}
    </nav>
  );
}
