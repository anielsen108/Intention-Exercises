import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Hover/focus/tap tooltip. Unlike native `title`, it works on touch devices
 * (tap toggles, tap elsewhere dismisses) and is stylable. The gloss is also
 * exposed as an aria-label for screen readers.
 */
export function Tip({ gloss, children }: { gloss: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="tip-wrap"
      tabIndex={0}
      aria-label={gloss}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      {children}
      {open && (
        <span className="tip-pop" role="tooltip">
          {gloss}
        </span>
      )}
    </span>
  );
}
