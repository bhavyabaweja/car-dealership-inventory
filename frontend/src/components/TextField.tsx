import { type ComponentProps, type ReactNode, useId } from "react";

interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  /** Replaces the label's look, such as the small capitals of the search console. */
  labelClassName?: string;
  /** Always-visible guidance, hidden while there is an error to show instead. */
  hint?: string;
  error?: ReactNode;
  /** A decorative icon inside the field's left edge. It takes no clicks. */
  leading?: ReactNode;
  /** Something to press inside the field's right edge, such as a show-password button. It must be a real control. */
  trailing?: ReactNode;
}

/** A labelled input whose error and hint are linked to it for screen readers. */
export function TextField({ label, labelClassName, hint, error, leading, trailing, id, className = "", ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const showHint = Boolean(hint) && !error;

  return (
    <div>
      <label htmlFor={inputId} className={`block ${labelClassName ?? "text-sm font-medium text-on-surface-variant"}`}>
        {label}
      </label>
      <div className="relative mt-1.5">
        {leading && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-outline">
            {leading}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || showHint ? messageId : undefined}
          className={
            "block h-11 w-full rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline " +
            `${leading ? "pl-10" : "pl-3"} ${trailing ? "pr-11" : "pr-3"} ` +
            "in-[.theme-inventory]:bg-surface-container-lowest/70 " +
            "ring-1 ring-inset transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-container " +
            "disabled:opacity-60 " +
            `${error ? "ring-red-400/70" : "ring-white/12"} ${className}`
          }
          {...props}
        />
        {trailing && <span className="absolute inset-y-0 right-0 flex items-center">{trailing}</span>}
      </div>
      {error ? (
        <p id={messageId} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      ) : (
        showHint && (
          <p id={messageId} className="mt-1.5 text-sm text-outline">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
