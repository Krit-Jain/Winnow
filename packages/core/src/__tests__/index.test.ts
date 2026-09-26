import { describe, it, expect } from 'vitest';
import { VERSION, PROJECT_NAME } from '../index.js';

describe('WINNOW Core', () => {
  it('should export the correct project name', () => {
    expect(PROJECT_NAME).toBe('WINNOW');
  });

  it('should export a valid version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
