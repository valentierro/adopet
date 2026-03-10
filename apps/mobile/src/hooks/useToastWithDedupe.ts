import { useCallback, useRef, useState } from 'react';

const DEDUPE_MS = 4000;

/**
 * Toast state + deduped setter to avoid showing the same message twice
 * when callbacks (e.g. mutation onSuccess) run multiple times.
 * Use showToast() in mutations/callbacks; use toastMessage/setToastMessage for the Toast component.
 */
export function useToastWithDedupe() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastRef = useRef<{ message: string; at: number } | null>(null);

  const showToast = useCallback((message: string) => {
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.message === message && now - last.at < DEDUPE_MS) return;
    lastRef.current = { message, at: now };
    setToastMessage((prev) => (prev === message ? prev : message));
  }, []);

  return { toastMessage, setToastMessage, showToast };
}
