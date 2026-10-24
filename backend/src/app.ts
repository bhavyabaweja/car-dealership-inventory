import express, { type Express } from "express";
import { cors } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { type AuthRouteService, createAuthRouter } from "./modules/auth/auth.routes";
import type { TokenService } from "./modules/auth/token-service";
import { createVehicleRouter, type VehicleRouteService } from "./modules/vehicles/vehicle.routes";

export interface AppDependencies {
  authService: AuthRouteService;
  vehicleService: VehicleRouteService;
  /** Verifies the access tokens that protect the vehicle routes. */
  tokenService: TokenService;
  /** Origins whose pages may call the API from a browser. Leave empty when the page and API share an origin. */
  corsOrigins?: readonly string[];
}

/** Builds the Express app from its dependencies. It never listens, so tests can drive it directly. */
export function createApp({ authService, vehicleService, tokenService, corsOrigins = [] }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  // First, so that errors and 404s carry the headers too and the page can read them.
  if (corsOrigins.length > 0) app.use(cors(corsOrigins));
  app.use(express.json());

  // For the host's health check: needs no login and deliberately does not touch the database.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(authService));
  app.use("/api/vehicles", createVehicleRouter(vehicleService, tokenService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
