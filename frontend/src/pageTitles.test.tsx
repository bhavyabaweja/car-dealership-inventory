import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { storedSession } from "./test/helpers";
import { renderApp } from "./test/renderApp";

// The tab title is the first thing a screen reader announces on a new page; a single-page app must change it itself.
describe("page titles", () => {
  it("names the sign-in page", () => {
    renderApp("/login");

    expect(document.title).toBe("Sign in | AutoVault");
  });

  it("names the registration page", () => {
    renderApp("/register");

    expect(document.title).toBe("Create an account | AutoVault");
  });

  it("names the dashboard", async () => {
    renderApp("/", { stored: storedSession("USER") });
    await screen.findAllByRole("article");

    expect(document.title).toBe("Vehicles | AutoVault");
  });

  it("follows the person from page to page", async () => {
    renderApp("/login");

    await userEvent.setup().click(screen.getByRole("link", { name: "Create an account" }));

    expect(await screen.findByRole("heading", { name: /create/i })).toBeInTheDocument();
    expect(document.title).toBe("Create an account | AutoVault");
  });
});
