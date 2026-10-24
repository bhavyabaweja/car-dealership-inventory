import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

type Role = "USER" | "ADMIN";

function openDashboard(role: Role = "ADMIN", api = fakeVehiclesApi()) {
  return { api, ...renderApp("/", { stored: storedSession(role), vehiclesApi: api }) };
}

const user = () => userEvent.setup({ delay: null });
const cardOf = async (name: string) => within(await screen.findByRole("article", { name }));
const dialog = () => within(screen.getByRole("dialog"));
/** What a browser does when Escape is pressed in a modal dialog. */
const pressEscape = () => fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
const network = () => new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");

async function fill(fields: Record<string, string>) {
  for (const [label, text] of Object.entries(fields)) {
    const input = dialog().getByLabelText(label);
    await user().clear(input);
    if (text) await user().type(input, text);
  }
}

const goodVehicle = { Make: "Toyota", Model: "Camry", Category: "Sedan", "Price (USD)": "25000", "Quantity in stock": "5" };

describe("who can manage the inventory", () => {
  it("shows a regular customer a Purchase button on every vehicle, and none of the management controls", async () => {
    openDashboard("USER");
    await screen.findAllByRole("article");

    expect(screen.getAllByRole("button", { name: /^Purchase / })).toHaveLength(3);
    expect((await cardOf("Toyota Camry")).getByRole("button", { name: "Purchase Toyota Camry" })).toBeEnabled();

    expect(screen.queryByRole("button", { name: "Add vehicle" })).not.toBeInTheDocument();
    for (const verb of ["Edit", "Restock", "Delete"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${verb} `) })).not.toBeInTheDocument();
    }
  });

  it("keeps an administrator's dashboard about the inventory: no Purchase button anywhere, however much is in stock", async () => {
    openDashboard("ADMIN");
    await screen.findAllByRole("article");

    expect(screen.getAllByRole("article")).toHaveLength(3); // a sold-out vehicle is among them
    expect(screen.queryByRole("button", { name: /^Purchase / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Buying/ })).not.toBeInTheDocument();
  });

  it("gives an administrator an Add button and Edit, Restock and Delete on every vehicle, named for the vehicle", async () => {
    openDashboard("ADMIN");

    expect(await screen.findByRole("button", { name: "Add vehicle" })).toBeInTheDocument();
    const camry = await cardOf("Toyota Camry");
    for (const name of ["Edit Toyota Camry", "Restock Toyota Camry", "Delete Toyota Camry"]) {
      expect(camry.getByRole("button", { name })).toBeEnabled();
    }
    expect((await cardOf("Honda Civic")).getByRole("button", { name: "Restock Honda Civic" })).toBeEnabled(); // sold out, but restockable
  });
});

describe("adding a vehicle", () => {
  const openAddDialog = async () => {
    await user().click(await screen.findByRole("button", { name: "Add vehicle" }));
  };

  it("opens a dialog with a field for everything a vehicle has, the price naming the currency", async () => {
    openDashboard();
    await openAddDialog();

    expect(screen.getByRole("dialog", { name: "Add a vehicle" })).toBeInTheDocument();
    for (const label of ["Make", "Model", "Category", "Price (USD)", "Quantity in stock"]) {
      expect(dialog().getByLabelText(label)).toBeInTheDocument();
    }
    expect(dialog().getByLabelText("Price (USD)")).toHaveAttribute("inputmode", "decimal");
    expect(dialog().getByLabelText("Quantity in stock")).toHaveAttribute("inputmode", "numeric");
  });

  it("saves the vehicle, closes, confirms, and shows it in the list", async () => {
    const api = fakeVehiclesApi();
    const added = vehicle({ id: "v-new", make: "Tesla", model: "Model 3", category: "Electric", price: "39990.00", quantity: 12 });
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce([...sampleVehicles(), added]);
    api.create.mockResolvedValue(added);
    openDashboard("ADMIN", api);
    await openAddDialog();

    await fill({ Make: "  Tesla ", Model: "Model 3", Category: "Electric", "Price (USD)": "39990", "Quantity in stock": "12" });
    await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.create).toHaveBeenCalledWith({ make: "Tesla", model: "Model 3", category: "Electric", price: "39990", quantity: 12 });
    expect(await screen.findByText("Added Tesla Model 3.")).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Tesla Model 3" })).toBeInTheDocument();
  });

  describe("checks the form first", () => {
    it("names every problem beside its field, puts the cursor on the first, and sends nothing", async () => {
      const { api } = openDashboard();
      await openAddDialog();

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      for (const message of ["Enter the make.", "Enter the model.", "Enter the category.", "Enter a price.", "Enter a whole number from 0 to 100000."]) {
        expect(dialog().getByText(message)).toBeInTheDocument();
      }
      expect(dialog().getByLabelText("Make")).toHaveFocus();
      expect(dialog().getByLabelText("Make")).toBeInvalid();
      expect(api.create).not.toHaveBeenCalled();
    });

    it.each([
      ["a price that is not an amount", { "Price (USD)": "abc" }, "Enter an amount like 25000 or 25000.50."],
      ["a price of zero", { "Price (USD)": "0" }, "The price must be above zero."],
      ["a negative quantity", { "Quantity in stock": "-1" }, "Enter a whole number from 0 to 100000."],
      ["a fractional quantity", { "Quantity in stock": "1.5" }, "Enter a whole number from 0 to 100000."],
    ])("explains %s", async (_label, change, message) => {
      const { api } = openDashboard();
      await openAddDialog();
      await fill({ ...goodVehicle, ...change });

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      expect(dialog().getByText(message)).toBeInTheDocument();
      expect(api.create).not.toHaveBeenCalled();
    });

    it("takes a message away as soon as its field is edited", async () => {
      openDashboard();
      await openAddDialog();
      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));
      expect(dialog().getByText("Enter the make.")).toBeInTheDocument();

      await user().type(dialog().getByLabelText("Make"), "T");

      expect(dialog().queryByText("Enter the make.")).not.toBeInTheDocument();
      expect(dialog().getByText("Enter the model.")).toBeInTheDocument(); // the others stay
    });
  });

  describe("when the server says no", () => {
    it("shows its field messages beside the fields and keeps what was typed", async () => {
      const { api } = openDashboard();
      api.create.mockRejectedValue(
        new ApiError(400, "VALIDATION_ERROR", "The request data is invalid", [{ field: "price", message: "Must be greater than zero" }]),
      );
      await openAddDialog();
      await fill(goodVehicle);

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      expect(await dialog().findByText("Must be greater than zero")).toBeInTheDocument();
      expect(dialog().getByLabelText("Price (USD)")).toBeInvalid();
      expect(dialog().getByLabelText("Make")).toHaveValue("Toyota");
    });

    it("explains anything else above the form, stays open, and can be tried again", async () => {
      const { api } = openDashboard();
      api.create.mockRejectedValueOnce(network());
      await openAddDialog();
      await fill(goodVehicle);

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      expect(await dialog().findByRole("alert")).toHaveTextContent("Could not reach the server");
      expect(dialog().getByRole("button", { name: "Add vehicle" })).toBeEnabled();

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(api.create).toHaveBeenCalledTimes(2);
    });

    it("passes on the server's own words if the person is no longer an administrator", async () => {
      const { api } = openDashboard();
      api.create.mockRejectedValue(new ApiError(403, "FORBIDDEN", "Administrator access required"));
      await openAddDialog();
      await fill(goodVehicle);

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      expect(await dialog().findByRole("alert")).toHaveTextContent("Administrator access required");
    });
  });

  describe("the dialog", () => {
    it("shows that it is saving, cannot be sent twice, and cannot be dismissed meanwhile", async () => {
      const { api } = openDashboard();
      let finish!: (v: Vehicle) => void;
      api.create.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
      await openAddDialog();
      await fill(goodVehicle);

      await user().click(dialog().getByRole("button", { name: "Add vehicle" }));

      const saving = await dialog().findByRole("button", { name: "Saving…" });
      expect(saving).toBeDisabled();
      pressEscape();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(api.create).toHaveBeenCalledTimes(1);

      finish(vehicle({ id: "v-new" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("closes without a request on Cancel or Escape, and returns the cursor to the Add button", async () => {
      const { api } = openDashboard();
      const add = await screen.findByRole("button", { name: "Add vehicle" });

      await user().click(add);
      await user().click(dialog().getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(add).toHaveFocus();

      await user().click(add);
      pressEscape();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(api.create).not.toHaveBeenCalled();
    });

    it("starts fresh each time, not with what was typed before", async () => {
      openDashboard();
      await openAddDialog();
      await fill({ Make: "Half-typed" });
      pressEscape();

      await openAddDialog();

      expect(dialog().getByLabelText("Make")).toHaveValue("");
    });
  });
});

describe("editing a vehicle", () => {
  const openEditDialog = async (name = "Toyota Camry") => {
    await user().click((await cardOf(name)).getByRole("button", { name: `Edit ${name}` }));
  };

  it("opens filled in with the vehicle's details and no stock field, since stock changes through Restock", async () => {
    openDashboard();
    await openEditDialog();

    expect(screen.getByRole("dialog", { name: "Edit Toyota Camry" })).toBeInTheDocument();
    expect(dialog().getByLabelText("Make")).toHaveValue("Toyota");
    expect(dialog().getByLabelText("Model")).toHaveValue("Camry");
    expect(dialog().getByLabelText("Category")).toHaveValue("Sedan");
    expect(dialog().getByLabelText("Price (USD)")).toHaveValue("25000.00");
    expect(dialog().queryByLabelText("Quantity in stock")).not.toBeInTheDocument();
  });

  it("sends only what changed, shows the saved vehicle, and confirms", async () => {
    const { api } = openDashboard();
    api.update.mockResolvedValue(vehicle({ price: "24999.99" }));
    await openEditDialog();

    await fill({ "Price (USD)": "24999.99" });
    await user().click(dialog().getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.update).toHaveBeenCalledWith("v-camry", { price: "24999.99" });
    expect((await cardOf("Toyota Camry")).getByText("$24,999.99")).toBeInTheDocument();
    expect(await screen.findByText("Updated Toyota Camry.")).toBeInTheDocument();
  });

  it("closes without a request when nothing was changed, even if the price is written differently", async () => {
    const { api } = openDashboard();
    await openEditDialog();

    await fill({ "Price (USD)": "25000" }); // the same as 25000.00
    await user().click(dialog().getByRole("button", { name: "Save changes" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it("checks the form like the add dialog does", async () => {
    const { api } = openDashboard();
    await openEditDialog();

    await fill({ Make: "" });
    await user().click(dialog().getByRole("button", { name: "Save changes" }));

    expect(dialog().getByText("Enter the make.")).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it("says so, closes and refreshes if the vehicle was removed in the meantime", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce(sampleVehicles().slice(1));
    api.update.mockRejectedValue(new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found"));
    openDashboard("ADMIN", api);
    await openEditDialog();

    await fill({ "Price (USD)": "1000" });
    await user().click(dialog().getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Toyota Camry: Vehicle not found")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: "Vehicles" })).toHaveFocus(); // the Edit button is gone
  });

  it("returns the cursor to the Edit button it came from", async () => {
    openDashboard();
    const edit = (await cardOf("Toyota Camry")).getByRole("button", { name: "Edit Toyota Camry" });

    await user().click(edit);
    pressEscape();

    expect(edit).toHaveFocus();
  });
});

describe("restocking a vehicle", () => {
  const openRestockDialog = async (name = "Toyota Camry") => {
    await user().click((await cardOf(name)).getByRole("button", { name: `Restock ${name}` }));
  };

  it("opens saying how many are in stock now", async () => {
    openDashboard();
    await openRestockDialog();

    expect(screen.getByRole("dialog", { name: "Restock Toyota Camry" })).toBeInTheDocument();
    expect(dialog().getByText("Currently 5 in stock.")).toBeInTheDocument();
    expect(dialog().getByLabelText("Units to add")).toHaveFocus();
  });

  it("adds the units, shows the stock the server reports, and confirms", async () => {
    const { api } = openDashboard();
    api.restock.mockResolvedValue(vehicle({ quantity: 15 }));
    await openRestockDialog();

    await fill({ "Units to add": "10" });
    await user().click(dialog().getByRole("button", { name: "Add stock" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.restock).toHaveBeenCalledWith("v-camry", 10);
    expect((await cardOf("Toyota Camry")).getByText("15 in stock")).toBeInTheDocument();
    expect(await screen.findByText("Restocked Toyota Camry: 15 in stock.")).toBeInTheDocument();
  });

  it("brings a sold-out vehicle back into stock, still without a Purchase button for the administrator", async () => {
    const { api } = openDashboard();
    api.restock.mockResolvedValue(vehicle({ id: "v-civic", make: "Honda", model: "Civic", price: "22000.00", quantity: 3 }));
    await openRestockDialog("Honda Civic");

    await fill({ "Units to add": "3" });
    await user().click(dialog().getByRole("button", { name: "Add stock" }));

    const civic = await cardOf("Honda Civic");
    expect(await civic.findByText("Only 3 left")).toBeInTheDocument();
    expect(civic.queryByRole("button", { name: /^Purchase / })).not.toBeInTheDocument();
    expect(civic.getByRole("button", { name: "Restock Honda Civic" })).toBeEnabled();
  });

  it.each([[""], ["0"], ["-3"], ["2.5"], ["abc"], ["100001"]])("explains %j and sends nothing", async (text) => {
    const { api } = openDashboard();
    await openRestockDialog();

    await fill({ "Units to add": text });
    await user().click(dialog().getByRole("button", { name: "Add stock" }));

    expect(dialog().getByText("Enter a whole number from 1 to 100000.")).toBeInTheDocument();
    expect(api.restock).not.toHaveBeenCalled();
  });

  it("says so, closes and refreshes if the vehicle was removed in the meantime", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce(sampleVehicles().slice(1));
    api.restock.mockRejectedValue(new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found"));
    openDashboard("ADMIN", api);
    await openRestockDialog();

    await fill({ "Units to add": "5" });
    await user().click(dialog().getByRole("button", { name: "Add stock" }));

    expect(await screen.findByText("Toyota Camry: Vehicle not found")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument());
  });

  it("explains a failure above the form and stays open", async () => {
    const { api } = openDashboard();
    api.restock.mockRejectedValue(network());
    await openRestockDialog();

    await fill({ "Units to add": "5" });
    await user().click(dialog().getByRole("button", { name: "Add stock" }));

    expect(await dialog().findByRole("alert")).toHaveTextContent("Could not reach the server");
    expect(dialog().getByLabelText("Units to add")).toHaveValue("5");
  });
});

describe("deleting a vehicle", () => {
  const openDeleteDialog = async (name = "Toyota Camry") => {
    await user().click((await cardOf(name)).getByRole("button", { name: `Delete ${name}` }));
  };

  it("asks first, says what it means, and starts on Cancel so a stray Enter cannot delete", async () => {
    const { api } = openDashboard();
    await openDeleteDialog();

    expect(screen.getByRole("dialog", { name: "Delete Toyota Camry?" })).toBeInTheDocument();
    expect(dialog().getByText("This removes it from the inventory for everyone. This can't be undone.")).toBeInTheDocument();
    expect(dialog().getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it("deletes on confirmation, and the vehicle leaves the list", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce(sampleVehicles().slice(1));
    openDashboard("ADMIN", api);
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.remove).toHaveBeenCalledWith("v-camry");
    expect(await screen.findByText("Deleted Toyota Camry.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument());
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("takes the vehicle off the screen as soon as the server confirms, without asking for the list again", async () => {
    const { api } = openDashboard(); // were the list fetched again, this fake would bring the vehicle back
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    await waitFor(() => expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument());
    expect(api.find).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("puts the cursor on the page heading afterwards, since the Delete button it came from is gone", async () => {
    openDashboard();
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: "Vehicles" })).toHaveFocus();
  });

  it("leaves the vehicle alone on Cancel or Escape", async () => {
    const { api } = openDashboard();
    await openDeleteDialog();
    await user().click(dialog().getByRole("button", { name: "Cancel" }));
    await openDeleteDialog();
    pressEscape();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("article", { name: "Toyota Camry" })).toBeInTheDocument();
  });

  it("shows that it is working and cannot be sent twice", async () => {
    const { api } = openDashboard();
    let finish!: () => void;
    api.remove.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    const busy = await dialog().findByRole("button", { name: "Deleting…" });
    expect(busy).toBeDisabled();
    expect(api.remove).toHaveBeenCalledTimes(1);
    pressEscape();
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // the outcome is not hidden from the person who asked

    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("treats a vehicle that is already gone as done: says so and refreshes", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce(sampleVehicles().slice(1));
    api.remove.mockRejectedValue(new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found"));
    openDashboard("ADMIN", api);
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    expect(await screen.findByText("Toyota Camry was already removed.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument());
  });

  it("explains any other failure in the dialog, which stays open to try again", async () => {
    const { api } = openDashboard();
    api.remove.mockRejectedValueOnce(network());
    await openDeleteDialog();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));

    expect(await dialog().findByRole("alert")).toHaveTextContent("Could not reach the server");
    expect(dialog().getByRole("button", { name: "Delete vehicle" })).toBeEnabled();
    expect(screen.getByRole("article", { name: "Toyota Camry" })).toBeInTheDocument();

    await user().click(dialog().getByRole("button", { name: "Delete vehicle" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
