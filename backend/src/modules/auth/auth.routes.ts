import { Router } from "express";
import type { RegisteredUser } from "./auth.service";

/** What the routes need from the auth service; keeps them testable with a stub. */
export interface RegistrationService {
  register(input: unknown): Promise<RegisteredUser>;
}

export function createAuthRouter(authService: RegistrationService): Router {
  const router = Router();

  // Express 5 forwards a rejected promise to the error handler, so no try/catch is needed.
  router.post("/register", async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  });

  return router;
}
