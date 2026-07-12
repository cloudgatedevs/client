// Type definitions for @cloudgatedevs/cloudgate-client

/** Error thrown for non-2xx gateway responses, timeouts and network errors. */
export class CloudgateError extends Error {
  name: "CloudgateError";
  /** HTTP status code, when a response was received. */
  status?: number;
  /** Parsed response body, when a response was received. */
  body?: unknown;
  /** The full request URL. */
  url?: string;
  constructor(
    message: string,
    info?: { status?: number; body?: unknown; url?: string }
  );
}

export interface CloudgateClientOptions {
  /**
   * Gateway base URL including the project path.
   * Endpoints are appended, e.g. `${baseUrl}/contact`.
   * @example "https://acme.cloudgate.dev/prd/api"
   */
  baseUrl: string;
  /** Gateway API key. Requests are sent unsigned when key/secret are omitted. */
  apiKey?: string;
  /** Gateway API secret used for HMAC-SHA512 request signing. */
  apiSecret?: string;
  /** Default per-request timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
  /** Custom fetch implementation (tests, polyfills). Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Extra headers added to every request. */
  headers?: Record<string, string>;
}

export interface RequestOptions {
  /** HTTP method. Default "GET". */
  method?: string;
  /** Query parameters; null/undefined entries are dropped. */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Request body — JSON-serialised unless already a string. */
  body?: unknown;
  /** Extra headers for this request. */
  headers?: Record<string, string>;
  /** Per-call timeout override in milliseconds. */
  timeoutMs?: number;
  /**
   * Return the coerced payload without unwrapping single-key
   * `{ result }` / `{ data }` envelopes. Default false.
   */
  raw?: boolean;
}

export interface CloudgateClient {
  /** True when requests are HMAC-signed (key + secret provided). */
  readonly signingEnabled: boolean;
  /** The normalised gateway base URL. */
  readonly baseUrl: string;
  /** Perform a request against the gateway. */
  request<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
  /** GET `{base}{path}` */
  get<T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  /** POST `{base}{path}` with a JSON body */
  post<T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  /** PUT `{base}{path}` with a JSON body */
  put<T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  /** PATCH `{base}{path}` with a JSON body */
  patch<T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  /** DELETE `{base}{path}` */
  delete<T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">): Promise<T>;
}

/**
 * Create a Cloudgate gateway client.
 *
 * Signs every request with `X-Api-Key`, `X-Timestamp` and
 * `X-Authentication-Signature` (HMAC-SHA512 hex of
 * `timestamp + VERB + path-incl-query + body`).
 *
 * @example
 * import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client";
 *
 * const cloudgate = createCloudgateClient({
 *   baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,
 *   apiKey: import.meta.env.VITE_API_KEY,
 *   apiSecret: import.meta.env.VITE_API_SECRET,
 * });
 *
 * const stats = await cloudgate.get("/explorer/stats");
 * await cloudgate.post("/contact", { name, email, message });
 */
export function createCloudgateClient(
  options: CloudgateClientOptions
): CloudgateClient;

export default createCloudgateClient;
