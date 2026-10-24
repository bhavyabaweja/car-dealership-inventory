import { ApiError } from "../api/client";

/** Text to show a person for a failure. The API's own messages are written for that; anything else is not. */
export function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
