import { Router } from "express";
import type { LoginResult, PublicUser } from "./auth.service";

/** What the routes need from the auth service; keeps them testable with a stub. */
export interface AuthRouteService {
  register(input: unknown): Promise<PublicUser>;
  login(input: unknown): Promise<LoginResult>;
}

export function createAuthRouter(authService: AuthRouteService): Router {
  const router = Router();

  // Express 5 forwards a rejected promise to the error handler, so no try/catch is needed.
  router.post("/register", async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  });

  router.post("/login", async (req, res) => {
    const result = await authService.login(req.body);
    // The body carries a credential, so no cache or proxy may keep a copy.
    res.set("Cache-Control", "no-store").json(result);
  });

  return router;
}
