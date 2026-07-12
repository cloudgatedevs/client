// ============================================================
// @cloudgatedevs/cloudgate-client
//
// Tiny, dependency-free client for Cloudgate workflow-API
// gateways. Works in the browser and Node 18+ (needs global
// `fetch` and `crypto.subtle`, both standard).
//
// Every request is signed with three headers:
//   X-Api-Key                  -> your API key
//   X-Timestamp                -> Unix milliseconds
//   X-Authentication-Signature -> HMAC-SHA512 hex of
//                                 (timestamp + VERB + path + body)
// where `path` is the URL path INCLUDING the query string.
// ============================================================

/** Error thrown for non-2xx gateway responses. */
export class CloudgateError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, body?: unknown, url?: string }} [info]
   */
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = "CloudgateError";
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

async function hmacSha512Hex(secret, message) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new CloudgateError(
      "Web Crypto (crypto.subtle) is unavailable — Node 18+ or a modern browser is required"
    );
  }
  const enc = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cloudgate may return the workflow result as a JSON string (text/plain) or
// even double-encoded. Coerce to a real JS value.
function coerceValue(data) {
  let d = data;
  for (let i = 0; i < 4 && typeof d === "string"; i++) {
    const t = d.trim();
    if (!t) return null;
    try {
      d = JSON.parse(t);
    } catch {
      return d; // a plain (non-JSON) string, e.g. an error message
    }
  }
  return d;
}

// Some gateways wrap the payload: { result: ... } or { data: ... }.
function unwrapValue(d) {
  if (d && typeof d === "object" && !Array.isArray(d)) {
    if ("result" in d && Object.keys(d).length === 1) return d.result;
    if ("data" in d && Object.keys(d).length === 1) return d.data;
  }
  return d;
}

/**
 * Create a Cloudgate gateway client.
 *
 * The effective base is `{baseUrl}/{environment}`; request paths are
 * appended to that, so the route (e.g. "/api/contact") stays fully in
 * the caller's hands:
 *
 *   baseUrl: "https://acme.cloudgate.dev", environment: "prd"
 *   client.post("/api/contact", body)
 *   -> POST https://acme.cloudgate.dev/prd/api/contact
 *
 * `environment` is optional — omit it to treat `baseUrl` as the full base.
 *
 * @param {object} options
 * @param {string} options.baseUrl    Gateway origin,
 *                                    e.g. "https://acme.cloudgate.dev"
 *                                    or "http://acme.localhost:44301"
 * @param {string} [options.environment] Environment path segment appended to
 *                                    the origin, e.g. "prd" or "sbx".
 * @param {string} [options.apiKey]   Gateway API key. Requests are sent
 *                                    unsigned when key/secret are omitted.
 * @param {string} [options.apiSecret] Gateway API secret.
 * @param {number} [options.timeoutMs=30000] Default per-request timeout.
 * @param {typeof fetch} [options.fetch]     Custom fetch (tests, polyfills).
 * @param {Record<string,string> | (() => Record<string,string>)} [options.headers]
 *        Extra headers on every request — pass a function to compute them per
 *        request (e.g. `() => auth.authHeader()` to attach the IdP bearer).
 */
export function createCloudgateClient({
  baseUrl,
  environment = "",
  apiKey = "",
  apiSecret = "",
  timeoutMs = 30000,
  fetch: fetchImpl,
  headers: defaultHeaders = {},
} = {}) {
  const origin = String(baseUrl ?? "").trim().replace(/\/$/, "");
  if (!origin) throw new CloudgateError("baseUrl is required");
  const envSegment = String(environment ?? "").trim().replace(/^\/+|\/+$/g, "");
  const base = envSegment ? `${origin}/${envSegment}` : origin;
  const key = String(apiKey).trim();
  const secret = String(apiSecret).trim();
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (!doFetch) {
    throw new CloudgateError("global fetch is unavailable — Node 18+ required");
  }

  const signingEnabled = Boolean(key && secret);

  /**
   * Perform a request against the gateway.
   *
   * @param {string} path route under the base URL, e.g. "/contact"
   * @param {object} [opts]
   * @param {string}  [opts.method="GET"]
   * @param {Record<string, string|number|boolean|null|undefined>} [opts.params]
   *                  Query parameters (null/undefined entries are dropped).
   * @param {unknown} [opts.body]   JSON-serialised unless already a string.
   * @param {Record<string,string>} [opts.headers]
   * @param {number}  [opts.timeoutMs]
   * @param {boolean} [opts.raw=false] Return the coerced payload without
   *                  unwrapping single-key { result } / { data } envelopes.
   * @returns {Promise<any>} the response payload
   * @throws  {CloudgateError} on non-2xx responses, timeouts and network errors
   */
  async function request(path, opts = {}) {
    const {
      method = "GET",
      params,
      body,
      headers = {},
      timeoutMs: perCallTimeout,
      raw = false,
    } = opts;

    const url = new URL(base + (String(path).startsWith("/") ? path : `/${path}`));
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      }
    }

    const verb = String(method).toUpperCase();
    const bodyStr =
      verb !== "GET" && body != null
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : "";

    const baseHeaders =
      typeof defaultHeaders === "function" ? defaultHeaders() ?? {} : defaultHeaders;
    const reqHeaders = {
      ...(bodyStr ? { "Content-Type": "application/json" } : {}),
      ...baseHeaders,
      ...headers,
    };

    if (signingEnabled) {
      // Sign exactly what we send: timestamp + VERB + path(incl. query) + body
      const timestamp = Date.now();
      const signedPath = url.pathname + url.search;
      const signature = await hmacSha512Hex(
        secret,
        `${timestamp}${verb}${signedPath}${bodyStr}`
      );
      reqHeaders["X-Api-Key"] = key;
      reqHeaders["X-Timestamp"] = String(timestamp);
      reqHeaders["X-Authentication-Signature"] = signature;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      perCallTimeout ?? timeoutMs
    );

    let res;
    try {
      res = await doFetch(url.toString(), {
        method: verb,
        headers: reqHeaders,
        body: bodyStr || undefined,
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err?.name === "AbortError";
      throw new CloudgateError(
        aborted ? `Request timed out after ${perCallTimeout ?? timeoutMs}ms` : `Network error: ${err?.message ?? err}`,
        { url: url.toString() }
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    const value = coerceValue(text);
    if (!res.ok) {
      throw new CloudgateError(`Cloudgate responded ${res.status}`, {
        status: res.status,
        body: value,
        url: url.toString(),
      });
    }
    return raw ? value : unwrapValue(value);
  }

  return {
    /** True when requests are HMAC-signed (key + secret provided). */
    signingEnabled,
    /** The effective base URL requests are made against ({origin}/{environment}). */
    baseUrl: base,
    /** The environment segment in use ("" when none was given). */
    environment: envSegment,
    request,
    /** GET {base}{path} */
    get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
    /** POST {base}{path} with a JSON body */
    post: (path, body, opts = {}) => request(path, { ...opts, method: "POST", body }),
    /** PUT {base}{path} with a JSON body */
    put: (path, body, opts = {}) => request(path, { ...opts, method: "PUT", body }),
    /** PATCH {base}{path} with a JSON body */
    patch: (path, body, opts = {}) => request(path, { ...opts, method: "PATCH", body }),
    /** DELETE {base}{path} */
    delete: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),
  };
}

export {
  createCloudgateAuth,
  decodeJwt,
  isTokenValid,
  IDP_ACCESS_TOKEN_KEY,
  IDP_REFRESH_TOKEN_KEY,
  IDP_ACCESS_TOKEN_EXPIRY_KEY,
} from "./auth.js";

export default createCloudgateClient;
