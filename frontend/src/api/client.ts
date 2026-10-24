import { config } from "../config";
import type { ApiErrorDetail } from "./types";

/** Every way a call to the API can fail, as one error type with a message fit to show a person. */
export class ApiError extends Error {
  constructor(
    /** The HTTP status, or 0 when the server could not be reached. */
    readonly status: number,
    /** A stable code such as "INSUFFICIENT_STOCK" or "NETWORK_ERROR", for code to branch on. */
    readonly code: string,
    message: string,
    /** Field-level problems from a 400, empty otherwise. */
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOptions {
  /** Blank or undefined values are left out of the URL. */
  query?: Record<string, string | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiClient {
  request<T = unknown>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  /** Read on every request, so a new login is used straight away. */
  getToken: () => string | null;
  /** Called when a request that carried a token is rejected with 401: the session is over. */
  onUnauthorized: () => void;
  fetchImpl?: typeof fetch;
}

function buildUrl(baseUrl: string, path: string, query: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value.trim() !== "") params.set(key, value);
  }
  const queryString = params.toString();
  return `${baseUrl}/api${path}${queryString ? `?${queryString}` : ""}`;
}

/** Parses a JSON body, or returns undefined if there is none or it is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** The backend's error shape: { error: { code, message, details? } }. */
function parseErrorBody(body: unknown): { code: string; message: string; details: ApiErrorDetail[] } | undefined {
  const error = (body as { error?: Record<string, unknown> } | undefined)?.error;
  if (typeof error?.code !== "string" || typeof error.message !== "string") return undefined;
  const details = Array.isArray(error.details) ? (error.details as ApiErrorDetail[]) : [];
  return { code: error.code, message: error.message, details };
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = parseErrorBody(await readJson(response));
  if (parsed) return new ApiError(response.status, parsed.code, parsed.message, parsed.details);

  // Not our API's error shape: most likely a proxy or gateway page. Never show its HTML.
  return response.status >= 500
    ? new ApiError(response.status, "SERVER_ERROR", "Something went wrong on the server. Please try again.")
    : new ApiError(response.status, "REQUEST_FAILED", "The request could not be completed.");
}

export function createApiClient({
  baseUrl = config.apiBaseUrl,
  getToken,
  onUnauthorized,
  fetchImpl = (...args) => fetch(...args),
}: ApiClientOptions): ApiClient {
  return {
    async request<T = unknown>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
      const token = getToken();
      const headers = new Headers({ Accept: "application/json" });
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (options.body !== undefined) headers.set("Content-Type", "application/json");

      let response: Response;
      try {
        response = await fetchImpl(buildUrl(baseUrl, path, options.query), {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal,
        });
      } catch (error) {
        if (isAbort(error)) throw error; // a cancelled request is not a failure
        throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
      }

      if (!response.ok) {
        // Only a request that carried a token can have an expired session; a 401 at login is a wrong password.
        if (response.status === 401 && token) onUnauthorized();
        throw await toApiError(response);
      }

      if (response.status === 204) return undefined as T;
      const data = await readJson(response);
      if (data === undefined) throw new ApiError(response.status, "INVALID_RESPONSE", "The server sent an unexpected response.");
      return data as T;
    },
  };
}
