import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { messageFor } from "../lib/errors";

export function LoginPage() {
  useDocumentTitle("Sign in");
  const { login, sessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const passwordInput = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || email.trim() === "" || password === "") return;

    setError(undefined);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Success: the route guard now moves the person on, so there is nothing more to do here.
    } catch (failure) {
      setError(messageFor(failure));
      setPassword(""); // keep the email, and let them retype the password
      setSubmitting(false);
      passwordInput.current?.focus();
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to browse and buy from our inventory."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {sessionExpired && <Alert variant="notice">Your session has expired. Please sign in again.</Alert>}
        {error && <Alert>{error}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          ref={passwordInput}
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
