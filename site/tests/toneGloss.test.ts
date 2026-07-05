import { describe, expect, it } from 'vitest';
import { ipaGloss, tobiGloss } from '../src/ui/toneGloss';

describe('tobiGloss', () => {
  it('describes the common pitch accents', () => {
    expect(tobiGloss('H*')).toMatch(/high pitch accent/i);
    expect(tobiGloss('L*')).toMatch(/low pitch accent/i);
    expect(tobiGloss('L+H*')).toMatch(/ris/i);
    expect(tobiGloss('H+L*')).toMatch(/fall/i);
    expect(tobiGloss('!H*')).toMatch(/downstep/i);
  });

  it('describes boundary tones with their typical meaning', () => {
    expect(tobiGloss('L-L%')).toMatch(/final/i);
    expect(tobiGloss('L-H%')).toMatch(/continuation|rise/i);
    expect(tobiGloss('H-H%')).toMatch(/question|rise/i);
    expect(tobiGloss('H-L%')).toMatch(/plateau|level/i);
  });

  it('describes clause-break separators', () => {
    expect(tobiGloss('//')).toMatch(/break|boundary/i);
    expect(tobiGloss('/')).toMatch(/break|boundary/i);
  });

  it('returns null for unknown tokens', () => {
    expect(tobiGloss('XYZ')).toBeNull();
  });
});

describe('ipaGloss', () => {
  it('names the shape and the levels of a falling contour', () => {
    const gloss = ipaGloss([5, 1]);
    expect(gloss).toMatch(/falling/i);
    expect(gloss).toMatch(/extra-high/);
    expect(gloss).toMatch(/extra-low/);
    expect(gloss).toMatch(/finality|certainty|command/i);
  });

  it('describes rises with their typical intention', () => {
    expect(ipaGloss([1, 3])).toMatch(/rising/i);
    expect(ipaGloss([1, 3])).toMatch(/question|invitation|politeness/i);
  });

  it('describes rise-fall and fall-rise', () => {
    expect(ipaGloss([1, 5, 1])).toMatch(/rise-fall/i);
    expect(ipaGloss([1, 5, 1])).toMatch(/emphasis|contrast|correction/i);
    expect(ipaGloss([5, 1, 5])).toMatch(/fall-rise/i);
    expect(ipaGloss([5, 1, 5])).toMatch(/reservation|irony/i);
  });

  it('describes level tones', () => {
    expect(ipaGloss([3])).toMatch(/level/i);
    expect(ipaGloss([5, 5])).toMatch(/level/i);
    expect(ipaGloss([5, 5])).toMatch(/extra-high/);
  });

  it('treats a monotone three-level sequence as a plain rise', () => {
    const gloss = ipaGloss([1, 3, 5]);
    expect(gloss).toMatch(/rising/i);
    expect(gloss).not.toMatch(/rise-fall/i);
  });
});
