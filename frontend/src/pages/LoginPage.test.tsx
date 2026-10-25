import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

const signInAs = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email address"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  return user;
};

describe("LoginPage", () => {
  it("shows the sign-in form with a way to create an account", () => {
    renderApp("/login");

    expect(screen.getByRole("heading", { level: 1, name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Create Account" })).toHaveAttribute("href", "/register");
  });

  it("leads back to the landing page, from the top of the form and from the brand", () => {
    renderApp("/login");

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    // Two brand links, one in the showcase and one for phones; the stylesheet shows whichever fits the screen.
    const brand = screen.getAllByRole("link", { name: "AutoVault" });
    expect(brand.length).toBeGreaterThan(0);
    for (const link of brand) expect(link).toHaveAttribute("href", "/");
  });

  it("sets the form beside a car photograph that is decoration, and says only what the app really does", () => {
    renderApp("/login");

    const photo = document.querySelector("img");
    expect(photo).toHaveAttribute("alt", ""); // nothing a screen reader needs
    expect(photo?.getAttribute("src")).toBeTruthy();
    expect(document.body).toHaveTextContent(/your journey starts here/i);
    // The design's invented claims are not carried over: there is no status gateway and no 256-bit handshake.
    expect(screen.queryByText(/gateway online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/256-bit/i)).not.toBeInTheDocument();
  });

  it("helps browsers and password managers fill the form in", () => {
    renderApp("/login");

    expect(screen.getByLabelText("Email address")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("signs in with the typed credentials and opens the dashboard", async () => {
    const { authApi } = renderApp("/login");

    await signInAs("jane@example.com", "Sup3rSecret!");

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("takes the person to the page they were trying to reach before being sent to log in", async () => {
    renderApp("/login", { state: { from: "/?make=toyota" } });

    await signInAs("jane@example.com", "Sup3rSecret!");

    await screen.findByRole("heading", { name: "Vehicles" });
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toyota");
  });

  describe("checking the form before it is sent", () => {
    it("does not call the server when the form is empty, and says what is missing beside each field", async () => {
      const { authApi } = renderApp("/login");

      await userEvent.setup().click(screen.getByRole("button", { name: "Sign In" }));

      expect(authApi.login).not.toHaveBeenCalled();
      const email = screen.getByLabelText("Email address");
      const password = screen.getByLabelText("Password");
      // aria-invalid, not the browser's own validity: with these fields empty that would hold without any message.
      expect(email).toHaveAttribute("aria-invalid", "true");
      expect(password).toHaveAttribute("aria-invalid", "true");
      expect(email).toHaveAccessibleDescription("Please enter a valid email address.");
      expect(password).toHaveAccessibleDescription("Password is required.");
    });

    it("moves the cursor to the first field that needs attention", async () => {
      renderApp("/login");

      await userEvent.setup().click(screen.getByRole("button", { name: "Sign In" }));
      expect(screen.getByLabelText("Email address")).toHaveFocus();

      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email address"), "jane@example.com");
      await user.click(screen.getByRole("button", { name: "Sign In" }));
      expect(screen.getByLabelText("Password")).toHaveFocus();
    });

    it.each([["jane"], ["jane@"], ["@example.com"], ["jane @example.com"]])("does not send %s as an email address", async (typed) => {
      const { authApi } = renderApp("/login");

      await signInAs(typed, "Sup3rSecret!");

      expect(authApi.login).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription("Please enter a valid email address.");
      expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
    });

    it("lets go of a field's message as soon as the person starts correcting that field", async () => {
      renderApp("/login");
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await user.type(screen.getByLabelText("Email address"), "j");

      expect(screen.getByLabelText("Email address")).not.toHaveAttribute("aria-invalid");
      expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true"); // untouched, so still flagged
    });

    it("sends a form that passes, with surrounding spaces taken off the email", async () => {
      const { authApi } = renderApp("/login");

      await signInAs("  jane@example.com ", "Sup3rSecret!");

      expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    });
  });

  describe("the password field", () => {
    it("keeps the password hidden, and shows or hides it with a button that says which", async () => {
      renderApp("/login");
      const user = userEvent.setup();
      const password = screen.getByLabelText("Password");
      await user.type(password, "Sup3rSecret!");

      await user.click(screen.getByRole("button", { name: "Show password" }));
      expect(password).toHaveAttribute("type", "text");
      expect(password).toHaveValue("Sup3rSecret!");

      await user.click(screen.getByRole("button", { name: "Hide password" }));
      expect(password).toHaveAttribute("type", "password");
      expect(password).toHaveValue("Sup3rSecret!");
    });

    it("has a toggle that does not submit the form and can be reached from the keyboard", async () => {
      const { authApi } = renderApp("/login");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email address"), "jane@example.com");
      await user.type(screen.getByLabelText("Password"), "Sup3rSecret!");

      await user.tab(); // from the password field to its toggle
      expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  describe("when sign-in fails", () => {
    it("shows the server's message, keeps the email, and clears the password for another try", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"));

      await signInAs("jane@example.com", "wrong-password");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Authentication failed");
      expect(alert).toHaveTextContent("Invalid email or password");
      expect(screen.getByLabelText("Email address")).toHaveValue("jane@example.com");
      expect(screen.getByLabelText("Password")).toHaveValue("");
      expect(screen.getByLabelText("Password")).toHaveFocus();
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    });

    it("explains an unreachable server in plain words", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));

      await signInAs("jane@example.com", "Sup3rSecret!");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Connection interrupted");
      expect(alert).toHaveTextContent("Could not reach the server");
    });

    it("never shows a raw error, whatever went wrong", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValue(new TypeError("Cannot read properties of undefined"));

      await signInAs("jane@example.com", "Sup3rSecret!");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Something went wrong. Please try again.");
      expect(alert).not.toHaveTextContent("Cannot read");
      expect(alert).not.toHaveTextContent("Authentication failed"); // the credentials were not the problem
    });

    it("clears the message when the person tries again", async () => {
      const { authApi } = renderApp("/login");
      authApi.login.mockRejectedValueOnce(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
      const user = await signInAs("jane@example.com", "wrong-password");
      await screen.findByRole("alert");

      await user.type(screen.getByLabelText("Password"), "Sup3rSecret!");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await screen.findByRole("heading", { name: "Vehicles" });
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

  it("does not send a second request if the form is submitted again while the first is still going", async () => {
    const { authApi } = renderApp("/login");
    let finish!: (value: Awaited<ReturnType<typeof authApi.login>>) => void;
    authApi.login.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    await signInAs("jane@example.com", "Sup3rSecret!");
    await screen.findByRole("button", { name: "Signing in…" });

    // The button is disabled, so a click cannot do this; a script or an assistive tool submitting the form can.
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);

    expect(authApi.login).toHaveBeenCalledTimes(1);
    await act(async () => finish({ token: storedToken(), user: { id: "u", email: "jane@example.com", role: "USER" } }));
  });

  it("explains why the person is back at the login page after their session expired", async () => {
    const { auth } = renderApp("/", { stored: storedSession() });
    await screen.findByRole("heading", { name: "Vehicles" });

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
