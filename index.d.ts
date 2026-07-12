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
   * Gateway origin (no environment or route).
   * @example "https://acme.cloudgate.dev"
   * @example "http://acme.localhost:44301"
   */
  baseUrl: string;
  /**
   * Environment path segment appended to the origin, e.g. "prd" or "sbx".
   * The effective base becomes `${baseUrl}/${environment}` and request
   * paths (e.g. "/api/contact") are appended to that.
   * Omit to treat `baseUrl` as the full base.
   */
  environment?: string;
  /** Gateway API key. Requests are sent unsigned when key/secret are omitted. */
  apiKey?: string;
  /** Gateway API secret used for HMAC-SHA512 request signing. */
  apiSecret?: string;
  /** Default per-request timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
  /** Custom fetch implementation (tests, polyfills). Defaults to global fetch. */
  fetch?: typeof fetch;
  /**
   * Extra headers added to every request. Pass a function to compute them per
   * request — e.g. `() => auth.authHeader()` to attach the IdP bearer token.
   */
  headers?: Record<string, string> | (() => Record<string, string>);
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
  /** The effective base URL requests are made against ({origin}/{environment}). */
  readonly baseUrl: string;
  /** The environment segment in use ("" when none was given). */
  readonly environment: string;
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
 *   baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,   // https://acme.cloudgate.dev
 *   environment: import.meta.env.VITE_ENVIRONMENT,     // prd | sbx
 *   apiKey: import.meta.env.VITE_API_KEY,
 *   apiSecret: import.meta.env.VITE_API_SECRET,
 * });
 *
 * const stats = await cloudgate.get("/api/explorer/stats");
 * await cloudgate.post("/api/contact", { name, email, message });
 */
export function createCloudgateClient(
  options: CloudgateClientOptions
): CloudgateClient;

// ------------------------------------------------------------
// IdP auth (hosted login) — REQUIRE_LOGIN support
// ------------------------------------------------------------

/** localStorage key holding the IdP access token. */
export const IDP_ACCESS_TOKEN_KEY: "idp_access_token";
/** localStorage key holding the IdP refresh token. */
export const IDP_REFRESH_TOKEN_KEY: "idp_refresh_token";
/** localStorage key holding the access-token expiry (unix seconds). */
export const IDP_ACCESS_TOKEN_EXPIRY_KEY: "idp_access_token_expiry";

/** Decode a JWT payload without verifying the signature (null on failure). */
export function decodeJwt(token: string): Record<string, unknown> | null;

/** True when the token exists and its `exp` claim is in the future. */
export function isTokenValid(token: string, bufferSeconds?: number): boolean;

export interface CloudgateAuthOptions {
  /** IdP host, e.g. "https://idp.cloudgate.dev". */
  idpBaseUrl: string;
  /** API base for Refresh calls; defaults to idpBaseUrl. */
  idpApiUrl?: string;
  /**
   * Tenancy name. Falls back to the ?idp_tenant / ?tenant query param,
   * then the current subdomain.
   */
  tenancyName?: string;
  /**
   * When true (or "true"), `init()` redirects unauthenticated visitors to the
   * hosted login page — the CURRENT URL is passed as returnUrl at redirect
   * time, so no return-url configuration is needed.
   * Wire this to your VITE_REQUIRE_LOGIN env var.
   */
  requireLogin?: boolean | string;
  /** Token storage; defaults to localStorage (memory fallback when absent). */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** Custom fetch implementation. */
  fetch?: typeof fetch;
}

export interface CloudgateUser {
  id: string;
  displayName: string;
  email?: string;
  claims: Record<string, unknown>;
}

export interface CloudgateSession {
  accessToken: string;
  refreshToken?: string;
  claims: Record<string, unknown> | null;
  user: CloudgateUser | null;
}

export interface CloudgateAuth {
  /** True when REQUIRE_LOGIN was configured on. */
  readonly requireLogin: boolean;
  /** True when the IdP host + tenancy resolve (login flow usable). */
  readonly enabled: boolean;
  /** The resolved tenancy name. */
  readonly tenancyName: string;
  /**
   * Bootstrap the session: consume redirect tokens, restore/refresh the stored
   * session, or (when requireLogin) redirect to the hosted login page.
   * Call once before rendering the app.
   */
  init(): Promise<CloudgateSession | null>;
  /** Redirect to the hosted login page (returnUrl defaults to current page). */
  login(returnUrl?: string): string;
  /** Build the login URL without navigating. */
  loginUrl(returnUrl?: string): string;
  /** Clear the session; optionally redirect back to the login page. */
  logout(opts?: { redirectToLogin?: boolean }): void;
  /** Exchange the refresh token for new tokens (null on failure). */
  refresh(): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null>;
  isAuthenticated(): boolean;
  getAccessToken(): string | null;
  getUser(): CloudgateUser | null;
  /** `{ Authorization: "Bearer …" }` when authenticated, `{}` otherwise. */
  authHeader(): Record<string, string>;
}

/**
 * Create an IdP auth manager (hosted-login flow).
 *
 * @example
 * // src/services/auth.js
 * import { createCloudgateAuth } from "@cloudgatedevs/cloudgate-client";
 *
 * export const auth = createCloudgateAuth({
 *   idpBaseUrl: import.meta.env.VITE_IDP_BASE_URL,
 *   tenancyName: import.meta.env.VITE_IDP_TENANCY_NAME,
 *   requireLogin: import.meta.env.VITE_REQUIRE_LOGIN,
 * });
 *
 * // src/main.jsx — gate the page load
 * auth.init().then((session) => {
 *   if (auth.requireLogin && !session) return; // browser is redirecting to login
 *   ReactDOM.createRoot(document.getElementById("root")).render(<App />);
 * });
 */
export function createCloudgateAuth(options: CloudgateAuthOptions): CloudgateAuth;

export default createCloudgateClient;
