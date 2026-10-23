import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, ValidationError } from "../errors/app-error";

/** Every error response has this shape, so clients only need one parser. */
interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, ...(details !== undefined && { details }) } };
}

/** Failures of the body parser that clients can act on; any other client error gets a generic answer. */
const BODY_PARSER_ERRORS: Record<string, { code: string; message: string }> = {
  "entity.parse.failed": { code: "INVALID_JSON", message: "Request body is not valid JSON" },
  "entity.too.large": { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
};

/** Express and its body parser attach the HTTP status to errors caused by the client's request. */
function clientErrorDetails(error: unknown): { status: number; type?: string } | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const { status } = error;
  if (typeof status !== "number" || status < 400 || status >= 500) return undefined;
  return { status, type: "type" in error && typeof error.type === "string" ? error.type : undefined };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", "Route not found"));
};

// Express recognises error handlers by their four parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json(errorBody(error.code, error.message, error.details));
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json(errorBody(error.code, error.message));
    return;
  }

  const clientError = clientErrorDetails(error);
  if (clientError) {
    const known = clientError.type ? BODY_PARSER_ERRORS[clientError.type] : undefined;
    const { code, message } = known ?? { code: "BAD_REQUEST", message: "The request could not be processed" };
    res.status(clientError.status).json(errorBody(code, message));
    return;
  }

  // Anything else is a bug or an outage: log the details here, tell the client nothing.
  console.error(error);
  res.status(500).json(errorBody("INTERNAL_ERROR", "Internal server error"));
};
