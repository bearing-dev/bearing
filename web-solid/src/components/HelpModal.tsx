import { Show } from 'solid-js';
import styles from './HelpModal.module.css';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal(props: HelpModalProps) {
  const shortcuts = [
    { key: '1 / w', desc: 'Worktrees + PRs view' },
    { key: '2 / p', desc: 'Plans + Issues view' },
    { key: 'j/k', desc: 'Navigate up/down' },
    { key: 'Enter', desc: 'Select item' },
    { key: 'r', desc: 'Refresh data' },
    { key: '?', desc: 'Toggle help' },
    { key: 'Esc', desc: 'Close modal' },
  ];

  return (
    <Show when={props.open}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div class={styles.header}>
            <span>Keyboard Shortcuts</span>
            <button class={styles.close} onClick={props.onClose}>×</button>
          </div>
          <div class={styles.content}>
            {shortcuts.map(s => (
              <div class={styles.row}>
                <kbd class={styles.key}>{s.key}</kbd>
                <span class={styles.desc}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Show>
  );
}
