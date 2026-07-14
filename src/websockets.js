// ============================================================
// Cloudgate WebSockets — live workflow events.
//
// Cloudgate exposes WebSocket channels at
//   wss://{gateway-host}/ws/{environment}/{channel}
// secured with HTTP Basic credentials passed via the
// `Authorization` query parameter, plus an optional server-side
// `filter` (substring match on the emitted JSON payload).
//
// One manager holds ONE set of credentials and any number of
// channel connections. Each connection auto-reconnects with
// exponential backoff.
//
//   const sockets = createCloudgateWebSockets({
//     baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,      // origin, or origin/env
//     environment: import.meta.env.VITE_ENVIRONMENT,         // "sbx" | "prod" | ""
//     username: import.meta.env.VITE_CLOUDGATE_WS_USER,      // Basic auth user
//     password: import.meta.env.VITE_CLOUDGATE_WS_PASSWORD,  // Basic auth password
//   });
//
//   const key = sockets.connect("table-session", {
//     filter: '"Id":31',
//     onMessage: (payload) => console.log(payload),
//   });
//   ...
//   sockets.disconnect(key);   // one channel
//   sockets.dispose();         // everything, permanently
// ============================================================

/** Base64-encode a UTF-8 string in both browsers and Node. */
function toBase64(text) {
  if (typeof globalThis.btoa === "function") {
    // Handle non-Latin1 characters safely.
    return globalThis.btoa(
      String.fromCharCode(...new TextEncoder().encode(text))
    );
  }
  // Node fallback.
  // eslint-disable-next-line no-undef
  return Buffer.from(text, "utf8").toString("base64");
}

/**
 * Resolves an HTTP(S) gateway base (optionally ending in an environment
 * segment such as `/sbx` or `/prod`) into a WebSocket origin + environment.
 *
 * @param {string} apiBase e.g. "https://acme.cloudgate.dev/sbx"
 * @returns {{ wsOrigin: string, env: string } | null}
 */
export function parseWebSocketBase(apiBase) {
  const trimmed = String(apiBase ?? "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const protocol =
      u.protocol === "http:" || u.protocol === "ws:" ? "ws:" : "wss:";
    const wsOrigin = `${protocol}//${u.host}`;
    const segments = u.pathname.split("/").filter(Boolean);
    const last = (segments[segments.length - 1] ?? "").toLowerCase();
    const env = last === "sbx" || last === "prod" ? last : "";
    return { wsOrigin, env };
  } catch {
    return null;
  }
}

/**
 * Create a WebSocket manager for Cloudgate live channels.
 *
 * @param {object} options
 * @param {string | (() => string | null | undefined)} options.baseUrl
 *        Gateway base — the same value you give `createCloudgateClient`
 *        ("https://acme.cloudgate.dev"), optionally already carrying the
 *        environment segment ("https://acme.cloudgate.dev/sbx"). Pass a
 *        FUNCTION when the base is only known at runtime (e.g. it arrives
 *        via a QR code) — it is re-read on every (re)connect.
 * @param {string} [options.environment] Environment segment ("sbx" | "prod").
 *        Overrides any environment carried by `baseUrl`. Omit to use the
 *        one embedded in `baseUrl`, or none.
 * @param {string} [options.username] Basic-auth username for the channels.
 *        Wire this to an env var, e.g. `VITE_CLOUDGATE_WS_USER`.
 * @param {string} [options.password] Basic-auth password.
 *        Wire this to an env var, e.g. `VITE_CLOUDGATE_WS_PASSWORD`.
 * @param {number} [options.connectionTimeoutMs=15000] Abort a CONNECTING
 *        socket after this long and schedule a reconnect.
 * @param {object} [options.reconnect]
 * @param {number} [options.reconnect.maxAttempts=5]
 * @param {number} [options.reconnect.initialDelayMs=1000] Doubles per attempt.
 * @param {number} [options.reconnect.maxDelayMs=30000]
 * @param {typeof WebSocket} [options.WebSocket] Custom implementation
 *        (Node < 22, tests). Defaults to `globalThis.WebSocket`.
 * @param {{ log?: Function, warn?: Function, error?: Function } | false}
 *        [options.logger=console] Pass `false` to silence all logging.
 */
export function createCloudgateWebSockets({
  baseUrl,
  environment,
  username = "",
  password = "",
  connectionTimeoutMs = 15000,
  reconnect = {},
  WebSocket: WebSocketImpl,
  logger = console,
} = {}) {
  const getBase = typeof baseUrl === "function" ? baseUrl : () => baseUrl;
  const explicitEnv =
    environment == null
      ? null
      : String(environment).trim().replace(/^\/+|\/+$/g, "");
  const user = String(username ?? "").trim();
  const pass = String(password ?? "").trim();
  const maxReconnectAttempts = reconnect.maxAttempts ?? 5;
  const initialDelayMs = reconnect.initialDelayMs ?? 1000;
  const maxDelayMs = reconnect.maxDelayMs ?? 30000;
  const WS = WebSocketImpl ?? globalThis.WebSocket;

  const log = logger === false ? () => {} : (logger.log ?? (() => {})).bind(logger);
  const warn = logger === false ? () => {} : (logger.warn ?? log).bind(logger);
  const error = logger === false ? () => {} : (logger.error ?? log).bind(logger);

  /** @type {Map<string, { socket: any, connectTimeout?: any, closeWhenOpen?: boolean }>} */
  const sockets = new Map();
  /** @type {Map<string, number>} */
  const reconnectAttempts = new Map();
  /** @type {Set<string>} */
  const pendingKeys = new Set();
  /** @type {Map<string, { channel: string, filter?: string, onMessage: Function, onStatus?: Function }>} */
  const subscriptions = new Map();
  let disposed = false;

  function credentialsQuery() {
    if (!user || !pass) return null;
    return `Basic ${toBase64(`${user}:${pass}`)}`;
  }

  function connectionKey(channel, filter) {
    const c = String(channel).replace(/^\/+/, "");
    return filter != null && filter !== "" ? `${c}|${filter}` : c;
  }

  function buildUrl(channel, filter) {
    const rawBase = getBase();
    if (!rawBase) return null;
    const parsed = parseWebSocketBase(rawBase);
    if (!parsed) return null;
    const env = explicitEnv != null ? explicitEnv : parsed.env;
    const name = String(channel).replace(/^\/+/, "");
    const path = env ? `/ws/${env}/${name}` : `/ws/${name}`;
    const url = new URL(parsed.wsOrigin + path);
    const auth = credentialsQuery();
    if (auth) url.searchParams.set("Authorization", auth);
    if (filter != null && filter !== "") url.searchParams.set("filter", filter);
    return url.toString();
  }

  function maskUrl(urlStr) {
    return urlStr.replace(/Authorization=[^&]+/, "Authorization=****");
  }

  function notifyStatus(key, status) {
    const sub = subscriptions.get(key);
    try {
      sub?.onStatus?.(status);
    } catch {
      /* subscriber errors must not break the socket loop */
    }
  }

  function closeConnection(key) {
    const state = sockets.get(key);
    if (!state) return;
    sockets.delete(key);
    if (state.connectTimeout) clearTimeout(state.connectTimeout);
    const socket = state.socket;
    try {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WS.CONNECTING) {
        state.closeWhenOpen = true;
        sockets.set(key, state); // let onopen close it
      } else if (socket.readyState === WS.OPEN) {
        socket.close();
      }
    } catch {
      /* already closed */
    }
  }

  function tryReconnect(key) {
    if (disposed || !subscriptions.has(key)) return;
    const attempts = (reconnectAttempts.get(key) ?? 0) + 1;
    if (attempts > maxReconnectAttempts) {
      warn(`[CloudgateWS] Gave up on ${key} after ${maxReconnectAttempts} attempts`);
      notifyStatus(key, "failed");
      return;
    }
    reconnectAttempts.set(key, attempts);
    const delay = Math.min(initialDelayMs * 2 ** (attempts - 1), maxDelayMs);
    log(`[CloudgateWS] Reconnecting ${key} in ${delay}ms (attempt ${attempts}/${maxReconnectAttempts})`);
    notifyStatus(key, "reconnecting");
    setTimeout(() => {
      if (disposed) return;
      const sub = subscriptions.get(key);
      if (!sub) return;
      open(key, sub);
    }, delay);
  }

  function open(key, sub) {
    if (disposed) return;
    if (pendingKeys.has(key)) return;
    const existing = sockets.get(key);
    if (
      existing &&
      (existing.socket.readyState === WS.OPEN ||
        existing.socket.readyState === WS.CONNECTING)
    ) {
      return;
    }

    if (!WS) {
      error("[CloudgateWS] No WebSocket implementation available");
      return;
    }
    const url = buildUrl(sub.channel, sub.filter);
    if (!url) {
      warn(`[CloudgateWS] connect skipped for ${key}: no base URL yet`);
      return;
    }

    closeConnection(key);
    pendingKeys.add(key);
    log(`[CloudgateWS] Connecting ${key} to ${maskUrl(url)}`);
    notifyStatus(key, "connecting");

    let state;
    try {
      const socket = new WS(url);
      state = { socket };
      sockets.set(key, state);

      state.connectTimeout = setTimeout(() => {
        if (socket.readyState === WS.CONNECTING) {
          error(`[CloudgateWS] Connection timeout for ${key}`);
          pendingKeys.delete(key);
          try {
            socket.close();
          } catch {
            /* noop */
          }
          tryReconnect(key);
        }
      }, connectionTimeoutMs);

      socket.onopen = () => {
        if (state.closeWhenOpen) {
          sockets.delete(key);
          pendingKeys.delete(key);
          socket.onclose = null;
          socket.close();
          return;
        }
        log(`[CloudgateWS] Connected ${key}`);
        pendingKeys.delete(key);
        if (state.connectTimeout) {
          clearTimeout(state.connectTimeout);
          state.connectTimeout = undefined;
        }
        reconnectAttempts.delete(key);
        notifyStatus(key, "open");
      };

      socket.onmessage = (event) => {
        const data = event?.data;
        if (typeof data !== "string") return;
        let payload = data;
        try {
          payload = JSON.parse(data);
        } catch {
          /* non-JSON frames are delivered as raw strings */
        }
        try {
          sub.onMessage(payload, { channel: sub.channel, filter: sub.filter, key });
        } catch (err) {
          error("[CloudgateWS] onMessage handler threw", err);
        }
      };

      socket.onerror = (event) => {
        error(`[CloudgateWS] Error ${key}`, event?.message ?? event?.type ?? event);
        pendingKeys.delete(key);
        if (state.connectTimeout) {
          clearTimeout(state.connectTimeout);
          state.connectTimeout = undefined;
        }
      };

      socket.onclose = (event) => {
        log(`[CloudgateWS] Closed ${key}`, event?.code ?? "", event?.reason ?? "");
        pendingKeys.delete(key);
        if (state.connectTimeout) {
          clearTimeout(state.connectTimeout);
          state.connectTimeout = undefined;
        }
        sockets.delete(key);
        notifyStatus(key, "closed");
        tryReconnect(key);
      };
    } catch (err) {
      error(`[CloudgateWS] Failed to connect ${key}`, err);
      pendingKeys.delete(key);
      tryReconnect(key);
    }
  }

  return {
    /** True when username + password were provided. */
    get hasCredentials() {
      return Boolean(user && pass);
    },

    /**
     * Subscribe to a channel. Returns the connection key — pass it to
     * `disconnect` to close just this subscription. Connecting the same
     * channel + filter twice reuses the existing socket (the handler is
     * replaced).
     *
     * @param {string} channel e.g. "table-session"
     * @param {object} opts
     * @param {string} [opts.filter] Server-side payload filter,
     *        e.g. '"Id":31' or '"table_session_id":31'.
     * @param {(payload: unknown, meta: { channel: string, filter?: string, key: string }) => void} opts.onMessage
     * @param {(status: "connecting"|"open"|"closed"|"reconnecting"|"failed") => void} [opts.onStatus]
     * @returns {string} connection key
     */
    connect(channel, { filter, onMessage, onStatus } = {}) {
      if (disposed) return "";
      if (typeof onMessage !== "function") {
        throw new Error("connect(channel, { onMessage }) requires an onMessage handler");
      }
      const key = connectionKey(channel, filter);
      subscriptions.set(key, { channel, filter, onMessage, onStatus });
      open(key, subscriptions.get(key));
      return key;
    },

    /** Close one subscription by the key `connect` returned. */
    disconnect(key) {
      subscriptions.delete(key);
      reconnectAttempts.delete(key);
      pendingKeys.delete(key);
      closeConnection(key);
    },

    /** Close every subscription but keep the manager usable. */
    disconnectAll() {
      for (const key of [...subscriptions.keys()]) this.disconnect(key);
    },

    /** Close everything and refuse further connects. */
    dispose() {
      disposed = true;
      this.disconnectAll();
    },
  };
}
