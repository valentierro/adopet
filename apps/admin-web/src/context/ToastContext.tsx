import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastList toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg border shadow-lg px-4 py-3 flex items-center justify-between gap-3 ${
            t.type === 'success'
              ? 'bg-adopet-primary/95 text-white border-adopet-primary-dark'
              : t.type === 'error'
                ? 'bg-adopet-accent/95 text-white border-adopet-accent'
                : 'bg-adopet-card text-adopet-text-primary border-adopet-primary/20'
          }`}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 p-1 rounded hover:opacity-80"
            aria-label="Fechar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
