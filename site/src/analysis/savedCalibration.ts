import type { Calibration as Cal } from './calibration';
import { readStored, writeStored } from '../hooks/storage';
const STORAGE_KEY = 'vi.calibration';
export function loadCalibration(): Cal | null {
  return readStored<Cal | null>(STORAGE_KEY, null, (value): value is Cal => {
    if (!value || typeof value !== 'object') return false;
    const cal = value as Cal;
    return (
      Number.isFinite(cal.lowHz) &&
      Number.isFinite(cal.highHz) &&
      cal.lowHz >= 50 &&
      cal.highHz <= 1500 &&
      12 * Math.log2(cal.highHz / cal.lowHz) >= 4
    );
  });
}
export function saveCalibration(cal: Cal): boolean {
  return writeStored(STORAGE_KEY, cal);
}
