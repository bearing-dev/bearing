// Bearing Web Dashboard - Vanilla JS Application

const API_BASE = 'http://localhost:8374';

// State
const state = {
  currentView: 'operational', // 'operational' (Worktrees+PRs) or 'planning' (Plans+Issues)
  projects: [],
  worktrees: [],
  plans: [],
  selectedProject: null,
  selectedWorktree: null,
  selectedWorktreeFolder: null, // Persisted - the folder name survives reload
  selectedPlan: null,
  selectedPlanPath: null, // Persisted - the plan ID survives reload
  focusedPanel: 'project-list',
  projectIndex: 0,
  worktreeIndex: 0,
  planIndex: 0,
  evtSource: null,
  sortColumn: 'default',
  sortDirection: 'asc',
  planSortColumn: 'default',
  planSortDirection: 'asc',
};

// DOM elements
const els = {
  tabBar: null,
  projectList: null,
  worktreeRows: null,
  plansRows: null,
  detailsContent: null,
  statusIndicator: null,
  helpModal: null,
  worktreesPanel: null,
  plansPanel: null,
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Cache DOM elements
  els.tabBar = document.querySelector('.tab-bar');
  els.projectList = document.getElementById('project-list');
  els.worktreeRows = document.getElementById('worktree-rows');
  els.plansRows = document.getElementById('plans-rows');
  els.detailsContent = document.getElementById('details-content');
  els.statusIndicator = document.getElementById('status-indicator');
  els.helpModal = document.getElementById('help-modal');
  els.worktreesPanel = document.getElementById('worktrees-panel');
  els.plansPanel = document.getElementById('plans-panel');

  // Restore persisted state
  loadState();

  // Setup event listeners
  setupKeyboardNavigation();
  setupClickHandlers();
  setupTabHandlers();
  connectSSE();

  // Restore view and sort indicators - always call switchView to ensure proper state
  switchView(state.currentView);
  updateSortIndicators();

  // Initial data load
  refresh();
}

// State persistence
function saveState() {
  // Store the actual worktree folder, not the index (index changes with sort order)
  const filtered = state.worktrees.filter(w => w.repo === state.selectedProject);
  const selectedWorktree = filtered[state.worktreeIndex];
  const filteredPlans = state.plans.filter(p => p.project === state.selectedProject);
  const selectedPlan = filteredPlans[state.planIndex];

  const persisted = {
    selectedProject: state.selectedProject,
    selectedWorktreeFolder: selectedWorktree?.folder || null,
    selectedPlanPath: selectedPlan?.id || null,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    planSortColumn: state.planSortColumn,
    planSortDirection: state.planSortDirection,
    currentView: state.currentView,
  };
  localStorage.setItem('bearing-state', JSON.stringify(persisted));
}

function loadState() {
  try {
    const saved = localStorage.getItem('bearing-state');
    if (saved) {
      const persisted = JSON.parse(saved);
      state.selectedProject = persisted.selectedProject || null;
      state.selectedWorktreeFolder = persisted.selectedWorktreeFolder || null;
      state.selectedPlanPath = persisted.selectedPlanPath || null;
      state.sortColumn = persisted.sortColumn || 'default';
      state.sortDirection = persisted.sortDirection || 'asc';
      state.planSortColumn = persisted.planSortColumn || 'default';
      state.planSortDirection = persisted.planSortDirection || 'asc';
      // Migrate old view names to new ones
      let view = persisted.currentView || 'operational';
      if (view === 'worktrees') view = 'operational';
      if (view === 'issues' || view === 'prs') view = 'planning';
      state.currentView = view;
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
}

// Data fetching
async function fetchJSON(url) {
  const resp = await fetch(API_BASE + url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function refresh() {
  try {
    const [projects, worktrees, plans] = await Promise.all([
      fetchJSON('/api/projects'),
      fetchJSON('/api/worktrees'),
      fetchJSON('/api/plans'),
    ]);

    state.projects = projects || [];
    state.worktrees = worktrees || [];
    state.plans = plans || [];

    renderProjects();

    // Restore selection or select first
    if (state.selectedProject) {
      const idx = state.projects.findIndex(p => p.name === state.selectedProject);
      if (idx >= 0) {
        state.projectIndex = idx;
        selectProject(state.selectedProject);
      } else if (state.projects.length > 0) {
        state.projectIndex = 0;
        selectProject(state.projects[0].name);
      }
    } else if (state.projects.length > 0) {
      state.projectIndex = 0;
      selectProject(state.projects[0].name);
    }
  } catch (err) {
    console.error('Refresh failed:', err);
    showError('Failed to load data');
  }
}

function sortPlans(plans) {
  const sorted = [...plans];
  const dir = state.planSortDirection === 'asc' ? 1 : -1;

  if (state.planSortColumn === 'default') {
    // Default: status priority (draft/active first), then title
    const statusOrder = { draft: 0, active: 0, done: 1, archived: 2 };
    sorted.sort((a, b) => {
      const aStatus = statusOrder[a.status] ?? 3;
      const bStatus = statusOrder[b.status] ?? 3;
      if (aStatus !== bStatus) return (aStatus - bStatus) * dir;
      return a.title.localeCompare(b.title) * dir;
    });
  } else if (state.planSortColumn === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title) * dir);
  } else if (state.planSortColumn === 'project') {
    sorted.sort((a, b) => a.project.localeCompare(b.project) * dir);
  } else if (state.planSortColumn === 'status') {
    sorted.sort((a, b) => (a.status || '').localeCompare(b.status || '') * dir);
  } else if (state.planSortColumn === 'issue') {
    sorted.sort((a, b) => (a.issue || 0) - (b.issue || 0) * dir);
  }

  return sorted;
}

function handlePlanSort(column) {
  if (state.planSortColumn === column) {
    state.planSortDirection = state.planSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.planSortColumn = column;
    state.planSortDirection = 'asc';
  }
  updatePlanSortIndicators();
  renderPlansTable();
  saveState();
}

function updatePlanSortIndicators() {
  document.querySelectorAll('#plans-table .table-header [data-sort]').forEach(el => {
    el.classList.remove('sort-asc', 'sort-desc');
    if (el.dataset.sort === state.planSortColumn) {
      el.classList.add(state.planSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// Rendering
function renderProjects() {
  els.projectList.innerHTML = state.projects.map((p, i) => `
    <li class="list-item ${i === state.projectIndex ? 'selected' : ''}"
        data-project="${p.name}" data-index="${i}">
      <span class="project-name">${escapeHtml(p.name)}</span>
      <span class="project-count">${p.count}</span>
    </li>
  `).join('');
}

function sortWorktrees(worktrees) {
  const sorted = [...worktrees];
  const dir = state.sortDirection === 'asc' ? 1 : -1;

  if (state.sortColumn === 'default') {
    // Default: PR state (OPEN first), then dirty, then folder
    sorted.sort((a, b) => {
      const prOrder = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
      const aPr = prOrder[a.prState] ?? 4;
      const bPr = prOrder[b.prState] ?? 4;
      if (aPr !== bPr) return (aPr - bPr) * dir;
      if (a.dirty !== b.dirty) return (b.dirty - a.dirty) * dir;
      return a.folder.localeCompare(b.folder) * dir;
    });
  } else if (state.sortColumn === 'folder') {
    sorted.sort((a, b) => a.folder.localeCompare(b.folder) * dir);
  } else if (state.sortColumn === 'branch') {
    sorted.sort((a, b) => a.branch.localeCompare(b.branch) * dir);
  } else if (state.sortColumn === 'status') {
    sorted.sort((a, b) => {
      // dirty first, then unpushed, then clean
      const aScore = a.dirty ? 0 : (a.unpushed > 0 ? 1 : 2);
      const bScore = b.dirty ? 0 : (b.unpushed > 0 ? 1 : 2);
      return (aScore - bScore) * dir;
    });
  } else if (state.sortColumn === 'pr') {
    const prOrder = { OPEN: 0, DRAFT: 1, MERGED: 2, CLOSED: 3 };
    sorted.sort((a, b) => {
      const aPr = prOrder[a.prState] ?? 4;
      const bPr = prOrder[b.prState] ?? 4;
      return (aPr - bPr) * dir;
    });
  }

  return sorted;
}

function handleSort(column) {
  if (state.sortColumn === column) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortColumn = column;
    state.sortDirection = 'asc';
  }
  updateSortIndicators();
  renderWorktrees();
  saveState();
}

function updateSortIndicators() {
  document.querySelectorAll('#worktree-table .table-header [data-sort]').forEach(el => {
    el.classList.remove('sort-asc', 'sort-desc');
    if (el.dataset.sort === state.sortColumn) {
      el.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
  updatePlanSortIndicators();
}

function renderWorktrees() {
  const filtered = sortWorktrees(state.worktrees.filter(w => w.repo === state.selectedProject));

  // Restore selection from persisted folder name
  if (state.selectedWorktreeFolder) {
    const idx = filtered.findIndex(w => w.folder === state.selectedWorktreeFolder);
    if (idx >= 0) {
      state.worktreeIndex = idx;
    } else {
      // Worktree no longer exists, reset
      state.worktreeIndex = 0;
      state.selectedWorktreeFolder = filtered[0]?.folder || null;
    }
  }

  els.worktreeRows.innerHTML = filtered.map((w, i) => {
    const statusParts = [];
    if (w.dirty) statusParts.push('<span class="status-dirty">*</span>');
    if (w.unpushed > 0) statusParts.push(`<span class="status-unpushed">${w.unpushed}↑</span>`);
    if (!w.dirty && w.unpushed === 0) statusParts.push('<span class="status-clean">✓</span>');

    let prBadge = '';
    if (w.prState) {
      const cls = `pr-${w.prState.toLowerCase()}`;
      prBadge = `<span class="${cls}">${w.prState}</span>`;
    }

    const baseTag = w.base ? '<span class="base-indicator">BASE</span>' : '';

    return `
      <div class="table-row ${i === state.worktreeIndex ? 'selected' : ''}"
           data-folder="${w.folder}" data-index="${i}">
        <span class="col-folder">${escapeHtml(w.folder)}${baseTag}</span>
        <span class="col-branch">${escapeHtml(w.branch)}</span>
        <span class="col-status">${statusParts.join(' ')}</span>
        <span class="col-pr">${prBadge}</span>
      </div>
    `;
  }).join('');

  // Update details if we have a selection
  if (filtered.length > 0 && state.worktreeIndex < filtered.length) {
    updateDetails(filtered[state.worktreeIndex]);
  } else {
    clearDetails();
  }
}

function renderPlansTable() {
  const filtered = sortPlans(state.plans.filter(p => p.project === state.selectedProject));

  // Restore selection from persisted plan ID
  if (state.selectedPlanPath) {
    const idx = filtered.findIndex(p => p.path === state.selectedPlanPath);
    if (idx >= 0) {
      state.planIndex = idx;
    } else {
      state.planIndex = 0;
      state.selectedPlanPath = filtered[0]?.id || null;
    }
  }

  els.plansRows.innerHTML = filtered.map((p, i) => {
    const statusClass = `plan-status-${p.status || 'draft'}`;
    const issueLink = p.issue ? `#${p.issue}` : '';

    return `
      <div class="table-row ${i === state.planIndex ? 'selected' : ''}"
           data-plan-id="${p.path}" data-index="${i}">
        <span class="col-title">${escapeHtml(p.title)}</span>
        <span class="col-project">${escapeHtml(p.project)}</span>
        <span class="col-plan-status"><span class="${statusClass}">${p.status || 'draft'}</span></span>
        <span class="col-issue">${issueLink}</span>
      </div>
    `;
  }).join('');

  // Update details if we have a selection
  if (filtered.length > 0 && state.planIndex < filtered.length) {
    updatePlanDetails(filtered[state.planIndex]);
  } else if (state.currentView === 'planning') {
    clearDetails();
  }
}

function updatePlanDetails(plan) {
  if (!plan) {
    clearDetails();
    return;
  }

  state.selectedPlan = plan;

  const rows = [
    { label: 'Title:', value: plan.title },
    { label: 'Project:', value: plan.project },
    { label: 'Status:', value: plan.status || 'draft' },
    { label: 'Path:', value: plan.path },
  ];

  if (plan.issue) {
    rows.push({ label: 'Issue:', value: `#${plan.issue}` });
  }
  if (plan.priority) {
    rows.push({ label: 'Priority:', value: plan.priority });
  }

  els.detailsContent.innerHTML = rows.map(r => `
    <div class="detail-row">
      <span class="detail-label">${r.label}</span>
      <span class="detail-value">${escapeHtml(r.value)}</span>
    </div>
  `).join('');
}

function updateDetails(worktree) {
  if (!worktree) {
    clearDetails();
    return;
  }

  state.selectedWorktree = worktree;

  const rows = [
    { label: 'Folder:', value: worktree.folder },
    { label: 'Repo:', value: worktree.repo },
    { label: 'Branch:', value: worktree.branch },
    { label: 'Base:', value: worktree.base ? 'Yes' : 'No' },
  ];

  if (worktree.purpose) {
    rows.push({ label: 'Purpose:', value: worktree.purpose });
  }
  if (worktree.status) {
    rows.push({ label: 'Status:', value: worktree.status });
  }

  const healthRow = [];
  if (worktree.dirty) healthRow.push('Uncommitted changes');
  if (worktree.unpushed > 0) healthRow.push(`${worktree.unpushed} unpushed`);
  if (worktree.prState) healthRow.push(`PR: ${worktree.prState}`);
  if (healthRow.length > 0) {
    rows.push({ label: 'Health:', value: healthRow.join(', ') });
  }

  els.detailsContent.innerHTML = rows.map(r => `
    <div class="detail-row">
      <span class="detail-label">${r.label}</span>
      <span class="detail-value">${escapeHtml(r.value)}</span>
    </div>
  `).join('');
}

function clearDetails() {
  state.selectedWorktree = null;
  els.detailsContent.innerHTML = '<span style="color: var(--text-dim)">Select a worktree to view details</span>';
}

// Selection
function selectProject(name) {
  state.selectedProject = name;
  state.worktreeIndex = 0;
  state.planIndex = 0;

  // Update project list selection
  els.projectList.querySelectorAll('.list-item').forEach((el, i) => {
    el.classList.toggle('selected', el.dataset.project === name);
    if (el.dataset.project === name) state.projectIndex = i;
  });

  renderWorktrees();
  renderPlansTable();
  saveState();
}

function selectWorktree(index) {
  const filtered = sortWorktrees(state.worktrees.filter(w => w.repo === state.selectedProject));
  if (index < 0 || index >= filtered.length) return;

  state.worktreeIndex = index;
  state.selectedWorktreeFolder = filtered[index].folder;

  els.worktreeRows.querySelectorAll('.table-row').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });

  updateDetails(filtered[index]);
  saveState();
}

function selectPlan(index) {
  const filtered = sortPlans(state.plans.filter(p => p.project === state.selectedProject));
  if (index < 0 || index >= filtered.length) return;

  state.planIndex = index;
  state.selectedPlanPath = filtered[index].id;

  els.plansRows.querySelectorAll('.table-row').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });

  updatePlanDetails(filtered[index]);
  saveState();
}

// Keyboard navigation
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Modals take priority
    if (!els.helpModal.classList.contains('hidden')) {
      if (e.key === 'Escape' || e.key === '?') {
        closeHelp();
        e.preventDefault();
      }
      return;
    }


    // Global keys
    switch (e.key) {
      case '?':
        openHelp();
        e.preventDefault();
        break;
      case 'r':
        refresh();
        e.preventDefault();
        break;
      case 'o':
        openLink();
        e.preventDefault();
        break;
      case '1':
        switchView('operational');
        e.preventDefault();
        break;
      case '2':
        switchView('planning');
        e.preventDefault();
        break;
      case 'h':
      case 'ArrowLeft':
        focusPanel('project-list');
        e.preventDefault();
        break;
      case 'l':
      case 'ArrowRight':
        if (state.focusedPanel === 'project-list') {
          focusPanel(state.currentView === 'operational' ? 'worktree-table' : 'plans-table');
        }
        e.preventDefault();
        break;
      case 'j':
      case 'ArrowDown':
        navigateDown();
        e.preventDefault();
        break;
      case 'k':
      case 'ArrowUp':
        navigateUp();
        e.preventDefault();
        break;
      case 'Enter':
        handleEnter();
        e.preventDefault();
        break;
      case 'Tab':
        cycleViews();
        e.preventDefault();
        break;
    }
  });
}


function focusPanel(panelId) {
  state.focusedPanel = panelId;
  document.getElementById(panelId)?.focus();
}

function focusNextPanel() {
  const tableId = state.currentView === 'operational' ? 'worktree-table' : 'plans-table';
  const panels = ['project-list', tableId, 'details-panel'];
  const currentPanel = state.focusedPanel === 'worktree-table' || state.focusedPanel === 'plans-table'
    ? tableId : state.focusedPanel;
  const idx = panels.indexOf(currentPanel);
  const next = panels[(idx + 1) % panels.length];
  focusPanel(next);
}

function focusPrevPanel() {
  const tableId = state.currentView === 'operational' ? 'worktree-table' : 'plans-table';
  const panels = ['project-list', tableId, 'details-panel'];
  const currentPanel = state.focusedPanel === 'worktree-table' || state.focusedPanel === 'plans-table'
    ? tableId : state.focusedPanel;
  const idx = panels.indexOf(currentPanel);
  const prev = panels[(idx - 1 + panels.length) % panels.length];
  focusPanel(prev);
}

function navigateDown() {
  if (state.focusedPanel === 'project-list') {
    if (state.projectIndex < state.projects.length - 1) {
      state.projectIndex++;
      selectProject(state.projects[state.projectIndex].name);
    }
  } else if (state.focusedPanel === 'worktree-table' || state.focusedPanel === 'plans-table') {
    if (state.currentView === 'operational') {
      const filtered = state.worktrees.filter(w => w.repo === state.selectedProject);
      if (state.worktreeIndex < filtered.length - 1) {
        selectWorktree(state.worktreeIndex + 1);
      }
    } else {
      const filtered = state.plans.filter(p => p.project === state.selectedProject);
      if (state.planIndex < filtered.length - 1) {
        selectPlan(state.planIndex + 1);
      }
    }
  }
}

function navigateUp() {
  if (state.focusedPanel === 'project-list') {
    if (state.projectIndex > 0) {
      state.projectIndex--;
      selectProject(state.projects[state.projectIndex].name);
    }
  } else if (state.focusedPanel === 'worktree-table' || state.focusedPanel === 'plans-table') {
    if (state.currentView === 'operational') {
      if (state.worktreeIndex > 0) {
        selectWorktree(state.worktreeIndex - 1);
      }
    } else {
      if (state.planIndex > 0) {
        selectPlan(state.planIndex - 1);
      }
    }
  }
}

function handleEnter() {
  if (state.focusedPanel === 'project-list' && state.projects[state.projectIndex]) {
    selectProject(state.projects[state.projectIndex].name);
    focusPanel('worktree-table');
  }
}

// Click handlers
function setupClickHandlers() {
  // Sort header clicks for worktrees table
  document.querySelectorAll('#worktree-table .table-header [data-sort]').forEach(el => {
    el.addEventListener('click', () => handleSort(el.dataset.sort));
  });

  // Sort header clicks for plans table
  document.querySelectorAll('#plans-table .table-header [data-sort]').forEach(el => {
    el.addEventListener('click', () => handlePlanSort(el.dataset.sort));
  });

  els.projectList.addEventListener('click', (e) => {
    const item = e.target.closest('.list-item');
    if (item) {
      selectProject(item.dataset.project);
      focusPanel('project-list');
    }
  });

  els.worktreeRows.addEventListener('click', (e) => {
    const row = e.target.closest('.table-row');
    if (row) {
      selectWorktree(parseInt(row.dataset.index));
      focusPanel('worktree-table');
    }
  });

  els.plansRows.addEventListener('click', (e) => {
    const row = e.target.closest('.table-row');
    if (row) {
      selectPlan(parseInt(row.dataset.index));
      focusPanel('plans-table');
    }
  });

  // Modal backdrop clicks
  els.helpModal.addEventListener('click', (e) => {
    if (e.target === els.helpModal) closeHelp();
  });
}

// Modals
function openHelp() {
  els.helpModal.classList.remove('hidden');
}

function closeHelp() {
  els.helpModal.classList.add('hidden');
}

// Actions
function openLink() {
  if (state.currentView === 'operational') {
    // Open PR for selected worktree
    if (!state.selectedWorktree || !state.selectedWorktree.prState) {
      showNotification('No PR for this worktree');
      return;
    }
    const { repo, branch } = state.selectedWorktree;
    const url = `https://github.com/joshribakoff/${repo}/pulls?q=head:${encodeURIComponent(branch)}`;
    window.open(url, '_blank');
  } else {
    // Open issue for selected plan
    if (!state.selectedPlan || !state.selectedPlan.issue) {
      showNotification('No issue for this plan');
      return;
    }
    const url = `https://github.com/joshribakoff/${state.selectedPlan.project}/issues/${state.selectedPlan.issue}`;
    window.open(url, '_blank');
  }
}

// Server-Sent Events
function connectSSE() {
  if (state.evtSource) {
    state.evtSource.close();
  }

  setStatus('connecting');

  state.evtSource = new EventSource(API_BASE + '/api/events');

  state.evtSource.addEventListener('connected', () => {
    setStatus('ok');
  });

  state.evtSource.addEventListener('update', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'health' || data.type === 'worktrees') {
        refresh();
      }
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  });

  state.evtSource.onerror = () => {
    setStatus('error');
    // Reconnect after delay
    setTimeout(connectSSE, 5000);
  };
}

function setStatus(status) {
  els.statusIndicator.className = `status-${status}`;
  els.statusIndicator.title = status === 'ok' ? 'Connected' :
                              status === 'error' ? 'Disconnected' : 'Connecting...';
}

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function showNotification(msg) {
  // Simple notification - could be enhanced
  console.log('Notification:', msg);
}

function showError(msg) {
  console.error('Error:', msg);
  setStatus('error');
}

// Tab navigation
function setupTabHandlers() {
  els.tabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) {
      switchView(tab.dataset.view);
    }
  });
}

function switchView(view) {
  state.currentView = view;

  // Update tab buttons
  els.tabBar.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  // Show/hide view panels
  if (view === 'operational') {
    els.worktreesPanel.classList.remove('hidden');
    els.plansPanel.classList.add('hidden');
    // Update details for selected worktree
    const filtered = state.worktrees.filter(w => w.repo === state.selectedProject);
    if (filtered.length > 0 && state.worktreeIndex < filtered.length) {
      updateDetails(filtered[state.worktreeIndex]);
    } else {
      clearDetails();
    }
  } else {
    els.worktreesPanel.classList.add('hidden');
    els.plansPanel.classList.remove('hidden');
    // Update details for selected plan
    const filtered = state.plans.filter(p => p.project === state.selectedProject);
    if (filtered.length > 0 && state.planIndex < filtered.length) {
      updatePlanDetails(filtered[state.planIndex]);
    } else {
      clearDetails();
    }
  }

  saveState();
}

function cycleViews() {
  const views = ['operational', 'planning'];
  const idx = views.indexOf(state.currentView);
  const next = views[(idx + 1) % views.length];
  switchView(next);
}
