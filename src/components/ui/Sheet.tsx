import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../lib/overlayStack';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  /** Max height of the whole panel (e.g. 'max-h-[94vh]'). */
  maxHeightClass?: string;
  /** Max height of the scrolling body. */
  bodyMaxHeight?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxHeightClass = 'max-h-[85vh]',
  bodyMaxHeight = '70vh',
}: SheetProps) {
  // Let the Android back button close this sheet before any routing happens.
  useOverlay(open, onClose);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body> so a sheet opened from inside another sheet is never
  // clipped or positioned by its parent's slide-up transform.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute bottom-0 inset-x-0 px-safe pb-safe
          rounded-t-[28px] bg-ink-900/95 border-t border-ink-700/60
          shadow-2xl ${maxHeightClass} overflow-hidden
          animate-[slideUp_280ms_cubic-bezier(0.32,0.72,0,1)]`}
      >
        <div className="flex justify-center pt-2">
          <span className="block h-1.5 w-10 rounded-full bg-ink-700" />
        </div>
        {(title || eyebrow) && (
          <div className="px-5 pt-3 pb-4 border-b border-ink-800/80">
            {eyebrow && <p className="label-eyebrow text-ember-400/80">{eyebrow}</p>}
            {title && <div className="display text-2xl text-ink-50 mt-0.5">{title}</div>}
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: bodyMaxHeight }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>,
    document.body,
  );
}
