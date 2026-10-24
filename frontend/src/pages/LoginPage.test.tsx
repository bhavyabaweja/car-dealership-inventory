import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

const signInAs = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  return user;
};

describe("LoginPage", () => {
  it("shows the sign-in form with a way to create an account", () => {
    renderApp("/login");

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  it("helps browsers and password managers fill the form in", () => {
    renderApp("/login");

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("signs in with the typed credentials and opens the dashboard", async () => {
    const { authApi } = renderApp("/login");

    await signInAs("jane@example.com", "Sup3rSecret!");

    expect(await screen.findByRole("heading", { name: "Available inventory" })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("takes the person to the page they were trying to reach before being sent to log in", async () => {
    renderApp("/login", { state: { from: "/?make=toyota" } });

    await signInAs("jane@example.com", "Sup3rSecret!");

    await screen.findByRole("heading", { name: "Available inventory" });
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toyota");
  });

  it("does not call the server when the form is empty", async () => {
    const { authApi } = renderApp("/login");

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign in" }));

    expect(authApi.login).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toBeInvalid();
  });

  describe("when sign-in fails", () => {
    it("shows the server's message, keeps the email, and clears the password for another try", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"));

      await signInAs("jane@example.com", "wrong-password");

      expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
      expect(screen.getByLabelText("Email")).toHaveValue("jane@example.com");
      expect(screen.getByLabelText("Password")).toHaveValue("");
      expect(screen.getByLabelText("Password")).toHaveFocus();
      expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    });

    it("explains an unreachable server in plain words", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));

      await signInAs("jane@example.com", "Sup3rSecret!");

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
    });

    it("never shows a raw error, whatever went wrong", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new TypeError("Cannot read properties of undefined"));

      await signInAs("jane@example.com", "Sup3rSecret!");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Something went wrong. Please try again.");
      expect(alert).not.toHaveTextContent("Cannot read");
    });

    it("clears the message when the person tries again", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValueOnce(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
      const user = await signInAs("jane@example.com", "wrong-password");
      await screen.findByRole("alert");

      await user.type(screen.getByLabelText("Password"), "Sup3rSecret!");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      await screen.findByRole("heading", { name: "Available inventory" });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows that it is working and cannot be submitted twice while the server answers", async () => {
    const { authApi } = renderApp("/login");
    let finish!: (value: Awaited<ReturnType<typeof authApi.login>>) => void;
    authApi.login.mockImplementation(() => new Promise((resolve) => (finish = resolve)));

    const user = await signInAs("jane@example.com", "Sup3rSecret!");

    const busy = await screen.findByRole("button", { name: "Signing in…" });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(authApi.login).toHaveBeenCalledTimes(1);

    await act(async () => finish({ token: storedToken(), user: { id: "u", email: "jane@example.com", role: "USER" } }));
  });

  it("explains why the person is back at the login page after their session expired", async () => {
    const { auth } = renderApp("/", { stored: storedSession() });
    await screen.findByRole("heading", { name: "Available inventory" });

    act(() => auth.current!.expireSession());

    expect(await screen.findByRole("status")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("does not claim the session expired when the person simply arrives", () => {
    renderApp("/login");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

function storedToken(): string {
  return JSON.parse(storedSession()).token;
}
