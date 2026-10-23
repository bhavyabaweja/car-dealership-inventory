import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, ValidationError } from "../errors/app-error";

/** Every error response has this shape, so clients only need one parser. */
interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, ...(details !== undefined && { details }) } };
}

/** Errors raised by Express's JSON body parser carry a `type` identifying what went wrong. */
function bodyParserErrorType(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "type" in error && typeof error.type === "string"
    ? error.type
    : undefined;
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

  switch (bodyParserErrorType(error)) {
    case "entity.parse.failed":
      res.status(400).json(errorBody("INVALID_JSON", "Request body is not valid JSON"));
      return;
    case "entity.too.large":
      res.status(413).json(errorBody("PAYLOAD_TOO_LARGE", "Request body is too large"));
      return;
  }

  // Anything else is a bug or an outage: log the details here, tell the client nothing.
  console.error(error);
  res.status(500).json(errorBody("INTERNAL_ERROR", "Internal server error"));
};
