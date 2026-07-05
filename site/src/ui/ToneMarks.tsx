/** Small render helpers that attach hover/tap glosses to tone notation. */
import { levelsToToneLetters } from '../content/tones';
import { Tip } from './Tip';
import { ipaGloss, tobiGloss } from './toneGloss';

/** IPA tone letters with a hover/tap description of the contour. */
export function ToneLetters({ levels, big = false }: { levels: number[]; big?: boolean }) {
  if (levels.length === 0) return null;
  return (
    <Tip gloss={ipaGloss(levels)}>
      <span className={`tone-letters tone-tip ${big ? 'big' : ''}`}>
        {levelsToToneLetters(levels)}
      </span>
    </Tip>
  );
}

/** A ToBI string ("H* L* L-L% // …") with a hover/tap description per token. */
export function TobiNotation({ value }: { value: string }) {
  const tokens = value.split(/(\s+)/);
  return (
    <span className="tobi">
      {tokens.map((token, i) => {
        const gloss = tobiGloss(token);
        return gloss ? (
          <Tip key={i} gloss={gloss}>
            <span className="tone-tip">{token}</span>
          </Tip>
        ) : (
          <span key={i}>{token}</span>
        );
      })}
    </span>
  );
}
