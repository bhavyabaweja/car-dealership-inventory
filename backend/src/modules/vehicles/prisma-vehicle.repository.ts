import { Prisma, type PrismaClient, type Vehicle as VehicleRow } from "../../generated/prisma/client";
import {
  InsufficientStockError,
  type NewVehicle,
  type Vehicle,
  type VehicleChanges,
  type VehicleFilters,
  type VehicleRepository,
} from "./vehicle.repository";

function toVehicle(row: VehicleRow): Vehicle {
  const { id, make, model, category, quantity } = row;
  return { id, make, model, category, price: row.price.toFixed(2), quantity };
}

/** Prisma reports "the record to update or delete does not exist" with this code. */
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/**
 * Partial, case-insensitive match. Prisma does not escape LIKE wildcards for case-insensitive
 * matching, so "%" would match everything and "_" any character, and a "\" would act as an
 * escape; escape all three so each matches only itself.
 */
function contains(value: string | undefined): Prisma.StringFilter | undefined {
  return value ? { contains: value.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } : undefined;
}

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: NewVehicle): Promise<Vehicle> {
    return toVehicle(await this.prisma.vehicle.create({ data }));
  }

  async findAll({ make, model, category, minPrice, maxPrice }: VehicleFilters = {}): Promise<Vehicle[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: {
        make: contains(make),
        model: contains(model),
        category: contains(category),
        // Strings go to the database as decimals, so the comparison is numeric.
        price: minPrice || maxPrice ? { gte: minPrice || undefined, lte: maxPrice || undefined } : undefined,
      },
      orderBy: [{ make: "asc" }, { model: "asc" }],
    });
    return rows.map(toVehicle);
  }

  async update(id: string, changes: VehicleChanges): Promise<Vehicle | null> {
    try {
      return toVehicle(await this.prisma.vehicle.update({ where: { id }, data: changes }));
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.vehicle.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) return false;
      throw error;
    }
  }

  async adjustStock(id: string, delta: number): Promise<Vehicle | null> {
    try {
      // One statement does the check and the change together ("... WHERE quantity >= n"),
      // so two buyers racing for the last unit cannot both win.
      const row =
        delta < 0
          ? await this.prisma.vehicle.update({
              where: { id, quantity: { gte: -delta } },
              data: { quantity: { decrement: -delta } },
            })
          : await this.prisma.vehicle.update({ where: { id }, data: { quantity: { increment: delta } } });
      return toVehicle(row);
    } catch (error) {
      if (!isRecordNotFound(error)) throw error;
      if (delta >= 0) return null;

      // The conditional update matched nothing: no such vehicle, or not enough stock. Look to tell which.
      const current = await this.prisma.vehicle.findUnique({ where: { id }, select: { quantity: true } });
      if (!current) return null;
      throw new InsufficientStockError(current.quantity, -delta);
    }
  }
}
