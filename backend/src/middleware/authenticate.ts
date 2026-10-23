import type { RequestHandler, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import { ExpiredTokenError, InvalidTokenError, type TokenService } from "../modules/auth/token-service";
import type { Role } from "../modules/auth/user.repository";

/** The caller of a request that passed `authenticate`. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate`; undefined on routes that don't use it. */
      user?: AuthenticatedUser;
    }
  }
}

/** "Bearer <token>": the scheme is case-insensitive (RFC 9110) and exactly one token must follow. */
const BEARER_HEADER = /^Bearer\s+(\S+)$/i;

/** Tells the client how to authenticate, as RFC 9110 requires with every 401. */
function challenge(res: Response): void {
  res.set("WWW-Authenticate", 'Bearer realm="api"');
}

/** Requires a valid access token and exposes the caller as `req.user`. */
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, res, next) => {
    const token = BEARER_HEADER.exec(req.headers.authorization ?? "")?.[1];
    if (!token) {
      challenge(res);
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    let user: AuthenticatedUser;
    try {
      const { sub, role } = tokens.verify(token);
      user = { id: sub, role };
    } catch (error) {
      if (error instanceof ExpiredTokenError) {
        challenge(res);
        next(new UnauthorizedError("Token expired", "TOKEN_EXPIRED"));
      } else if (error instanceof InvalidTokenError) {
        challenge(res);
        next(new UnauthorizedError("Invalid token"));
      } else {
        next(error); // a bug, not a bad token: let it surface as a 500
      }
      return;
    }

    req.user = user;
    next();
  };
}

/** Allows only administrators. Must come after `authenticate`; without it nobody gets in. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new UnauthorizedError("Authentication required"));
  } else if (req.user.role !== "ADMIN") {
    next(new ForbiddenError("Administrator access required"));
  } else {
    next();
  }
};
