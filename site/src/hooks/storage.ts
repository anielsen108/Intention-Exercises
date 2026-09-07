export function readStored<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
