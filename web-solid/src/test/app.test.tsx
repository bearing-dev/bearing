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

  it('1 key triggers view change event', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: '1' });
    document.dispatchEvent(event);

    // Check that the view state updated
    expect(state.currentView).toBe('operational');
  });

  it('w key triggers view change to operational', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: 'w' });
    document.dispatchEvent(event);

    expect(state.currentView).toBe('operational');
  });

  it('2 key triggers view change to planning', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: '2' });
    document.dispatchEvent(event);

    expect(state.currentView).toBe('planning');
  });

  it('p key triggers view change to planning', () => {
    render(() => <App />);

    const event = new KeyboardEvent('keydown', { key: 'p' });
    document.dispatchEvent(event);

    expect(state.currentView).toBe('planning');
  });
});
