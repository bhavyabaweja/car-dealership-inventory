import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// The Stitch design is the page a visitor sees BEFORE logging in. The API lets only signed-in users list vehicles
// (and that is not changed), so this page sells the inventory, and asks for an account to open it.

const user = () => userEvent.setup({ delay: null });
const landing = (url = "/") => renderApp(url);
const dialog = () => within(screen.getByRole("dialog", { name: "Account required" }));

describe("the page a visitor sees before logging in", () => {
  it("is the home page when nobody is signed in, and asks the inventory for nothing", () => {
    const { vehiclesApi } = landing();

    expect(screen.getByRole("heading", { level: 1, name: /find your perfect drive/i })).toBeInTheDocument();
    expect(vehiclesApi.find).not.toHaveBeenCalled();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("is not what a signed-in user gets: they see the inventory", async () => {
    renderApp("/", { stored: storedSession("USER") });

    expect(await screen.findAllByRole("article")).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("has the design's sections: hero, search, features, closing banner and footer", () => {
    landing();

    expect(screen.getByRole("search", { name: "Search and filters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why explore AutoVault?" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your next drive awaits." })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("has no category cards, no vehicles and no way to buy: it knows no inventory", () => {
    landing();

    expect(screen.queryByRole("region", { name: "Browse by category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Purchase/ })).not.toBeInTheDocument();
  });
});

describe("its header", () => {
  it("offers Log in and Sign up instead of a user and Sign out", () => {
    landing();
    const header = within(screen.getByRole("banner"));

    expect(header.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(header.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
    expect(header.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("links only to what is on the page: Home, Browse inventory and About", () => {
    landing();

    const links = within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["Home", "Browse inventory", "About"]);
    for (const link of links) expect(document.getElementById(link.getAttribute("href")!.slice(1))).not.toBeNull();
  });

  it("takes the person to the login page and, once they are in, back to where they were", async () => {
    const { authApi } = landing("/?make=toy");

    await user().click(within(screen.getByRole("banner")).getByRole("link", { name: "Log in" }));
    await user().type(screen.getByLabelText("Email address"), "jane@example.com");
    await user().type(screen.getByLabelText("Password"), "Sup3rSecret!");
    await user().click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy");
  });
});

describe("the inventory section", () => {
  it("says the inventory is for signed-in visitors, and offers to log in or create an account", () => {
    landing();
    const section = within(screen.getByRole("region", { name: "Available inventory" }));

    expect(section.getByText("Sign in to see the live inventory")).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(section.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });
});

describe("the inventory section's own Log in", () => {
  it("also keeps what has been typed in the search: no Enter needed", async () => {
    landing();
    await user().type(screen.getByLabelText("Make"), "toy");

    await user().click(within(screen.getByRole("region", { name: "Available inventory" })).getByRole("link", { name: "Log in" }));
    await user().type(screen.getByLabelText("Email address"), "jane@example.com");
    await user().type(screen.getByLabelText("Password"), "Sup3rSecret!");
    await user().click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy");
  });
});

describe("the hero and the closing banner", () => {
  it("offers Explore inventory, and no Browse categories, which there are none to browse", () => {
    landing();

    expect(screen.getByRole("link", { name: "Explore inventory" })).toHaveAttribute("href", "#inventory");
    expect(screen.queryByRole("link", { name: "Browse categories" })).not.toBeInTheDocument();
  });

  it("closes by offering to create an account, since that is what unlocks the inventory", () => {
    landing();
    const banner = within(screen.getByRole("region", { name: "Your next drive awaits." }));

    expect(banner.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(banner.queryByRole("link", { name: "Browse all vehicles" })).not.toBeInTheDocument();
  });
});

describe("the footer", () => {
  it("points to Log in and Create an account, and does not claim anyone is signed in", () => {
    landing();
    const footer = within(screen.getByRole("contentinfo"));

    expect(footer.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(footer.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(footer.queryByText(/signed in as/i)).not.toBeInTheDocument();
  });
});

describe("searching before logging in", () => {
  it("lets the person fill in the console, and asks for an account when they search", async () => {
    landing();

    await user().type(screen.getByLabelText("Make"), "toy{Enter}");

    expect(screen.getByRole("dialog", { name: "Account required" })).toBeInTheDocument();
    expect(dialog().getByText(/your search is kept and runs as soon as you sign in/i)).toBeInTheDocument();
    expect(dialog().getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(dialog().getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  it("also asks when the Search vehicles button is pressed with nothing typed", async () => {
    landing();

    await user().click(screen.getByRole("button", { name: "Search vehicles" }));

    expect(screen.getByRole("dialog", { name: "Account required" })).toBeInTheDocument();
  });

  it("starts on Log in, and Keep browsing closes it and returns the cursor to where it was", async () => {
    landing();
    const make = screen.getByLabelText("Make");
    await user().type(make, "toy{Enter}");
    expect(dialog().getByRole("link", { name: "Log in" })).toHaveFocus();

    await user().click(dialog().getByRole("button", { name: "Keep browsing" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(make).toHaveFocus();
    expect(make).toHaveValue("toy"); // what was typed is still there
  });

  it("keeps the search through the login: once signed in, the inventory opens already searched", async () => {
    const { authApi, vehiclesApi } = landing();
    await user().type(screen.getByLabelText("Make"), "toy");
    await user().type(screen.getByLabelText("Max price (USD)"), "30000{Enter}");

    await user().click(dialog().getByRole("link", { name: "Log in" }));
    await user().type(screen.getByLabelText("Email address"), "jane@example.com");
    await user().type(screen.getByLabelText("Password"), "Sup3rSecret!");
    await user().click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy&maxPrice=30000");
    expect(screen.getByLabelText("Make")).toHaveValue("toy");
    // The dashboard searches after its short typing pause, which can land just after the heading appears.
    await waitFor(() => expect(vehiclesApi.find).toHaveBeenCalledWith({ make: "toy", maxPrice: "30000" }, expect.anything()));
  });

  it("points a price that is not an amount out beside its field, and does not ask for an account yet", async () => {
    landing();

    await user().type(screen.getByLabelText("Min price (USD)"), "abc{Enter}");

    expect(screen.getByLabelText("Min price (USD)")).toBeInvalid();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("can be started over with Clear filters, as on the inventory", async () => {
    landing();
    await user().type(screen.getByLabelText("Make"), "toy");

    await user().click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Make")).toHaveValue("");
  });
});
