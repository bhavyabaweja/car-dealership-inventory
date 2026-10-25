import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/authenticate";
import type { TokenService } from "../auth/token-service";
import type { Vehicle } from "./vehicle.repository";

/** What the routes need from the vehicle service; keeps them testable with a stub. */
export interface VehicleRouteService {
  create(input: unknown): Promise<Vehicle>;
  list(): Promise<Vehicle[]>;
  search(query: unknown): Promise<Vehicle[]>;
  update(id: string, input: unknown): Promise<Vehicle>;
  remove(id: string): Promise<void>;
  purchase(id: string, input: unknown): Promise<Vehicle>;
  restock(id: string, input: unknown): Promise<Vehicle>;
}

/**
 * Browsing is public: anyone, signed in or not, may list and search the vehicles, so that a visitor can see what is
 * for sale before making an account. Everything else needs a signed-in user: buying is open to any user, while
 * changing the catalog or the stock levels is for administrators. `requireAdmin` runs before the body is looked at,
 * so a regular user learns nothing about validation.
 */
export function createVehicleRouter(vehicles: VehicleRouteService, tokens: TokenService): Router {
  const router = Router();
  const signedIn = authenticate(tokens);

  router.get("/", async (_req, res) => {
    res.json(await vehicles.list());
  });

  router.get("/search", async (req, res) => {
    res.json(await vehicles.search(req.query));
  });

  router.post("/", signedIn, requireAdmin, async (req, res) => {
    res.status(201).json(await vehicles.create(req.body));
  });

  // The explicit { id: string } tells TypeScript the path parameter's type, which it loses after middleware.
  router.put<{ id: string }>("/:id", signedIn, requireAdmin, async (req, res) => {
    res.json(await vehicles.update(req.params.id, req.body));
  });

  router.delete<{ id: string }>("/:id", signedIn, requireAdmin, async (req, res) => {
    await vehicles.remove(req.params.id);
    res.status(204).end();
  });

  router.post<{ id: string }>("/:id/purchase", signedIn, async (req, res) => {
    res.json(await vehicles.purchase(req.params.id, req.body));
  });

  router.post<{ id: string }>("/:id/restock", signedIn, requireAdmin, async (req, res) => {
    res.json(await vehicles.restock(req.params.id, req.body));
  });

  return router;
}
