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

// Navigation helpers
export function navigateProjects(direction: 'up' | 'down') {
  const projects = state.projects;
  if (projects.length === 0) return;

  const currentIndex = projects.findIndex(p => p.name === state.selectedProject);
  let newIndex: number;

  if (currentIndex === -1) {
    newIndex = direction === 'down' ? 0 : projects.length - 1;
  } else if (direction === 'down') {
    newIndex = Math.min(currentIndex + 1, projects.length - 1);
  } else {
    newIndex = Math.max(currentIndex - 1, 0);
  }

  setState('selectedProject', projects[newIndex].name);
}

function sortWorktrees(worktrees: Worktree[], column: string, direction: 'asc' | 'desc'): Worktree[] {
  const sorted = [...worktrees];
  const dir = direction === 'asc' ? 1 : -1;

  if (column === 'default') {
    const prOrder: Record<string, number> = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
    sorted.sort((a, b) => {
      const aPr = prOrder[a.prState || ''] ?? 4;
      const bPr = prOrder[b.prState || ''] ?? 4;
      if (aPr !== bPr) return (aPr - bPr) * dir;
      if (a.dirty !== b.dirty) return ((b.dirty ? 1 : 0) - (a.dirty ? 1 : 0)) * dir;
      return a.folder.localeCompare(b.folder) * dir;
    });
  } else if (column === 'folder') {
    sorted.sort((a, b) => a.folder.localeCompare(b.folder) * dir);
  } else if (column === 'branch') {
    sorted.sort((a, b) => a.branch.localeCompare(b.branch) * dir);
  } else if (column === 'status') {
    sorted.sort((a, b) => {
      const aScore = a.dirty ? 0 : (a.unpushed > 0 ? 1 : 2);
      const bScore = b.dirty ? 0 : (b.unpushed > 0 ? 1 : 2);
      return (aScore - bScore) * dir;
    });
  } else if (column === 'pr') {
    const prOrder: Record<string, number> = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
    sorted.sort((a, b) => {
      const aPr = prOrder[a.prState || ''] ?? 4;
      const bPr = prOrder[b.prState || ''] ?? 4;
      return (aPr - bPr) * dir;
    });
  }

  return sorted;
}

export function navigateWorktrees(direction: 'up' | 'down') {
  const filtered = state.worktrees.filter(w => w.repo === state.selectedProject);
  const worktrees = sortWorktrees(filtered, state.sortColumn, state.sortDirection);
  if (worktrees.length === 0) return;

  const currentIndex = worktrees.findIndex(w => w.folder === state.selectedWorktreeFolder);
  let newIndex: number;

  if (currentIndex === -1) {
    newIndex = direction === 'down' ? 0 : worktrees.length - 1;
  } else if (direction === 'down') {
    newIndex = Math.min(currentIndex + 1, worktrees.length - 1);
  } else {
    newIndex = Math.max(currentIndex - 1, 0);
  }

  setState('selectedWorktreeFolder', worktrees[newIndex].folder);
}

export function navigatePlans(direction: 'up' | 'down') {
  const plans = state.plans.filter(p => p.project === state.selectedProject);
  if (plans.length === 0) return;

  const currentIndex = plans.findIndex(p => p.path === state.selectedPlanPath);
  let newIndex: number;

  if (currentIndex === -1) {
    newIndex = direction === 'down' ? 0 : plans.length - 1;
  } else if (direction === 'down') {
    newIndex = Math.min(currentIndex + 1, plans.length - 1);
  } else {
    newIndex = Math.max(currentIndex - 1, 0);
  }

  setState('selectedPlanPath', plans[newIndex].path);
}
