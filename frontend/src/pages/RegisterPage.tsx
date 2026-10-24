import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { messageFor } from "../lib/errors";
import { validateEmail, validatePassword } from "../lib/validation";

type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

export function RegisterPage() {
  useDocumentTitle("Create an account");
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const inputs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  /** Shows the problems and puts the cursor on the first field that has one. */
  function showErrors(next: FieldErrors) {
    setErrors(next);
    inputs[next.email ? "email" : "password"].current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found = { email: validateEmail(email), password: validatePassword(password) };
    if (found.email || found.password) {
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
        else setFormError(failure.message);
      } else {
        setFormError(messageFor(failure));
      }
    }
  }

  /** Editing a field clears whatever was said about it, so a stale message never lingers. */
  function edit(field: Field, value: string) {
    (field === "email" ? setEmail : setPassword)(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "email") setEmailTaken(false);
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a few seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}

        <TextField
          ref={inputs.email}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
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
        <TextField
          ref={inputs.password}
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="8 to 72 characters."
          value={password}
          onChange={(event) => edit("password", event.target.value)}
          error={errors.password}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
