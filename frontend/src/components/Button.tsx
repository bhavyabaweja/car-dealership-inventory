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

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

// Small buttons are still 44px tall on touch screens, the smallest comfortable tap target.
const sizes: Record<Size, string> = { md: "h-11 px-4 text-sm", sm: "h-11 px-3 text-sm sm:h-9" };

const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:hover:bg-indigo-600",
  secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:hover:bg-white",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:hover:bg-red-600",
  dangerOutline: "bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:hover:bg-white",
  ghost: "text-indigo-700 hover:bg-indigo-50 disabled:hover:bg-transparent",
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
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
