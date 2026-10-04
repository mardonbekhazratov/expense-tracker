import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Icon } from '../Icon';
import { useOverlay } from '../../lib/overlayStack';

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function resolveAndClose(v: boolean) {
    if (!pending) return;
    pending.resolve(v);
    setPending(null);
  }

  // Android back button dismisses the dialog as a cancel.
  useOverlay(pending !== null, () => resolveAndClose(false));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[60] grid place-items-center px-5 pt-safe pb-safe">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
            onClick={() => resolveAndClose(false)}
            aria-hidden
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-3xl bg-ink-900 border border-ink-700/60 p-5 shadow-2xl
              animate-[pop_220ms_cubic-bezier(0.32,0.72,0,1)]"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 shrink-0 rounded-xl grid place-items-center ${
                  pending.tone === 'danger'
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'bg-ember-500/15 text-ember-300'
                }`}
              >
                <Icon
                  name={pending.tone === 'danger' ? 'caution' : 'sparkle'}
                  size={22}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="display text-xl text-ink-50 leading-tight">
                  {pending.title}
                </h2>
                {pending.body && (
                  <p className="text-sm text-ink-300 mt-1.5 leading-relaxed">
                    {pending.body}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={() => resolveAndClose(false)}
                className="btn-ghost py-2.5"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => resolveAndClose(true)}
                className={`tap inline-flex items-center justify-center rounded-xl font-semibold px-4 py-2.5 text-white
                  ${
                    pending.tone === 'danger'
                      ? 'bg-rose-500 active:bg-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_24px_-8px_rgba(244,63,94,0.45)]'
                      : 'btn-primary'
                  }`}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes pop {
              from { opacity: 0; transform: translateY(8px) scale(0.96) }
              to { opacity: 1; transform: translateY(0) scale(1) }
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
