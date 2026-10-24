import { type AppDependencies, createApp } from "../../src/app";
import { AuthService } from "../../src/modules/auth/auth.service";
import { VehicleService } from "../../src/modules/vehicles/vehicle.service";
import { FakePasswordHasher, FakeTokenService, InMemoryUserRepository } from "./auth-test-doubles";
import { InMemoryVehicleRepository } from "./vehicle-test-doubles";

/**
 * An app wired to in-memory fakes, plus handles on the fakes for assertions.
 * `overrides` replaces any of the app's dependencies, for example with one that fails.
 */
export function buildTestApp(overrides: Partial<AppDependencies> = {}) {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const vehicles = new InMemoryVehicleRepository();
  const app = createApp({
    authService: new AuthService(users, hasher, tokens),
    vehicleService: new VehicleService(vehicles),
    tokenService: tokens,
    ...overrides,
  });
  return { app, users, hasher, tokens, vehicles };
}
