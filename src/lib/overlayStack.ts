import { useEffect, useRef } from 'react';

// A small LIFO stack of open overlays (sheets, dialogs). The Android back button
// closes the topmost one before doing any routing, so back dismisses a sheet
// instead of navigating away or exiting the app. See useAndroidBackButton.
type CloseFn = () => void;

interface OverlayEntry {
  id: number;
  close: CloseFn;
}

const stack: OverlayEntry[] = [];
let nextId = 1;

/** Close the most-recently-opened overlay. Returns false if none are open. */
export function closeTopOverlay(): boolean {
  const top = stack.pop();
  if (!top) return false;
  top.close();
  return true;
}

export function hasOpenOverlay(): boolean {
  return stack.length > 0;
}

/**
 * Register an overlay on the stack while `open` is true. The latest `onClose`
 * is always used, and the entry is removed when the overlay closes or unmounts.
 */
export function useOverlay(open: boolean, onClose: CloseFn): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = nextId++;
    stack.push({ id, close: () => onCloseRef.current() });
    return () => {
      const i = stack.findIndex((o) => o.id === id);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [open]);
}
