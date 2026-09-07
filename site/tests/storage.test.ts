import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStringArray, readStored, writeStored } from '../src/hooks/storage';
import { loadCalibration } from '../src/analysis/savedCalibration';
afterEach(() => vi.unstubAllGlobals());
describe('browser storage fallback', () => {
  it('keeps the app usable when storage is denied', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    expect(readStored('progress', [], isStringArray)).toEqual([]);
    expect(writeStored('progress', ['a'])).toBe(false);
    expect(loadCalibration()).toBeNull();
  });
  it('rejects malformed saved data rather than trusting it as app state', () => {
    for (const text of ['not json', '{}', '[1,2]', 'null']) {
      vi.stubGlobal('localStorage', { getItem: () => text });
      expect(readStored('progress', [], isStringArray)).toEqual([]);
    }
    for (const cal of [
      { lowHz: 100, highHz: 101 },
      { lowHz: -1, highHz: 200 },
      { lowHz: '110', highHz: 220 },
      { lowHz: 100, highHz: 240, version: 2 },
      { lowHz: 100, highHz: 240, midHz: 300, version: 2 },
      { lowHz: 100, highHz: 240, midHz: 150, version: 3 },
      { lowHz: 100, highHz: 240, midHz: '150', version: 2 },
    ]) {
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(cal) });
      expect(loadCalibration()).toBeNull();
    }
  });
});
