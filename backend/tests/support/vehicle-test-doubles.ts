import {
  InsufficientStockError,
  MAX_STOCK,
  type NewVehicle,
  StockLimitExceededError,
  type Vehicle,
  type VehicleChanges,
  type VehicleFilters,
  type VehicleRepository,
} from "../../src/modules/vehicles/vehicle.repository";

const includes = (text: string, part?: string) => !part || text.toLowerCase().includes(part.toLowerCase());

/** Behaves like the PostgreSQL repository: ordered results, partial filters, stock never below zero. */
export class InMemoryVehicleRepository implements VehicleRepository {
  readonly vehicles: Vehicle[] = [];
  private nextId = 1;

  async create(data: NewVehicle): Promise<Vehicle> {
    const vehicle = { id: `vehicle-${this.nextId++}`, ...data };
    this.vehicles.push(vehicle);
    return { ...vehicle };
  }

  async findAll({ make, model, category, minPrice, maxPrice }: VehicleFilters = {}): Promise<Vehicle[]> {
    return this.vehicles
      .filter(
        (v) =>
          includes(v.make, make) &&
          includes(v.model, model) &&
          includes(v.category, category) &&
          (minPrice === undefined || Number(v.price) >= Number(minPrice)) &&
          (maxPrice === undefined || Number(v.price) <= Number(maxPrice)),
      )
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model))
      .map((v) => ({ ...v }));
  }

  async update(id: string, changes: VehicleChanges): Promise<Vehicle | null> {
    const vehicle = this.vehicles.find((v) => v.id === id);
    if (!vehicle) return null;
    Object.assign(vehicle, changes);
    return { ...vehicle };
  }

  async remove(id: string): Promise<boolean> {
    const index = this.vehicles.findIndex((v) => v.id === id);
    if (index === -1) return false;
    this.vehicles.splice(index, 1);
    return true;
  }

  async adjustStock(id: string, delta: number): Promise<Vehicle | null> {
    const vehicle = this.vehicles.find((v) => v.id === id);
    if (!vehicle) return null;
    if (vehicle.quantity + delta < 0) throw new InsufficientStockError(vehicle.quantity, -delta);
    if (vehicle.quantity + delta > MAX_STOCK) throw new StockLimitExceededError(vehicle.quantity, delta);
    vehicle.quantity += delta;
    return { ...vehicle };
  }
}
