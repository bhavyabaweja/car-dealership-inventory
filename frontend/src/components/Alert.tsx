import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "error" | "warning" | "notice";

const looks: Record<AlertVariant, { icon: typeof Info; box: string; title: string }> = {
  error: { icon: CircleAlert, box: "border-red-400/30 bg-red-950/50 text-on-error-container", title: "text-rose-200" },
  // Something outside the person's control, such as a connection that dropped.
  warning: { icon: TriangleAlert, box: "border-amber-400/30 bg-amber-950/40 text-amber-100", title: "text-amber-300" },
  notice: { icon: Info, box: "border-primary-container/30 bg-primary-container/10 text-primary", title: "text-primary" },
};

interface AlertProps {
  variant?: AlertVariant;
  /** A short heading above the message, such as "Authentication failed". */
  title?: string;
  children: ReactNode;
}

/**
 * An error or warning is announced at once (role "alert"); a notice waits for a pause (role "status").
 */
export function Alert({ variant = "error", title, children }: AlertProps) {
  const { icon: Icon, box, title: titleColour } = looks[variant];

  return (
    <div role={variant === "notice" ? "status" : "alert"} className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${box}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className={`mb-0.5 text-xs font-semibold tracking-wide uppercase ${titleColour}`}>{title}</p>}
        {children}
      </div>
    </div>
  );
}
