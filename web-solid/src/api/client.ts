import { setProjects, setWorktrees, setPlans, type Project, type Worktree, type Plan } from '../stores/state';

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function refresh() {
  try {
    const [projects, worktrees, plans] = await Promise.all([
      fetchJSON<Project[]>('/api/projects'),
      fetchJSON<Worktree[]>('/api/worktrees'),
      fetchJSON<Plan[]>('/api/plans'),
    ]);

    setProjects(projects || []);
    setWorktrees(worktrees || []);
    setPlans(plans || []);
  } catch (err) {
    console.error('Refresh failed:', err);
  }
}

// SSE connection for real-time updates
let eventSource: EventSource | null = null;

export function connectSSE(onStatusChange: (status: 'ok' | 'error' | 'connecting') => void) {
  if (eventSource) {
    eventSource.close();
  }

  onStatusChange('connecting');

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('connected', () => {
    onStatusChange('ok');
  });

  eventSource.addEventListener('update', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'health' || data.type === 'worktrees') {
        refresh();
      }
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  });

  eventSource.onerror = () => {
    onStatusChange('error');
    // Reconnect after delay
    setTimeout(() => connectSSE(onStatusChange), 5000);
  };
}

export function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
