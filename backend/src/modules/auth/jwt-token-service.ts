import jwt from "jsonwebtoken";
import { ExpiredTokenError, InvalidTokenError, type TokenPayload, type TokenService } from "./token-service";
import type { Role } from "./user.repository";

/** The one algorithm accepted for signing and verifying; never taken from the token itself. */
const ALGORITHM = "HS256";
const ROLES: readonly Role[] = ["USER", "ADMIN"];

function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export class JwtTokenService implements TokenService {
  /** @param expiresIn a duration like "1h" or "30m"; the format is validated when the config is loaded. */
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = "1h",
  ) {}

  sign({ sub, role }: TokenPayload): string {
    return jwt.sign({ role }, this.secret, {
      subject: sub,
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
      algorithm: ALGORITHM,
    });
  }

  verify(token: string): TokenPayload {
    let claims: string | jwt.JwtPayload;
    try {
      // Pinning the algorithm closes the "alg: none" and algorithm-confusion attacks.
      claims = jwt.verify(token, this.secret, { algorithms: [ALGORITHM] });
    } catch (error) {
      throw error instanceof jwt.TokenExpiredError ? new ExpiredTokenError() : new InvalidTokenError();
    }

    const { sub, role } = typeof claims === "string" ? ({} as jwt.JwtPayload) : claims;
    if (typeof sub !== "string" || !isRole(role)) {
      throw new InvalidTokenError();
    }
    return { sub, role };
  }
}
