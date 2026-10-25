import { ArrowRight, Mail, Search, ShieldCheck, User, Zap } from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import photograph from "../assets/auth/login-showcase.jpg";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AuthShowcase, HEADLINE_HIGHLIGHT } from "../components/auth/AuthShowcase";
import { AUTH_INPUT, AUTH_LABEL, AuthSplitLayout } from "../components/auth/AuthSplitLayout";
import { PasswordField } from "../components/auth/PasswordField";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { messageFor } from "../lib/errors";

/** Something, then an @, then something: the server has the final say, this only catches typing slips before a round trip. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function checkFields(email: string, password: string): FieldErrors {
  return {
    email: EMAIL_SHAPE.test(email.trim()) ? undefined : "Please enter a valid email address.",
    password: password === "" ? "Password is required." : undefined,
  };
}

/** How a failed sign-in is introduced: wrong credentials and a dropped connection are different kinds of trouble. */
function describeFailure(failure: unknown): { title: string; variant: "error" | "warning" } {
  if (failure instanceof ApiError && failure.status === 0) return { title: "Connection interrupted", variant: "warning" };
  if (failure instanceof ApiError && failure.status === 401) return { title: "Authentication failed", variant: "error" };
  return { title: "Could not sign in", variant: "error" };
}

const showcase = (
  <AuthShowcase
    photograph={photograph}
    tag="Premium Access"
    overline="Live inventory"
    headline={
      <>
        Your Journey <span className={HEADLINE_HIGHLIGHT}>Starts Here.</span>
      </>
    }
    description="Sign in to buy the vehicle you want from the live inventory, with exactly how many are in stock."
    points={[
      { icon: Search, label: "Search the inventory" },
      { icon: Zap, label: "Buy in one click" },
      { icon: ShieldCheck, label: "Secure sign-in" },
    ]}
  />
);

/** The sign-in page, in the Stitch design: the form beside a showcase photograph, which phones and tablets leave out. */
export function LoginPage() {
  useDocumentTitle("Sign in");
  const { login, sessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<{ message: string; title: string; variant: "error" | "warning" }>();
  const [submitting, setSubmitting] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  /** Typing in a field takes back that field's complaint; the other one stands until it is fixed too. */
  function edit(field: keyof FieldErrors, set: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      set(event.target.value);
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const problems = checkFields(email, password);
    setFieldErrors(problems);
    if (problems.email || problems.password) {
      (problems.email ? emailInput : passwordInput).current?.focus();
      return;
    }

    setFailure(undefined);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Success: the route guard now moves the person on, so there is nothing more to do here.
    } catch (error) {
      setFailure({ message: messageFor(error), ...describeFailure(error) });
      setPassword(""); // keep the email, and let them retype the password
      setSubmitting(false);
      passwordInput.current?.focus();
    }
  }

  return (
    <AuthSplitLayout showcase={showcase}>
      <div className="mb-8">
        <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-primary-container/30 bg-surface-container shadow-glow">
          <User className="size-6 text-primary-container" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Welcome Back</h1>
        <p className="mt-2 text-sm text-outline">Sign in to your AutoVault account to browse and buy from our inventory.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {sessionExpired && <Alert variant="notice">Your session has expired. Please sign in again.</Alert>}
        {failure && (
          <Alert variant={failure.variant} title={failure.title}>
            {failure.message}
          </Alert>
        )}

        <TextField
          ref={emailInput}
          label="Email address"
          labelClassName={AUTH_LABEL}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Enter your email"
          required
          leading={<Mail className="size-4" />}
          error={fieldErrors.email}
          className={AUTH_INPUT}
          value={email}
          onChange={edit("email", setEmail)}
        />
        <PasswordField
          ref={passwordInput}
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          error={fieldErrors.password}
          value={password}
          onChange={edit("password", setPassword)}
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {submitting ? (
            "Signing in…"
          ) : (
            <>
              Sign In
              <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="pt-2 text-center text-sm text-outline">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-primary-container transition-colors hover:text-primary hover:underline">
            Create Account
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
