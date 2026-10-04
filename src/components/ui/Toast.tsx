import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions {
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

type Shown = ToastOptions & { id: number };

const ToastContext = createContext<((o: ToastOptions) => void) | null>(null);

/** One toast at a time, above the bottom nav. A new toast replaces the old one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const nextId = useRef(1);

  const show = useCallback((o: ToastOptions) => {
    setToast({ ...o, id: nextId.current++ });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.durationMs ?? 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className="fixed inset-x-0 z-[70] px-4 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}
        >
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto mx-auto max-w-md flex items-center gap-3 rounded-2xl
              bg-ink-800 border border-ink-700/70 px-4 py-3 shadow-2xl
              animate-[toastIn_220ms_cubic-bezier(0.32,0.72,0,1)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-50">{toast.message}</p>
              {toast.detail && <p className="text-xs text-ink-300 mt-0.5">{toast.detail}</p>}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="tap shrink-0 rounded-xl px-3 text-sm font-bold text-ember-300 active:bg-ink-700/70"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }`}</style>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
