/** Small render helpers that attach hover glosses to tone notation. */
import { levelsToToneLetters } from '../content/tones';
import { ipaGloss, tobiGloss } from './toneGloss';

/** IPA tone letters with a hover description of the contour. */
export function ToneLetters({ levels, big = false }: { levels: number[]; big?: boolean }) {
  if (levels.length === 0) return null;
  return (
    <span className={`tone-letters tone-tip ${big ? 'big' : ''}`} title={ipaGloss(levels)}>
      {levelsToToneLetters(levels)}
    </span>
  );
}

/** A ToBI string ("H* L* L-L% // …") with a hover description per token. */
export function TobiNotation({ value }: { value: string }) {
  const tokens = value.split(/(\s+)/);
  return (
    <span className="tobi">
      {tokens.map((token, i) => {
        const gloss = tobiGloss(token);
        return gloss ? (
          <span key={i} className="tone-tip" title={gloss}>
            {token}
          </span>
        ) : (
          <span key={i}>{token}</span>
        );
      })}
    </span>
  );
}
