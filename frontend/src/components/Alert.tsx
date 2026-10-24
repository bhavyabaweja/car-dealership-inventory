import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

/**
 * An error is announced at once (role "alert"); a notice waits for a pause (role "status").
 */
export function Alert({ variant = "error", children }: { variant?: "error" | "notice"; children: ReactNode }) {
  const isError = variant === "error";
  const Icon = isError ? CircleAlert : Info;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        "flex items-start gap-2.5 rounded-lg border p-3 text-sm " +
        (isError ? "border-red-200 bg-red-50 text-red-800" : "border-indigo-200 bg-indigo-50 text-indigo-900")
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
