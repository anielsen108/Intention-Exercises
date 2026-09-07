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
      cal.lowHz >= 30 &&
      cal.highHz <= 1500 &&
      12 * Math.log2(cal.highHz / cal.lowHz) >= 4 &&
      (cal.version === undefined || cal.version === 2) &&
      (cal.midHz === undefined
        ? cal.version === undefined
        : cal.version === 2 &&
          Number.isFinite(cal.midHz) &&
          cal.midHz >= 50 &&
          cal.midHz <= 800 &&
          12 * Math.log2(cal.midHz / cal.lowHz) >= 2.5 - 1e-8 &&
          12 * Math.log2(cal.highHz / cal.midHz) >= 2.5 - 1e-8)
    );
  });
}
export function saveCalibration(cal: Cal): boolean {
  return writeStored(STORAGE_KEY, cal);
}
