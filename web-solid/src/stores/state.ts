import { createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';

export type View = 'operational' | 'planning';

export interface Project {
  name: string;
  count: number;
}

export interface Worktree {
  repo: string;
  folder: string;
  branch: string;
  base: boolean;
  dirty: boolean;
  unpushed: number;
  prState: string | null;
  purpose?: string;
  status?: string;
}

export interface Plan {
  path: string;
  title: string;
  project: string;
  status: string;
  issue?: number;
  priority?: number;
}

interface AppState {
  currentView: View;
  projects: Project[];
  worktrees: Worktree[];
  plans: Plan[];
  selectedProject: string | null;
  selectedWorktreeFolder: string | null;
  selectedPlanPath: string | null;
  focusedPanel: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  planSortColumn: string;
  planSortDirection: 'asc' | 'desc';
}

const STORAGE_KEY = 'bearing-state';

function loadPersistedState(): Partial<AppState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old view names
      let view = parsed.currentView || 'operational';
      if (view === 'worktrees') view = 'operational';
      if (view === 'issues' || view === 'prs') view = 'planning';
      return { ...parsed, currentView: view };
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
  return {};
}

const persisted = loadPersistedState();

export const [state, setState] = createStore<AppState>({
  currentView: persisted.currentView || 'operational',
  projects: [],
  worktrees: [],
  plans: [],
  selectedProject: persisted.selectedProject || null,
  selectedWorktreeFolder: persisted.selectedWorktreeFolder || null,
  selectedPlanPath: persisted.selectedPlanPath || null,
  focusedPanel: 'project-list',
  sortColumn: persisted.sortColumn || 'default',
  sortDirection: persisted.sortDirection || 'asc',
  planSortColumn: persisted.planSortColumn || 'default',
  planSortDirection: persisted.planSortDirection || 'asc',
});

// Persist state changes
createEffect(() => {
  const toSave = {
    currentView: state.currentView,
    selectedProject: state.selectedProject,
    selectedWorktreeFolder: state.selectedWorktreeFolder,
    selectedPlanPath: state.selectedPlanPath,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    planSortColumn: state.planSortColumn,
    planSortDirection: state.planSortDirection,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
});

// Actions
export function setView(view: View) {
  setState('currentView', view);
}

export function setProjects(projects: Project[]) {
  setState('projects', projects);
}

export function setWorktrees(worktrees: Worktree[]) {
  setState('worktrees', worktrees);
}

export function setPlans(plans: Plan[]) {
  setState('plans', plans);
}

export function selectProject(name: string) {
  setState('selectedProject', name);
}

export function selectWorktree(folder: string) {
  setState('selectedWorktreeFolder', folder);
}

export function selectPlan(path: string) {
  setState('selectedPlanPath', path);
}

export function setFocusedPanel(panel: string) {
  setState('focusedPanel', panel);
}

export function setSortColumn(column: string) {
  setState('sortColumn', column);
}

export function setSortDirection(dir: 'asc' | 'desc') {
  setState('sortDirection', dir);
}

export function setPlanSortColumn(column: string) {
  setState('planSortColumn', column);
}

export function setPlanSortDirection(dir: 'asc' | 'desc') {
  setState('planSortDirection', dir);
}

// Derived state helpers
export function getFilteredWorktrees() {
  return state.worktrees.filter(w => w.repo === state.selectedProject);
}

export function getFilteredPlans() {
  return state.plans.filter(p => p.project === state.selectedProject);
}

export function getSelectedWorktree() {
  return state.worktrees.find(w => w.folder === state.selectedWorktreeFolder);
}

export function getSelectedPlan() {
  return state.plans.find(p => p.path === state.selectedPlanPath);
}
