import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

/** Fills the form in (the confirmation repeats the password unless told otherwise) and presses Create Account. */
const createAccount = async (email: string, password: string, confirmation = password) => {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email address"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  if (confirmation) await user.type(screen.getByLabelText("Confirm password"), confirmation);
  await user.click(screen.getByRole("button", { name: "Create Account" }));
  return user;
};

describe("RegisterPage", () => {
  it("shows the form, the password rules up front, and a way back to sign in", () => {
    renderApp("/register");

    expect(screen.getByRole("heading", { level: 1, name: "Create Your Account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByText("8 to 72 characters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });

  it("leads back to the landing page, from the top of the form and from the brand", () => {
    renderApp("/register");

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    // Two brand links, one in the showcase and one for phones; the stylesheet shows whichever fits the screen.
    const brand = screen.getAllByRole("link", { name: "AutoVault" });
    expect(brand.length).toBeGreaterThan(0);
    for (const link of brand) expect(link).toHaveAttribute("href", "/");
  });

  it("asks only for what the API takes: there is no name field to collect and throw away", () => {
    renderApp("/register");

    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1); // the email; both passwords are not "textbox"es
    expect(document.querySelectorAll("input")).toHaveLength(3);
  });

  it("sets the form beside a car photograph that is decoration, and says only what the app really does", () => {
    renderApp("/register");

    const photo = document.querySelector("img");
    expect(photo).toHaveAttribute("alt", "");
    expect(photo?.getAttribute("src")).toBeTruthy();
    expect(document.body).toHaveTextContent(/your journey begins here/i);
    // The design's invented claims are not carried over.
    expect(screen.queryByText(/gateway online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/256-bit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/letters & numbers/i)).not.toBeInTheDocument(); // the API has no such rule
  });

  it("creates the account, signs in, and opens the dashboard", async () => {
    const { authApi } = renderApp("/register");

    await createAccount("jane@example.com", "Sup3rSecret!");

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
  });

  it("sends the email and the password and nothing else: the confirmation stays in the page", async () => {
    const { authApi } = renderApp("/register");

    await createAccount("  jane@example.com ", "Sup3rSecret!");

    await screen.findByRole("heading", { name: "Vehicles" });
    expect(authApi.register.mock.calls).toEqual([["jane@example.com", "Sup3rSecret!"]]);
  });

  describe("checks the input before bothering the server", () => {
    it("tells the person what is wrong next to each field, and puts the cursor on the first one", async () => {
      const { authApi } = renderApp("/register");

      await createAccount("jane@example", "short");

      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
      expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
      expect(screen.getByLabelText("Email address")).toBeInvalid();
      expect(screen.getByLabelText("Email address")).toHaveFocus();
      expect(authApi.register).not.toHaveBeenCalled();
    });

    it("links each message to its field for screen readers", async () => {
      renderApp("/register");

      await createAccount("jane@example", "Sup3rSecret!");

      const email = screen.getByLabelText("Email address");
      const messageId = email.getAttribute("aria-describedby")!.split(" ")[0]!;
      expect(document.getElementById(messageId)).toHaveTextContent("Enter a valid email address.");
    });

    it("removes a field's message as soon as the person edits that field", async () => {
      renderApp("/register");
      const user = await createAccount("jane@example", "Sup3rSecret!");
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Email address"), ".com");

      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    });

    it("asks for the missing fields, the confirmation included", async () => {
      const { authApi } = renderApp("/register");

      await userEvent.setup().click(screen.getByRole("button", { name: "Create Account" }));

      expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
      expect(screen.getByText("Enter a password.")).toBeInTheDocument();
      expect(screen.getByText("Please confirm your password.")).toBeInTheDocument();
      expect(authApi.register).not.toHaveBeenCalled();
    });
  });

  describe("the password confirmation", () => {
    it("must match the password: the difference is said beside the confirmation, with the cursor there, and nothing is sent", async () => {
      const { authApi } = renderApp("/register");

      await createAccount("jane@example.com", "Sup3rSecret!", "Sup3rSecret?");

      const confirmation = screen.getByLabelText("Confirm password");
      expect(confirmation).toHaveAccessibleDescription("Passwords do not match.");
      expect(confirmation).toHaveAttribute("aria-invalid", "true");
      expect(confirmation).toHaveFocus();
      expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
      expect(authApi.register).not.toHaveBeenCalled();
    });

    it("is not blamed for a password that is too short, if it repeats it", async () => {
      renderApp("/register");

      await createAccount("jane@example.com", "short");

      expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
      expect(screen.queryByText("Passwords do not match.")).not.toBeInTheDocument();
    });

    it("does not tell a person their passwords differ while the first has yet to be chosen", async () => {
      renderApp("/register");

      await createAccount("jane@example.com", "", "Sup3rSecret!");

      expect(screen.getByText("Enter a password.")).toBeInTheDocument();
      expect(screen.queryByText("Passwords do not match.")).not.toBeInTheDocument();
    });

    it("loses its complaint when either password is edited, since the comparison has changed", async () => {
      renderApp("/register");
      const user = await createAccount("jane@example.com", "Sup3rSecret!", "Sup3rSecret?");
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Password"), "x");

      expect(screen.queryByText("Passwords do not match.")).not.toBeInTheDocument();
    });

    it("lets a corrected pair through", async () => {
      const { authApi } = renderApp("/register");
      const user = await createAccount("jane@example.com", "Sup3rSecret!", "Sup3rSecret?");

      await user.clear(screen.getByLabelText("Confirm password"));
      await user.type(screen.getByLabelText("Confirm password"), "Sup3rSecret!");
      await user.click(screen.getByRole("button", { name: "Create Account" }));

      await screen.findByRole("heading", { name: "Vehicles" });
      expect(authApi.register).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    });
  });

  describe("the password fields' show and hide buttons", () => {
    it("work separately, each saying which field it belongs to", async () => {
      renderApp("/register");
      const user = userEvent.setup();
      const password = screen.getByLabelText("Password");
      const confirmation = screen.getByLabelText("Confirm password");

      await user.click(screen.getByRole("button", { name: "Show password" }));
      expect(password).toHaveAttribute("type", "text");
      expect(confirmation).toHaveAttribute("type", "password");

      await user.click(screen.getByRole("button", { name: "Show confirm password" }));
      expect(confirmation).toHaveAttribute("type", "text");

      await user.click(screen.getByRole("button", { name: "Hide password" }));
      expect(password).toHaveAttribute("type", "password");
      expect(confirmation).toHaveAttribute("type", "text");
    });

    it("do not submit the form", async () => {
      const { authApi } = renderApp("/register");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email address"), "jane@example.com");
      await user.type(screen.getByLabelText("Password"), "Sup3rSecret!");
      await user.type(screen.getByLabelText("Confirm password"), "Sup3rSecret!");

      await user.click(screen.getByRole("button", { name: "Show password" }));
      await user.click(screen.getByRole("button", { name: "Show confirm password" }));

      expect(authApi.register).not.toHaveBeenCalled();
    });
  });

  describe("when the server says no", () => {
    it("says an email is taken next to the email field, and offers to sign in instead", async () => {
      const { authApi } = renderApp("/register");
      authApi.register.mockRejectedValue(new ApiError(409, "EMAIL_TAKEN", "A user with this email already exists"));

      await createAccount("jane@example.com", "Sup3rSecret!");

      expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
      expect(screen.getByLabelText("Email address")).toBeInvalid();
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

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Connection interrupted");
      expect(alert).toHaveTextContent("Could not reach the server");
    });

    it("never shows a raw error", async () => {
      const { authApi } = renderApp("/register");
      authApi.register.mockRejectedValue(new TypeError("Cannot read properties of undefined"));

      await createAccount("jane@example.com", "Sup3rSecret!");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Something went wrong. Please try again.");
      expect(alert).not.toHaveTextContent("Cannot read");
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
    // The button is disabled, so a click cannot do this; a script or an assistive tool submitting the form can.
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
    expect(authApi.register).toHaveBeenCalledTimes(1);

    await act(async () => finish({ id: "u", email: "jane@example.com", role: "USER" }));
  });

  it("sends someone who is already signed in to the dashboard instead", () => {
    renderApp("/register", { stored: storedSession() });

    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
  });
});
