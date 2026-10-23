import express, { type Express } from "express";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createAuthRouter, type RegistrationService } from "./modules/auth/auth.routes";

export interface AppDependencies {
  authService: RegistrationService;
}

/** Builds the Express app from its dependencies. It never listens, so tests can drive it directly. */
export function createApp({ authService }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/auth", createAuthRouter(authService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
