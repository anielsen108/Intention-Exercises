import { useState } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { LearnIpa } from './LearnIpa';
import { LearnTobi } from './LearnTobi';

interface Props {
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}

/** The Learn section: two interactive tracks, IPA tones and ToBI. */
export function LearnView({ calibration, onRequestCalibration }: Props) {
  const [track, setTrack] = useState<'ipa' | 'tobi'>('ipa');

  return (
    <main className="learn-pane">
      <div className="learn-tabs approach-toggle" role="tablist" aria-label="Learn track">
        {(['ipa', 'tobi'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={track === t}
            className={track === t ? 'active' : ''}
            onClick={() => setTrack(t)}
          >
            {t === 'ipa' ? 'Intro to IPA tones' : 'Intro to ToBI'}
          </button>
        ))}
      </div>
      {track === 'ipa' ? (
        <LearnIpa calibration={calibration} onRequestCalibration={onRequestCalibration} />
      ) : (
        <LearnTobi calibration={calibration} onRequestCalibration={onRequestCalibration} />
      )}
    </main>
  );
}
