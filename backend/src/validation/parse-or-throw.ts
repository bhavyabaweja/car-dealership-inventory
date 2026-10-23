import type { z } from "zod";
import { ValidationError } from "../errors/app-error";

/** Validates untrusted input against a schema, reporting every problem field by field. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  throw new ValidationError(
    result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    })),
  );
}
