import styles from './Footer.module.css';

interface FooterProps {
  connectionStatus: 'ok' | 'error' | 'connecting';
  onShowHelp: () => void;
}

export function Footer(props: FooterProps) {
  const statusText = () => {
    switch (props.connectionStatus) {
      case 'ok': return 'Connected';
      case 'error': return 'Disconnected';
      case 'connecting': return 'Connecting...';
    }
  };

  const statusClass = () => {
    switch (props.connectionStatus) {
      case 'ok': return styles.statusOk;
      case 'error': return styles.statusError;
      case 'connecting': return styles.statusConnecting;
    }
  };

  return (
    <footer class={styles.footer}>
      <span class={`${styles.status} ${statusClass()}`}>{statusText()}</span>
      <span class={styles.help}>
        Press <kbd>?</kbd> for help
      </span>
    </footer>
  );
}
