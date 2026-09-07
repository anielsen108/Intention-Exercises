import type { Calibration } from '../../analysis/calibration';
import { RecorderPanel } from '../RecorderPanel';
import { ContourPlayer } from '../ContourPlayer';
export function TryContour({
  target,
  prompt,
  calibration,
  onRequestCalibration,
}: {
  target: number[];
  prompt: string;
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}) {
  return (
    <div className="try-card">
      <p className="try-prompt">{prompt}</p>
      <ContourPlayer levels={target} calibration={calibration} />
      <RecorderPanel
        keyboardShortcut={false}
        calibration={calibration}
        targetLevels={target}
        prompt="Hum the shape on one comfortable, connected sound."
        onRequestCalibration={onRequestCalibration}
      />
    </div>
  );
}
