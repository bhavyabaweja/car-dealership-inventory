import { createApp } from "../../src/app";
import { AuthService } from "../../src/modules/auth/auth.service";
import { FakePasswordHasher, FakeTokenService, InMemoryUserRepository } from "./auth-test-doubles";

/** An app wired to in-memory fakes, plus handles on the fakes for assertions. */
export function buildTestApp() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const app = createApp({ authService: new AuthService(users, hasher, tokens) });
  return { app, users, hasher, tokens };
}
