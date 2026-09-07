import { useState } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { LearnIpa } from './LearnIpa';
import { LearnTobi } from './LearnTobi';
interface Props {
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}
export function LearnView({ calibration, onRequestCalibration }: Props) {
  const [track, setTrack] = useState<'ipa' | 'tobi'>('ipa');
  return (
    <div className="learn-pane">
      <div
        className="learn-tabs approach-toggle"
        role="tablist"
        aria-label="Learn track"
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === 'Home'
              ? 'ipa'
              : e.key === 'End'
                ? 'tobi'
                : track === 'ipa'
                  ? 'tobi'
                  : 'ipa';
          setTrack(next);
          document.getElementById(`tab-${next}`)?.focus();
        }}
      >
        {(['ipa', 'tobi'] as const).map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            role="tab"
            aria-controls={`learn-${t}`}
            aria-selected={track === t}
            tabIndex={track === t ? 0 : -1}
            className={track === t ? 'active' : ''}
            onClick={() => setTrack(t)}
          >
            {t === 'ipa' ? 'Intro to IPA tones' : 'Intro to ToBI'}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`learn-${track}`}
        aria-labelledby={`tab-${track}`}
      >
        {track === 'ipa' ? (
          <LearnIpa
            calibration={calibration}
            onRequestCalibration={onRequestCalibration}
          />
        ) : (
          <LearnTobi
            calibration={calibration}
            onRequestCalibration={onRequestCalibration}
          />
        )}
      </div>
    </div>
  );
}
