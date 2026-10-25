import { Eye, EyeOff, Lock } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { TextField } from "../TextField";
import { AUTH_INPUT, AUTH_LABEL } from "./AuthSplitLayout";

interface PasswordFieldProps extends Omit<ComponentProps<typeof TextField>, "type" | "leading" | "trailing"> {
  /** What the show/hide button calls the field: "Show password", or "Show confirm password" for a second one. */
  toggleName?: string;
}

/** A password field in the look of the sign-in and sign-up pages, with a button to see what has been typed. */
export function PasswordField({ toggleName = "password", className = "", ...props }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);

  return (
    <TextField
      labelClassName={AUTH_LABEL}
      className={`${AUTH_INPUT} ${className}`}
      {...props}
      type={shown ? "text" : "password"}
      leading={<Lock className="size-4" />}
      trailing={
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-label={`${shown ? "Hide" : "Show"} ${toggleName}`}
          className="grid size-11 place-items-center rounded-lg text-outline transition-colors hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container"
        >
          {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      }
    />
  );
}
