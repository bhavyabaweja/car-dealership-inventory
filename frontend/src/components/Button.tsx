import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
type Size = "md" | "sm";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks clicks while something is happening. */
  loading?: boolean;
}

// Icons never shrink: in a narrow button (three side by side at 320px) they would otherwise be squeezed to dots.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-all [&>svg]:shrink-0 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// Small buttons are still 44px tall on touch screens, the smallest comfortable tap target.
const sizes: Record<Size, string> = { md: "h-11 px-4 text-sm", sm: "h-11 px-3 text-sm sm:h-9" };

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-secondary-container to-primary-container text-white shadow-md hover:brightness-110 " +
    "active:scale-[0.98] disabled:hover:brightness-100 disabled:active:scale-100",
  secondary:
    "bg-surface-container-low text-on-surface ring-1 ring-inset ring-white/10 hover:text-primary-container " +
    "hover:ring-primary-container/50 disabled:hover:text-on-surface disabled:hover:ring-white/10",
  danger: "bg-red-600 text-white shadow-md hover:bg-red-500 disabled:hover:bg-red-600",
  dangerOutline:
    "bg-surface-container-low text-red-300 ring-1 ring-inset ring-red-400/30 hover:bg-red-950/50 " +
    "disabled:hover:bg-surface-container-low",
  ghost: "text-primary-container hover:bg-primary-container/10 disabled:hover:bg-transparent",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}
