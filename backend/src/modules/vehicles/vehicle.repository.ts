/**
 * A car in stock. Money is a decimal string such as "25000.00", never a number:
 * floating point cannot represent most prices exactly.
 */
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: number;
}

export type NewVehicle = Omit<Vehicle, "id">;

/** What may be edited on an existing vehicle. Stock changes only through adjustStock. */
export type VehicleChanges = Partial<Pick<Vehicle, "make" | "model" | "category" | "price">>;

/** Every filter is optional; text matches partially and ignores case, prices are inclusive bounds. */
export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

/** Thrown when removing stock would take a vehicle below zero. */
export class InsufficientStockError extends Error {
  constructor(
    readonly available: number,
    readonly requested: number,
  ) {
    super(`Only ${available} in stock, ${requested} requested`);
    this.name = "InsufficientStockError";
  }
}

/**
 * The most units one vehicle can hold. Far above any real lot, and far below what the database's
 * integer column can store, so repeated restocks end in a clear refusal instead of an overflow.
 * The same number is a CHECK constraint (Vehicle_quantity_within_limit) in the database.
 */
export const MAX_STOCK = 1_000_000;

/** Thrown when adding stock would take a vehicle past MAX_STOCK. */
export class StockLimitExceededError extends Error {
  /** How many more units would still fit. */
  readonly room: number;

  constructor(
    readonly current: number,
    readonly requested: number,
  ) {
    super(`Stock is limited to ${MAX_STOCK} units, ${current} held, ${requested} requested`);
    this.name = "StockLimitExceededError";
    this.room = MAX_STOCK - current;
  }
}

export interface VehicleRepository {
  create(data: NewVehicle): Promise<Vehicle>;

  /** All vehicles matching the filters (all of them with none), ordered by make then model. */
  findAll(filters?: VehicleFilters): Promise<Vehicle[]>;

  /** @returns the updated vehicle, or null if there is no such vehicle. */
  update(id: string, changes: VehicleChanges): Promise<Vehicle | null>;

  /** @returns whether a vehicle was deleted. */
  remove(id: string): Promise<boolean>;

  /**
   * Adds `delta` to the stock (negative to remove). Atomic: concurrent calls can never
   * take the quantity below zero or above MAX_STOCK.
   * @returns the vehicle with its new quantity, or null if there is no such vehicle.
   * @throws InsufficientStockError if removing would go below zero; the stock is unchanged.
   * @throws StockLimitExceededError if adding would go above MAX_STOCK; the stock is unchanged.
   */
  adjustStock(id: string, delta: number): Promise<Vehicle | null>;
}
