import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// The Stitch design is the page a visitor sees BEFORE logging in. The API lets anyone browse the vehicles, so the page
// shows the real inventory, and asks for an account only at the point of buying.

const user = () => userEvent.setup({ delay: null });
const landing = (url = "/", vehiclesApi = fakeVehiclesApi()) => renderApp(url, { vehiclesApi });
const inventory = () => within(screen.getByRole("region", { name: "Available inventory" }));
const cardOf = async (name: string) => within(await screen.findByRole("article", { name }));

const logIn = async () => {
  await user().type(screen.getByLabelText("Email address"), "jane@example.com");
  await user().type(screen.getByLabelText("Password"), "Sup3rSecret!");
  await user().click(screen.getByRole("button", { name: "Sign In" }));
};

describe("the page a visitor sees before logging in", () => {
  it("is the home page when nobody is signed in", () => {
    landing();

    expect(screen.getByRole("heading", { level: 1, name: /find your perfect drive/i })).toBeInTheDocument();
  });

  it("is not what a signed-in user gets: they see the dashboard", async () => {
    renderApp("/", { stored: storedSession("USER") });

    expect(await screen.findAllByRole("article")).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
  });

  it("has the design's sections: hero, search, inventory, features, closing banner and footer", () => {
    landing();

    expect(screen.getByRole("search", { name: "Search and filters" })).toBeInTheDocument();
    expect(inventory().getByRole("heading", { name: "Available inventory" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why explore AutoVault?" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your next drive awaits." })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
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
    await logIn();

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy");
  });
});

describe("the inventory a visitor can see", () => {
  it("is the real one: each vehicle with its category, price and stock, read without signing in", async () => {
    const { vehiclesApi } = landing();

    const camry = await cardOf("Toyota Camry");
    expect(camry.getByText("Sedan")).toBeInTheDocument();
    expect(camry.getByText("$25,000.00")).toBeInTheDocument();
    expect(camry.getByText("5 in stock")).toBeInTheDocument();
    expect((await cardOf("Toyota RAV4")).getByText("Only 2 left")).toBeInTheDocument();
    expect((await cardOf("Honda Civic")).getByText("Sold out")).toBeInTheDocument();
    expect(vehiclesApi.find).toHaveBeenCalledWith({}, expect.anything());
  });

  it("keeps the order the server gave and counts the vehicles", async () => {
    landing();

    const names = (await screen.findAllByRole("article")).map((card) => within(card).getByRole("heading").textContent);

    expect(names).toEqual(["Toyota Camry", "Toyota RAV4", "Honda Civic"]);
    expect(await inventory().findByText("3 vehicles")).toBeInTheDocument();
  });

  it("says it is loading, then shows the vehicles", async () => {
    let finish!: (vehicles: ReturnType<typeof sampleVehicles>) => void;
    const api = fakeVehiclesApi();
    api.find.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    landing("/", api);

    expect(inventory().getByRole("status")).toHaveTextContent("Loading vehicles…");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    finish(sampleVehicles());

    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("explains in plain words when loading fails, and tries again on request", async () => {
    const api = fakeVehiclesApi();
    api.find.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));
    landing("/", api);

    expect(await inventory().findByRole("alert")).toHaveTextContent("Could not reach the server");
    await user().click(inventory().getByRole("button", { name: "Try again" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("says when there is nothing in stock to show yet", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([]);
    landing("/", api);

    expect(await inventory().findByText("No vehicles available yet.")).toBeInTheDocument();
  });

  it("has no Purchase buttons: buying is for signed-in users", async () => {
    landing();
    await screen.findAllByRole("article");

    expect(screen.queryByRole("button", { name: /^Purchase/ })).not.toBeInTheDocument();
  });
});

describe("buying, which needs an account", () => {
  it("offers Log in to buy on a vehicle that is in stock, and nothing on a sold-out one", async () => {
    landing();

    const camry = await cardOf("Toyota Camry");
    expect(camry.getByRole("link", { name: "Log in to purchase Toyota Camry" })).toHaveAttribute("href", "/login");
    const civic = await cardOf("Honda Civic");
    expect(civic.queryByRole("link")).not.toBeInTheDocument();
    expect(civic.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sends the person to log in and, once they are in, back to the inventory", async () => {
    landing();

    await user().click((await cardOf("Toyota RAV4")).getByRole("link", { name: "Log in to purchase Toyota RAV4" }));
    await logIn();

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("says so beside the inventory, and offers to log in or create an account", () => {
    landing();

    expect(inventory().getByText(/browsing is open to everyone/i)).toBeInTheDocument();
    expect(inventory().getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(inventory().getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  it("remembers the search, whichever way the person goes to log in", async () => {
    landing();
    await user().type(screen.getByLabelText("Make"), "toy");

    await user().click(inventory().getByRole("link", { name: "Log in" }));
    await logIn();

    expect(await screen.findByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy");
  });

  it("remembers the search when the way in is a vehicle's own Log in to buy", async () => {
    landing();
    await user().type(screen.getByLabelText("Make"), "toy");

    await user().click((await cardOf("Toyota Camry")).getByRole("link", { name: "Log in to purchase Toyota Camry" }));
    await logIn();

    await screen.findByRole("heading", { name: "Vehicles" });
    expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy");
  });
});

describe("the hero and the closing banner", () => {
  it("offers Explore inventory, and no Browse categories, which there are none to browse", () => {
    landing();

    expect(screen.getByRole("link", { name: "Explore inventory" })).toHaveAttribute("href", "#inventory");
    expect(screen.queryByRole("link", { name: "Browse categories" })).not.toBeInTheDocument();
  });

  it("closes by offering to create an account, since that is what lets a visitor buy", () => {
    landing();
    const banner = within(screen.getByRole("region", { name: "Your next drive awaits." }));

    expect(banner.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(banner.getByText(/to buy/i)).toBeInTheDocument();
    expect(banner.queryByText(/to see the live inventory/i)).not.toBeInTheDocument(); // anyone can see it
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
  it("runs the search as the person types, once they pause, and shows what it finds", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters: unknown) => ((filters as { make?: string }).make === "toy" ? sampleVehicles().slice(0, 2) : sampleVehicles()));
    landing("/", api);
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "toy");

    await waitFor(() => expect(api.find).toHaveBeenCalledWith({ make: "toy" }, expect.anything()));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
  });

  it("does not run it before the pause, one request per keystroke", async () => {
    const api = fakeVehiclesApi();
    landing("/", api);
    await screen.findAllByRole("article");
    api.find.mockClear();

    await user().type(screen.getByLabelText("Make"), "toyota");

    await waitFor(() => expect(api.find).toHaveBeenCalledWith({ make: "toyota" }, expect.anything()));
    expect(api.find).toHaveBeenCalledTimes(1);
  });

  it("starts from the search in the address, as a link or a return from logging in brings it", async () => {
    const api = fakeVehiclesApi();
    landing("/?make=toy&maxPrice=30000", api);

    expect(screen.getByLabelText("Make")).toHaveValue("toy");
    await waitFor(() => expect(api.find).toHaveBeenCalledWith({ make: "toy", maxPrice: "30000" }, expect.anything()));
  });

  it("answers Enter by taking the person to the results, without opening a dialog or reloading", async () => {
    landing();
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "toy{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(inventory().getByRole("heading", { name: "Available inventory" })).toHaveFocus();
  });

  it("points a price that is not an amount out beside its field, and does not search with it", async () => {
    const api = fakeVehiclesApi();
    landing("/", api);
    await screen.findAllByRole("article");
    api.find.mockClear();

    await user().type(screen.getByLabelText("Min price (USD)"), "abc{Enter}");

    expect(screen.getByLabelText("Min price (USD)")).toBeInvalid();
    expect(api.find).not.toHaveBeenCalled();
  });

  it("says when nothing matches, and can show everything again", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters: unknown) => ((filters as { make?: string }).make ? [] : [vehicle()]));
    landing("/", api);
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "zzz");
    expect(await inventory().findByText("No vehicles match your search.")).toBeInTheDocument();

    await user().click(inventory().getByRole("button", { name: "Show all vehicles" }));

    expect(await screen.findAllByRole("article")).toHaveLength(1);
    expect(screen.getByLabelText("Make")).toHaveValue("");
  });

  it("can be started over with Clear filters, as on the inventory", async () => {
    landing();
    await user().type(screen.getByLabelText("Make"), "toy");

    await user().click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Make")).toHaveValue("");
  });
});
