import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

const createAccount = async (email: string, password: string) => {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
  return user;
};

describe("RegisterPage", () => {
  it("shows the form, the password rules up front, and a way back to sign in", () => {
    renderApp("/register");

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByText("8 to 72 characters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("creates the account, signs in, and opens the dashboard", async () => {
    const { authApi } = renderApp("/register");

    await createAccount("jane@example.com", "Sup3rSecret!");

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
  });

  describe("checks the input before bothering the server", () => {
    it("tells the person what is wrong next to each field, and puts the cursor on the first one", async () => {
      const { authApi } = renderApp("/register");

      await createAccount("jane@example", "short");

      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
      expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInvalid();
      expect(screen.getByLabelText("Email")).toHaveFocus();
      expect(authApi.register).not.toHaveBeenCalled();
    });

    it("links each message to its field for screen readers", async () => {
      renderApp("/register");

      await createAccount("jane@example", "Sup3rSecret!");

      const email = screen.getByLabelText("Email");
      const messageId = email.getAttribute("aria-describedby")!.split(" ")[0]!;
      expect(document.getElementById(messageId)).toHaveTextContent("Enter a valid email address.");
    });

    it("removes a field's message as soon as the person edits that field", async () => {
      renderApp("/register");
      const user = await createAccount("jane@example", "Sup3rSecret!");
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Email"), ".com");

      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    });

    it("asks for the missing fields", async () => {
      renderApp("/register");

      await userEvent.setup().click(screen.getByRole("button", { name: "Create account" }));

      expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
      expect(screen.getByText("Enter a password.")).toBeInTheDocument();
    });
  });

  describe("when the server says no", () => {
    it("says an email is taken next to the email field, and offers to sign in instead", async () => {
      const { authApi } = renderApp("/register");
      authApi.register.mockRejectedValue(new ApiError(409, "EMAIL_TAKEN", "A user with this email already exists"));

      await createAccount("jane@example.com", "Sup3rSecret!");

      expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInvalid();
      expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login");
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it("shows a field problem the server found next to that field", async () => {
      const { authApi } = renderApp("/register");
      authApi.register.mockRejectedValue(
        new ApiError(400, "VALIDATION_ERROR", "The request data is invalid", [
          { field: "password", message: "Password must be at most 72 bytes" },
        ]),
      );

      await createAccount("jane@example.com", "Sup3rSecret!");

      expect(await screen.findByText("Password must be at most 72 bytes")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInvalid();
    });

    it("shows anything else as a message above the form", async () => {
      const { authApi } = renderApp("/register");
      authApi.register.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));

      await createAccount("jane@example.com", "Sup3rSecret!");

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
    });
  });

  it("shows that it is working and cannot be submitted twice", async () => {
    const { authApi } = renderApp("/register");
    let finish!: (user: Awaited<ReturnType<typeof authApi.register>>) => void;
    authApi.register.mockImplementation(() => new Promise((resolve) => (finish = resolve)));

    const user = await createAccount("jane@example.com", "Sup3rSecret!");

    const busy = await screen.findByRole("button", { name: "Creating account…" });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(authApi.register).toHaveBeenCalledTimes(1);

    await act(async () => finish({ id: "u", email: "jane@example.com", role: "USER" }));
  });

  it("sends someone who is already signed in to the dashboard instead", () => {
    renderApp("/register", { stored: storedSession() });

    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
  });
});
