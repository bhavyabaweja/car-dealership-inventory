import { type ComponentProps, type ReactNode, useId } from "react";

interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  /** Always-visible guidance, hidden while there is an error to show instead. */
  hint?: string;
  error?: ReactNode;
}

/** A labelled input whose error and hint are linked to it for screen readers. */
export function TextField({ label, hint, error, id, className = "", ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const showHint = Boolean(hint) && !error;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || showHint ? messageId : undefined}
        className={
          "mt-1.5 block h-11 w-full rounded-lg border bg-white px-3 text-slate-900 shadow-sm placeholder:text-slate-400 " +
          "focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-600 disabled:bg-slate-50 " +
          `${error ? "border-red-400" : "border-slate-300"} ${className}`
        }
        {...props}
      />
      {error ? (
        <p id={messageId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : (
        showHint && (
          <p id={messageId} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
