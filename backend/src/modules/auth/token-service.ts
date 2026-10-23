import type { Role } from "./user.repository";

/** What a token asserts about its holder: who they are and what they may do. */
export interface TokenPayload {
  /** The user's id. */
  sub: string;
  role: Role;
}

/** The token is malformed, forged, or otherwise cannot be trusted. */
export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid token");
    this.name = "InvalidTokenError";
  }
}

/** The token was genuine but its lifetime has ended. */
export class ExpiredTokenError extends Error {
  constructor() {
    super("Token expired");
    this.name = "ExpiredTokenError";
  }
}

/** Issues and checks access tokens, so callers don't depend on a particular token format. */
export interface TokenService {
  sign(payload: TokenPayload): string;
  /** @throws ExpiredTokenError, InvalidTokenError */
  verify(token: string): TokenPayload;
}
