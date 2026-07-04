export interface Segment {
  text: string;
  bold: boolean;
}

/** Split a `**bold**`-marked string into renderable segments. */
export function boldSegments(s: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\*\*(.+?)\*\*/gu;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index > last) segments.push({ text: s.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) segments.push({ text: s.slice(last), bold: false });
  return segments.length > 0 ? segments : [{ text: '', bold: false }];
}
