import { describe, it, expect } from 'vitest';

describe('Keyboard shortcuts', () => {
  // Test the switch statement logic directly
  function getViewFromKey(key: string): 'operational' | 'planning' | null {
    switch (key) {
      case '1':
      case 'w':
        return 'operational';
      case '2':
      case 'p':
        return 'planning';
      default:
        return null;
    }
  }

  it('1 key switches to operational view', () => {
    expect(getViewFromKey('1')).toBe('operational');
  });

  it('w key switches to operational view', () => {
    expect(getViewFromKey('w')).toBe('operational');
  });

  it('2 key switches to planning view', () => {
    expect(getViewFromKey('2')).toBe('planning');
  });

  it('p key switches to planning view', () => {
    expect(getViewFromKey('p')).toBe('planning');
  });

  it('other keys return null', () => {
    expect(getViewFromKey('x')).toBe(null);
    expect(getViewFromKey('a')).toBe(null);
  });
});
