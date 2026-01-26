import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { state, setView, setFocusedPanel, navigateProjects, navigateWorktrees, navigatePlans } from './stores/state';
import { refresh, connectSSE, disconnectSSE } from './api/client';
import { TabBar } from './components/TabBar';
import { ProjectList } from './components/ProjectList';
import { WorktreeTable } from './components/WorktreeTable';
import { PlansTable } from './components/PlansTable';
import { DetailsPanel } from './components/DetailsPanel';
import { Footer } from './components/Footer';
import { HelpModal } from './components/HelpModal';
import styles from './App.module.css';

function App() {
  const [connectionStatus, setConnectionStatus] = createSignal<'ok' | 'error' | 'connecting'>('connecting');
  const [helpOpen, setHelpOpen] = createSignal(false);

  onMount(() => {
    refresh();
    connectSSE(setConnectionStatus);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '1':
        case 'w':
          setView('operational');
          break;
        case '2':
        case 'p':
          setView('planning');
          break;
        case '0':
          setFocusedPanel('project-list');
          document.querySelector<HTMLElement>('[data-panel="project-list"]')?.focus();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (state.focusedPanel === 'project-list') {
            navigateProjects('down');
          } else if (state.focusedPanel === 'worktree-table') {
            navigateWorktrees('down');
          } else if (state.focusedPanel === 'plans-table') {
            navigatePlans('down');
          }
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (state.focusedPanel === 'project-list') {
            navigateProjects('up');
          } else if (state.focusedPanel === 'worktree-table') {
            navigateWorktrees('up');
          } else if (state.focusedPanel === 'plans-table') {
            navigatePlans('up');
          }
          break;
        case 'l':
        case 'ArrowRight':
          e.preventDefault();
          if (state.focusedPanel === 'project-list') {
            const panel = state.currentView === 'operational' ? 'worktree-table' : 'plans-table';
            setFocusedPanel(panel);
          }
          break;
        case 'h':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedPanel('project-list');
          break;
        case 'r':
          refresh();
          break;
        case '?':
          setHelpOpen(prev => !prev);
          break;
        case 'Escape':
          setHelpOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
      disconnectSSE();
    });
  });

  return (
    <div class={styles.app}>
      <TabBar />
      <div class={styles.main}>
        <aside class={styles.sidebar}>
          <ProjectList />
        </aside>
        <div class={styles.content}>
          <Show when={state.currentView === 'operational'}>
            <WorktreeTable />
          </Show>
          <Show when={state.currentView === 'planning'}>
            <PlansTable />
          </Show>
          <DetailsPanel />
        </div>
      </div>
      <Footer connectionStatus={connectionStatus()} onShowHelp={() => setHelpOpen(true)} />
      <HelpModal open={helpOpen()} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export default App;
