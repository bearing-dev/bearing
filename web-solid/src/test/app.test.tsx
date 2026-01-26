import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import App from '../App';
import { state } from '../stores/state';

// Mock the API client
vi.mock('../api/client', () => ({
  refresh: vi.fn(),
  connectSSE: vi.fn(),
  disconnectSSE: vi.fn(),
}));

describe('App keyboard navigation', () => {
  beforeEach(() => {
    // Reset state to default
    // Note: This is a simplified test - in real tests we'd reset the store
  });

  it('renders the app', () => {
    render(() => <App />);
    expect(document.body).toBeInTheDocument();
  });

  it('w key triggers view change to operational', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: 'w' });
    document.dispatchEvent(event);

    expect(state.currentView).toBe('operational');
  });

  it('p key triggers view change to planning', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: 'p' });
    document.dispatchEvent(event);

    expect(state.currentView).toBe('planning');
  });

  it('0 key sets focused panel to project-list', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: '0' });
    document.dispatchEvent(event);

    expect(state.focusedPanel).toBe('project-list');
  });

  it('1 key sets focused panel to main table', () => {
    render(() => <App />);

    // First ensure we're on operational view
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));

    const event = new KeyboardEvent('keydown', { key: '1' });
    document.dispatchEvent(event);

    expect(state.focusedPanel).toBe('worktree-table');
  });
});
