/**
 * An error the API deliberately reports to the client. The HTTP layer renders
 * these by status code and code; anything else becomes a generic 500.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export interface FieldError {
  field: string;
  message: string;
}

/** The request data is malformed or breaks a rule (HTTP 400). */
export class ValidationError extends AppError {
  constructor(readonly details: FieldError[]) {
    super(400, "VALIDATION_ERROR", "The request data is invalid");
  }
}

/** The caller is not authenticated: no valid credentials or token (HTTP 401). */
export class UnauthorizedError extends AppError {
  constructor(message: string, code = "UNAUTHENTICATED") {
    super(401, code, message);
  }
}

/** The caller is known but not allowed to do this (HTTP 403). */
export class ForbiddenError extends AppError {
  constructor(message: string, code = "FORBIDDEN") {
    super(403, code, message);
  }
}

/** The request conflicts with existing data, such as a duplicate email (HTTP 409). */
export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(409, code, message);
  }
}
