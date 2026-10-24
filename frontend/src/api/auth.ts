import type { ApiClient } from "./client";
import type { LoginResponse, User } from "./types";

export function createAuthApi(client: ApiClient) {
  return {
    login: (email: string, password: string) =>
      client.request<LoginResponse>("POST", "/auth/login", { body: { email, password } }),

    /** Creates a regular user. Registering does not sign anyone in; the caller logs in next. */
    register: (email: string, password: string) =>
      client.request<User>("POST", "/auth/register", { body: { email, password } }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
