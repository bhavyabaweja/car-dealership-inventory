import { ConflictError, NotFoundError } from "../../errors/app-error";
import { parseOrThrow } from "../../validation/parse-or-throw";
import {
  createVehicleSchema,
  purchaseSchema,
  restockSchema,
  searchVehiclesSchema,
  updateVehicleSchema,
} from "./vehicle.schemas";
import {
  InsufficientStockError,
  MAX_STOCK,
  StockLimitExceededError,
  type Vehicle,
  type VehicleRepository,
} from "./vehicle.repository";

function vehicleNotFound(): NotFoundError {
  return new NotFoundError("Vehicle not found", "VEHICLE_NOT_FOUND");
}

export class VehicleService {
  constructor(private readonly vehicles: VehicleRepository) {}

  // Every method is async so that a validation failure is a rejected promise, never a synchronous throw.
  async create(input: unknown): Promise<Vehicle> {
    return this.vehicles.create(parseOrThrow(createVehicleSchema, input));
  }

  /** Every vehicle, sold-out ones included, so a client can show them as unavailable. */
  async list(): Promise<Vehicle[]> {
    return this.vehicles.findAll();
  }

  /** @param query the raw query string parameters; blank ones count as absent. */
  async search(query: unknown): Promise<Vehicle[]> {
    return this.vehicles.findAll(parseOrThrow(searchVehiclesSchema, query ?? {}));
  }

  async update(id: string, input: unknown): Promise<Vehicle> {
    const changes = parseOrThrow(updateVehicleSchema, input);
    return (await this.vehicles.update(id, changes)) ?? Promise.reject(vehicleNotFound());
  }

  async remove(id: string): Promise<void> {
    if (!(await this.vehicles.remove(id))) throw vehicleNotFound();
  }

  /** Buys `quantity` units (one if not said). The body may be absent altogether. */
  async purchase(id: string, input: unknown): Promise<Vehicle> {
    const { quantity } = parseOrThrow(purchaseSchema, input ?? {});
    return this.adjustStock(id, -quantity);
  }

  async restock(id: string, input: unknown): Promise<Vehicle> {
    const { quantity } = parseOrThrow(restockSchema, input);
    return this.adjustStock(id, quantity);
  }

  private async adjustStock(id: string, delta: number): Promise<Vehicle> {
    try {
      return (await this.vehicles.adjustStock(id, delta)) ?? Promise.reject(vehicleNotFound());
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        throw new ConflictError(`Only ${error.available} left in stock`, "INSUFFICIENT_STOCK");
      }
      if (error instanceof StockLimitExceededError) {
        throw new ConflictError(
          `Stock is limited to ${MAX_STOCK} units; there is room for ${error.room} more`,
          "STOCK_LIMIT_EXCEEDED",
        );
      }
      throw error;
    }
  }
}
