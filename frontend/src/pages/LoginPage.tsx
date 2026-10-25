import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { LoginShowcase } from "../components/login/LoginShowcase";
import { TextField } from "../components/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { messageFor } from "../lib/errors";

/** Something, then an @, then something: the server has the final say, this only catches typing slips before a round trip. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

const labelClass = "text-xs font-semibold tracking-wider text-on-surface-variant uppercase";

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

/** The sign-in page, in the Stitch design: the form beside a showcase photograph, which phones and tablets leave out. */
export function LoginPage() {
  useDocumentTitle("Sign in");
  const { login, sessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="mx-auto flex min-h-dvh w-full max-w-[1440px] bg-background">
      <LoginShowcase />

      <div className="relative z-20 flex min-w-0 flex-1 flex-col justify-between border-white/10 bg-background px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:py-10 lg:w-[45%] lg:flex-none lg:border-l lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="group inline-flex min-h-11 items-center gap-2 rounded text-xs font-semibold tracking-wider text-outline uppercase transition-colors hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            Back to home
          </Link>
          {/* The showcase carries the brand on a desktop; elsewhere it is here. */}
          <Link to="/" className="inline-flex min-h-11 items-center rounded lg:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container">
            <BrandMark />
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-10">
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
              labelClassName={labelClass}
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your email"
              required
              leading={<Mail className="size-4" />}
              error={fieldErrors.email}
              className="h-12 bg-surface-container!"
              value={email}
              onChange={edit("email", setEmail)}
            />
            <TextField
              ref={passwordInput}
              label="Password"
              labelClassName={labelClass}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              leading={<Lock className="size-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="grid size-11 place-items-center rounded-lg text-outline transition-colors hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              }
              error={fieldErrors.password}
              className="h-12 bg-surface-container!"
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
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-outline sm:flex-row">
          <span className="flex items-center gap-2">
            <Lock className="size-3.5 shrink-0 text-primary-container" aria-hidden="true" />
            Your password is never stored in plain text.
          </span>
          <span>&copy; {new Date().getFullYear()} AutoVault. All rights reserved.</span>
        </footer>
      </div>
    </main>
  );
}
