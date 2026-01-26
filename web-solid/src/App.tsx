import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { state, setView } from './stores/state';
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
          setView('operational');
          break;
        case '2':
          setView('planning');
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
