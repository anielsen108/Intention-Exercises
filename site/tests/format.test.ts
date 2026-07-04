import { describe, expect, it } from 'vitest';
import { boldSegments } from '../src/ui/format';

describe('boldSegments', () => {
  it('splits a stress line into plain and bold segments', () => {
    expect(boldSegments('Let it **GO**')).toEqual([
      { text: 'Let it ', bold: false },
      { text: 'GO', bold: true },
    ]);
  });

  it('handles multiple bold spans', () => {
    expect(boldSegments('I **THOUGHT** you said **THAT**')).toEqual([
      { text: 'I ', bold: false },
      { text: 'THOUGHT', bold: true },
      { text: ' you said ', bold: false },
      { text: 'THAT', bold: true },
    ]);
  });

  it('returns the whole string when there is no bold', () => {
    expect(boldSegments('Let it go')).toEqual([{ text: 'Let it go', bold: false }]);
  });

  it('leaves an unclosed ** literal', () => {
    expect(boldSegments('odd **case')).toEqual([{ text: 'odd **case', bold: false }]);
  });
});
