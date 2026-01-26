import { For } from 'solid-js';
import { state, selectProject, setFocusedPanel } from '../stores/state';
import styles from './ProjectList.module.css';

export function ProjectList() {
  const handleClick = (name: string) => {
    selectProject(name);
    // Auto-focus main table after selecting project
    const mainPanel = state.currentView === 'operational' ? 'worktree-table' : 'plans-table';
    setFocusedPanel(mainPanel);
    setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-panel="${mainPanel}"]`)?.focus();
    }, 0);
  };

  return (
    <div class={styles.panel}>
      <div class={styles.header}>[0] Projects</div>
      <ul class={styles.list} tabIndex={0} data-panel="project-list">
        <For each={state.projects}>
          {(project) => (
            <li
              class={`${styles.item} ${state.selectedProject === project.name ? styles.selected : ''}`}
              onClick={() => handleClick(project.name)}
            >
              <span class={styles.name}>{project.name}</span>
              <span class={styles.count}>{project.count}</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
