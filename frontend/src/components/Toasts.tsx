import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Tone = "success" | "error";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
}

/** How long each kind stays: an error is worth reading twice. */
const DURATION_MS: Record<Tone, number> = { success: 4_000, error: 6_000 };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS[tone]));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => show("success", message), error: (message) => show("error", message) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The region exists before any message does: screen readers only announce changes to a live region they already know. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:px-0 sm:pb-0"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isError = toast.tone === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <div
      role={isError ? "alert" : undefined}
      className={
        "toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border p-3.5 text-sm font-medium shadow-2xl " +
        (isError ? "border-rose-500/40 bg-rose-950/95 text-rose-200" : "border-emerald-500/40 bg-emerald-950/95 text-emerald-200")
      }
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${isError ? "text-rose-400" : "text-emerald-400"}`} aria-hidden="true" />
      <p className="min-w-0 flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-2 grid size-9 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary-container"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside a ToastProvider");
  return api;
}
