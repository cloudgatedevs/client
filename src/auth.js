// ============================================================
// Cloudgate IdP auth — hosted-login session management.
//
// Mirrors the token-tracker implementation:
//   - Login page:  {idpBaseUrl}/idp/{tenancyName}/login?returnUrl=...
//     (returnUrl is passed AT REDIRECT TIME — current page by default,
//      no env/config needed for it)
//   - The IdP redirects back with ?access_token=&refresh_token=&expires_in=
//   - Tokens live in localStorage (same keys as token-tracker)
//   - Refresh: POST {idpApiUrl}/api/idp/{tenancyName}/Refresh
//
// Framework-agnostic and dependency-free (manual JWT decode, fetch,
// Web APIs only). SSR-safe: everything no-ops without a window.
// ============================================================

export const IDP_ACCESS_TOKEN_KEY = "idp_access_token";
export const IDP_REFRESH_TOKEN_KEY = "idp_refresh_token";
export const IDP_ACCESS_TOKEN_EXPIRY_KEY = "idp_access_token_expiry";

const EXPIRY_BUFFER_SECONDS = 30;

/** Decode a JWT payload without verifying the signature. Returns null on any failure. */
export function decodeJwt(token) {
  try {
    const part = String(token).split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(pad)
        : Buffer.from(pad, "base64").toString("utf8");
    return JSON.parse(
      // handle UTF-8 in claims
      decodeURIComponent(
        Array.from(json, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
      )
    );
  } catch {
    try {
      // fallback: plain ASCII payloads
      const part = String(token).split(".")[1];
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const json =
        typeof atob === "function"
          ? atob(pad)
          : Buffer.from(pad, "base64").toString("utf8");
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

/** True when the token exists and its `exp` claim is in the future. */
export function isTokenValid(token, bufferSeconds = 0) {
  const claims = token ? decodeJwt(token) : null;
  if (!claims || typeof claims.exp !== "number") return false;
  return claims.exp > Date.now() / 1000 + bufferSeconds;
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* SSR / privacy mode */
  }
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

function getWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

/**
 * Create an IdP auth manager.
 *
 * @param {object} options
 * @param {string}  options.idpBaseUrl   IdP host, e.g. "https://idp.cloudgate.dev".
 * @param {string} [options.idpApiUrl]   API base for Refresh calls (defaults to idpBaseUrl).
 * @param {string} [options.tenancyName] Tenancy. Falls back to ?idp_tenant / ?tenant
 *                                       query param, then the current subdomain.
 * @param {boolean|string} [options.requireLogin=false]
 *        When true (or "true"), `init()` redirects unauthenticated visitors to
 *        the hosted login page, passing the CURRENT URL as returnUrl.
 * @param {Storage} [options.storage]    Token storage (defaults to localStorage).
 * @param {typeof fetch} [options.fetch] Custom fetch (tests, polyfills).
 */
export function createCloudgateAuth({
  idpBaseUrl,
  idpApiUrl = "",
  tenancyName = "",
  requireLogin = false,
  storage,
  fetch: fetchImpl,
} = {}) {
  const baseUrl = String(idpBaseUrl ?? "").trim().replace(/\/$/, "");
  const apiUrl = (String(idpApiUrl ?? "").trim() || baseUrl).replace(/\/$/, "");
  const explicitTenant = String(tenancyName ?? "").trim();
  const mustLogin = requireLogin === true || String(requireLogin).toLowerCase() === "true";
  const store = storage ?? defaultStorage();
  const doFetch = fetchImpl ?? globalThis.fetch;

  function tenantFromQuery() {
    const w = getWindow();
    if (!w) return "";
    const params = new URLSearchParams(w.location.search);
    return (params.get("idp_tenant") || params.get("tenant") || "").trim();
  }

  function tenantFromSubdomain() {
    const w = getWindow();
    if (!w) return "";
    const hostname = w.location.hostname;
    if (hostname === "127.0.0.1" || hostname === "localhost") return "";
    const parts = hostname.split(".");
    if (hostname.endsWith(".localhost") && parts.length >= 2) return parts[0];
    return parts.length > 2 ? parts[0] : "";
  }

  function resolveTenant() {
    return tenantFromQuery() || explicitTenant || tenantFromSubdomain();
  }

  function getStoredAccessToken() {
    try {
      return store.getItem(IDP_ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function getStoredRefreshToken() {
    try {
      return store.getItem(IDP_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function storeTokens({ accessToken, refreshToken, expiresIn }) {
    if (!accessToken) return;
    try {
      store.setItem(IDP_ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) store.setItem(IDP_REFRESH_TOKEN_KEY, refreshToken);
      const seconds = Number(expiresIn) || 0;
      if (seconds > 0) {
        const expiryUnix = Math.floor(Date.now() / 1000) + Math.floor(seconds);
        store.setItem(IDP_ACCESS_TOKEN_EXPIRY_KEY, String(expiryUnix));
      }
    } catch {
      /* noop */
    }
  }

  function clearSession() {
    try {
      store.removeItem(IDP_ACCESS_TOKEN_KEY);
      store.removeItem(IDP_REFRESH_TOKEN_KEY);
      store.removeItem(IDP_ACCESS_TOKEN_EXPIRY_KEY);
    } catch {
      /* noop */
    }
  }

  /** The hosted login page for the resolved tenancy. */
  function loginPage() {
    const tenant = resolveTenant();
    if (!baseUrl || !tenant) return "";
    return `${baseUrl}/idp/${encodeURIComponent(tenant)}/login`;
  }

  /**
   * Login URL with returnUrl attached. returnUrl defaults to the CURRENT
   * page (href) at call time — no configuration needed.
   */
  function loginUrl(returnUrl) {
    const page = loginPage();
    if (!page) return "";
    const w = getWindow();
    const target = String(returnUrl ?? w?.location?.href ?? "").trim();
    if (!target) return page;
    const sep = page.includes("?") ? "&" : "?";
    return `${page}${sep}returnUrl=${encodeURIComponent(target)}`;
  }

  /** Redirect the browser to the hosted login page. */
  function login(returnUrl) {
    const url = loginUrl(returnUrl);
    const w = getWindow();
    if (url && w) w.location.href = url;
    return url;
  }

  /** POST {apiUrl}/api/idp/{tenant}/Refresh — returns new tokens or null. */
  async function refresh() {
    const tenant = resolveTenant();
    const refreshToken = getStoredRefreshToken();
    if (!apiUrl || !tenant || !refreshToken || !doFetch) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await doFetch(
        `${apiUrl}/api/idp/${encodeURIComponent(tenant)}/Refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken, RefreshToken: refreshToken }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const raw = await res.json();
      const data = raw?.result ?? raw;
      const accessToken = data?.accessToken ?? data?.AccessToken;
      if (!accessToken || !isTokenValid(accessToken)) return null;
      const tokens = {
        accessToken,
        refreshToken: data.refreshToken ?? data.RefreshToken ?? refreshToken,
        expiresIn: data.expiresIn ?? data.ExpiresIn ?? 0,
      };
      storeTokens(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  /** Consume ?access_token=&refresh_token=&expires_in= from the current URL. */
  function consumeRedirectTokens() {
    const w = getWindow();
    if (!w) return null;
    const params = new URLSearchParams(w.location.search);
    const accessToken = params.get("access_token");
    if (!accessToken || !isTokenValid(accessToken)) return null;

    const refreshToken = params.get("refresh_token") || undefined;
    const expiresInRaw = params.get("expires_in");
    const expiresIn = expiresInRaw != null ? Number(expiresInRaw) : undefined;
    storeTokens({
      accessToken,
      refreshToken,
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
    });

    // Strip the token params from the address bar.
    params.delete("access_token");
    params.delete("refresh_token");
    params.delete("expires_in");
    const search = params.toString();
    try {
      w.history.replaceState(
        {},
        "",
        w.location.pathname + (search ? `?${search}` : "") + (w.location.hash || "")
      );
    } catch {
      /* noop */
    }
    return { accessToken, refreshToken };
  }

  function currentSession() {
    const accessToken = getStoredAccessToken();
    if (!accessToken || !isTokenValid(accessToken)) return null;
    return {
      accessToken,
      refreshToken: getStoredRefreshToken() || undefined,
      claims: decodeJwt(accessToken),
      user: userFromToken(accessToken),
    };
  }

  /** Minimal user object built from JWT claims. */
  function userFromToken(accessToken) {
    const c = decodeJwt(accessToken);
    if (!c) return null;
    const namePart =
      c.name || [c.given_name, c.family_name].filter(Boolean).join(" ").trim();
    const displayName = namePart || c.email || c.sub || "User";
    return { id: c.sub ?? "", displayName, email: c.email, claims: c };
  }

  /**
   * Bootstrap the session. Call once before rendering the app:
   *   1. consumes tokens from the IdP redirect URL (and cleans the URL)
   *   2. otherwise restores the stored session, refreshing it if expired
   *   3. when `requireLogin` is set and no session exists, redirects to the
   *      hosted login page with the current URL as returnUrl, and resolves null
   *
   * @returns {Promise<null | { accessToken: string, refreshToken?: string,
   *                            claims: object, user: object }>}
   */
  async function init() {
    consumeRedirectTokens();

    let session = currentSession();

    // Expired (or expiring) access token — try the refresh token once.
    if (!session || isTokenValid(session.accessToken, EXPIRY_BUFFER_SECONDS) === false) {
      const refreshed = await refresh();
      if (refreshed) session = currentSession();
    }

    if (session) return session;

    clearSession();
    if (mustLogin && loginPage()) {
      login(); // returnUrl = current page, attached at redirect time
    }
    return null;
  }

  function logout({ redirectToLogin = true } = {}) {
    clearSession();
    if (redirectToLogin) login();
  }

  return {
    /** True when REQUIRE_LOGIN was configured on. */
    requireLogin: mustLogin,
    /** True when the IdP host + tenancy resolve (login flow usable). */
    get enabled() {
      return Boolean(loginPage());
    },
    /** The resolved tenancy name. */
    get tenancyName() {
      return resolveTenant();
    },
    init,
    login,
    loginUrl,
    logout,
    refresh,
    /** True when a valid (unexpired) access token is stored. */
    isAuthenticated: () => Boolean(currentSession()),
    /** The stored access token, or null when missing/expired. */
    getAccessToken: () => currentSession()?.accessToken ?? null,
    /** Minimal user built from the JWT claims, or null. */
    getUser: () => currentSession()?.user ?? null,
    /** `{ Authorization: "Bearer …" }` when authenticated, {} otherwise. */
    authHeader: () => {
      const t = currentSession()?.accessToken;
      return t ? { Authorization: `Bearer ${t}` } : {};
    },
  };
}
