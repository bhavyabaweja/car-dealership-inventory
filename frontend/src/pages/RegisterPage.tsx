import { ArrowRight, Mail, PackageCheck, ShieldCheck, UserPlus, Zap } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import photograph from "../assets/auth/register-showcase.jpg";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AuthShowcase, HEADLINE_HIGHLIGHT } from "../components/auth/AuthShowcase";
import { AUTH_INPUT, AUTH_LABEL, AuthSplitLayout } from "../components/auth/AuthSplitLayout";
import { PasswordField } from "../components/auth/PasswordField";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { messageFor } from "../lib/errors";
import { validateEmail, validatePassword } from "../lib/validation";

type Field = "email" | "password" | "confirmation";
type FieldErrors = Partial<Record<Field, string>>;

const MISMATCH = "Passwords do not match.";

/**
 * The confirmation exists only for the person's benefit, to catch a slip while typing a password they cannot see: it is
 * checked here and never sent. A difference is not reported while there is no password yet to differ from.
 */
function validateConfirmation(password: string, confirmation: string): string | undefined {
  if (confirmation === "") return "Please confirm your password.";
  return password !== "" && password !== confirmation ? MISMATCH : undefined;
}

const FIELD_ORDER: Field[] = ["email", "password", "confirmation"];

const showcase = (
  <AuthShowcase
    photograph={photograph}
    tag="New Registration"
    overline="New account"
    headline={
      <>
        Your Journey <span className={HEADLINE_HIGHLIGHT}>Begins</span> Here.
      </>
    }
    description="Create your account to browse the live inventory, see exactly what is in stock, and buy the vehicle you want."
    points={[
      { icon: PackageCheck, label: "Live stock levels" },
      { icon: Zap, label: "Buy in one click" },
      { icon: ShieldCheck, label: "Secure sign-in" },
    ]}
  />
);

/** The sign-up page, in the Stitch design and the same frame as the sign-in page. */
export function RegisterPage() {
  useDocumentTitle("Create an account");
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState<{ message: string; title: string; variant: "error" | "warning" }>();
  const [submitting, setSubmitting] = useState(false);
  const inputs = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirmation: useRef<HTMLInputElement>(null),
  };

  /** Shows the problems and puts the cursor on the first field that has one. */
  function showErrors(next: FieldErrors) {
    setErrors(next);
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) inputs[first].current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirmation: validateConfirmation(password, confirmation),
    };
    if (found.email || found.password || found.confirmation) {
      showErrors(found);
      return;
    }

    setFormError(undefined);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      // Success: the account exists and the person is signed in; the route guard moves them on.
    } catch (failure) {
      setSubmitting(false);
      if (failure instanceof ApiError && failure.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        showErrors({ email: "An account with this email already exists." });
      } else if (failure instanceof ApiError && failure.code === "VALIDATION_ERROR" && failure.details.length > 0) {
        const fromServer: FieldErrors = {};
        for (const { field, message } of failure.details) {
          if (field === "email" || field === "password") fromServer[field] ??= message;
        }
        if (Object.keys(fromServer).length > 0) showErrors(fromServer);
        else setFormError({ message: failure.message, title: "Could not create account", variant: "error" });
      } else if (failure instanceof ApiError && failure.status === 0) {
        setFormError({ message: failure.message, title: "Connection interrupted", variant: "warning" });
      } else {
        setFormError({ message: messageFor(failure), title: "Could not create account", variant: "error" });
      }
    }
  }

  /** Editing a field clears whatever was said about it, so a stale message never lingers. */
  function edit(field: Field, value: string) {
    ({ email: setEmail, password: setPassword, confirmation: setConfirmation })[field](value);
    setErrors((current) => {
      const next = { ...current, [field]: undefined };
      // "Do not match" compares the two passwords, so changing the first makes it stale; "please confirm" does not.
      if (field === "password" && current.confirmation === MISMATCH) next.confirmation = undefined;
      return next;
    });
    if (field === "email") setEmailTaken(false);
  }

  return (
    <AuthSplitLayout showcase={showcase}>
      <div className="mb-6">
        <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-primary-container/30 bg-surface-container shadow-glow">
          <UserPlus className="size-6 text-primary-container" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Create Your Account</h1>
        <p className="mt-2 text-sm text-outline">Join AutoVault and start exploring your next drive.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <Alert variant={formError.variant} title={formError.title}>
            {formError.message}
          </Alert>
        )}

        <TextField
          ref={inputs.email}
          label="Email address"
          labelClassName={AUTH_LABEL}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Enter your email"
          leading={<Mail className="size-4" />}
          className={AUTH_INPUT}
          value={email}
          onChange={(event) => edit("email", event.target.value)}
          error={
            errors.email && emailTaken ? (
              <>
                {errors.email}{" "}
                <Link to="/login" className="font-medium underline">
                  Sign in instead
                </Link>
              </>
            ) : (
              errors.email
            )
          }
        />
        <PasswordField
          ref={inputs.password}
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          hint="8 to 72 characters."
          value={password}
          onChange={(event) => edit("password", event.target.value)}
          error={errors.password}
        />
        <PasswordField
          ref={inputs.confirmation}
          label="Confirm password"
          toggleName="confirm password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          value={confirmation}
          onChange={(event) => edit("confirmation", event.target.value)}
          error={errors.confirmation}
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {submitting ? (
            "Creating account…"
          ) : (
            <>
              Create Account
              <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="pt-2 text-center text-sm text-outline">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-container transition-colors hover:text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
