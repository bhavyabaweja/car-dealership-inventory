import type { RequestHandler } from "express";

/** What a browser may ask for once it has been allowed in. The API uses these four methods and nothing else. */
const ALLOWED_METHODS = "GET, POST, PUT, DELETE";
/** The only request headers the API reads: the bearer token and the JSON body's type. */
const ALLOWED_HEADERS = "Authorization, Content-Type";
/** How long, in seconds, a browser may reuse a preflight answer. Browsers cap this themselves (Chrome at two hours). */
const PREFLIGHT_MAX_AGE_SECONDS = 7200;

/**
 * Lets pages served from the given origins call the API from a browser. Any other origin gets no CORS headers, so the
 * browser refuses to hand it the answer. Requests without an Origin header (same-origin pages, curl, health checks) are
 * untouched. Credentials are never allowed: the app signs in with a bearer token, not cookies.
 */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    // The answer depends on who asks, so a shared cache must not serve one origin's answer to another.
    res.vary("Origin");

    const origin = req.get("Origin");
    if (origin === undefined || !allowed.has(origin)) {
      next();
      return;
    }

    res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS" && req.get("Access-Control-Request-Method") !== undefined) {
      res.set({
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        "Access-Control-Max-Age": String(PREFLIGHT_MAX_AGE_SECONDS),
      });
      res.sendStatus(204);
      return;
    }
    next();
  };
}
