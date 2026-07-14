# @cloudgatedevs/cloudgate-client

Tiny, **dependency-free** client for [Cloudgate](https://cloudgate.dev) workflow-API
gateways, with the standard HMAC-SHA512 request signing built in.
Works in the **browser** and in **Node 18+** — no axios, no build step.

Every request carries three headers, exactly as the gateway expects:

| Header | Value |
| --- | --- |
| `X-Api-Key` | your API key |
| `X-Timestamp` | Unix milliseconds |
| `X-Authentication-Signature` | HMAC-SHA512 hex of `timestamp + VERB + path + body` |

`path` includes the query string, and the signature is computed with
Web Crypto — available natively in browsers and Node 18+.

## Install

```bash
npm install @cloudgatedevs/cloudgate-client
```

## Quick start

```js
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client";

const cloudgate = createCloudgateClient({
  baseUrl: "https://acme.api.cloudgate.dev", // gateway origin only
  environment: "prod",                       // prod | sbx — becomes {baseUrl}/{environment}
  basePath: "api",                           // controller/project path, set once
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
});

// Request paths are just the route — env + basePath are prepended for you:
// GET https://acme.api.cloudgate.dev/prod/api/explorer/stats
const stats = await cloudgate.get("/explorer/stats");
const page = await cloudgate.get("/payments/tickets", {
  params: { skip: 0, take: 25, status: "pending" },
});

// POST https://acme.api.cloudgate.dev/prod/api/contact
const created = await cloudgate.post("/contact", {
  name: "Jane Doe",
  email: "jane@company.com",
  message: "Hello!",
});
```

### In a Vite / React app

Keep credentials in `.env` (never commit it):

```bash
VITE_CLOUDGATE_API_URL=https://acme.cloudgate.dev
VITE_ENVIRONMENT=prd
VITE_API_KEY=...
VITE_API_SECRET=...
```

```js
// src/services/cloudgate.js — create once, import everywhere
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client";

export const cloudgate = createCloudgateClient({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
  apiKey: import.meta.env.VITE_API_KEY,
  apiSecret: import.meta.env.VITE_API_SECRET,
});
```

> **Security note:** in a browser SPA the key and secret are bundled into the
> build and visible to anyone. Use a dedicated, low-privilege key that can only
> reach the endpoints that page needs (e.g. just a contact workflow).
> For anything sensitive, call Cloudgate from your server instead.

### In Node (scripts, servers, cron jobs)

```js
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client";

const cloudgate = createCloudgateClient({
  baseUrl: process.env.CLOUDGATE_API_URL,
  environment: process.env.CLOUDGATE_ENVIRONMENT,
  apiKey: process.env.CLOUDGATE_API_KEY,
  apiSecret: process.env.CLOUDGATE_API_SECRET,
});

const rows = await cloudgate.get("/api/reports/daily", { params: { date: "2026-07-12" } });
```

## API

### `createCloudgateClient(options) → client`

| Option | Type | Notes |
| --- | --- | --- |
| `baseUrl` | `string` (required) | Gateway origin, e.g. `https://acme.cloudgate.dev` or `http://acme.localhost:44301`. |
| `environment` | `string` | Environment segment (`prod`, `sbx`, …) appended to the origin. Omit to use `baseUrl` as-is. |
| `basePath` | `string` | **Optional** convenience prefix appended after the environment — usually a controller/project path, e.g. `api`. Set it to pin one controller and then call bare routes (`/contact`). **Omit it** (the default) to keep the client general: pass the full path per call, controller included. Never a limit — just a shortcut. |

### One client, any controller (default)

Only `environment` shapes the URL automatically (the `/prod` or `/sbx`
segment). Leave `basePath` unset and pass the full path — controller and
route — on each call, so a single client reaches everything:

```js
const cg = createCloudgateClient({
  baseUrl: "https://acme.api.cloudgate.dev",
  environment: "prod",
  apiKey, apiSecret,
});

await cg.post("/api/contact", body);      // → …/prod/api/contact
await cg.get("/crm/leads", { params });   // → …/prod/crm/leads
await cg.get("/some-project/widgets");    // → …/prod/some-project/widgets
```

Set `basePath: "api"` only if you specifically want to pin one controller and
then call `cg.post("/contact")`.
| `apiKey` | `string` | Omit both key and secret to send unsigned requests. |
| `apiSecret` | `string` | Used for HMAC-SHA512 signing. |
| `timeoutMs` | `number` | Default per-request timeout (default `30000`). |
| `fetch` | `typeof fetch` | Custom fetch implementation (tests, polyfills). |
| `headers` | `object` | Extra headers sent on every request. |

### Client methods

```ts
client.get(path, opts?)            // GET
client.post(path, body?, opts?)    // POST (JSON body)
client.put(path, body?, opts?)     // PUT
client.patch(path, body?, opts?)   // PATCH
client.delete(path, opts?)         // DELETE
client.request(path, opts?)        // anything else
client.signingEnabled              // boolean
client.baseUrl                     // normalised base URL
```

`opts`: `{ params, headers, timeoutMs, raw }` — see `index.d.ts` for full types.

### Responses

Cloudgate sometimes returns workflow results as JSON **strings** (even
double-encoded), and some gateways wrap payloads in `{ result: ... }` or
`{ data: ... }`. The client normalises all of that — you get the actual value.
Pass `{ raw: true }` to skip envelope unwrapping.

### Errors

Non-2xx responses, timeouts and network failures throw a `CloudgateError`:

```js
import { CloudgateError } from "@cloudgatedevs/cloudgate-client";

try {
  await cloudgate.post("/contact", form);
} catch (err) {
  if (err instanceof CloudgateError) {
    console.error(err.status, err.body, err.url);
  }
}
```

## WebSockets (live workflow events)

Cloudgate workflows can push to WebSocket channels (`wss://{host}/ws/{env}/{channel}`),
secured with Basic credentials passed as an `Authorization` query parameter.
`createCloudgateWebSockets` manages any number of channel subscriptions with one
set of credentials, reconnecting automatically with exponential backoff.

Set two new env vars in your app (any names you like — the package takes plain
options; these are the recommended convention):

```bash
# .env
VITE_CLOUDGATE_WS_USER=yourUser
VITE_CLOUDGATE_WS_PASSWORD=yourPassword
```

```js
import { createCloudgateWebSockets } from "@cloudgatedevs/cloudgate-client";

export const sockets = createCloudgateWebSockets({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,   // https://acme.cloudgate.dev
  environment: import.meta.env.VITE_ENVIRONMENT,     // sbx | prod
  username: import.meta.env.VITE_CLOUDGATE_WS_USER,
  password: import.meta.env.VITE_CLOUDGATE_WS_PASSWORD,
});

// Multiple channels, same credentials:
const a = sockets.connect("table-session", {
  filter: `"Id":${sessionId}`,               // server-side payload filter
  onMessage: (payload) => refetchSession(),
});
const b = sockets.connect("order-items", {
  filter: `"table_session_id":${sessionId}`,
  onMessage: (payload) => refetchOrders(),
  onStatus: (s) => console.log("order-items:", s), // connecting|open|closed|reconnecting|failed
});

// Later:
sockets.disconnect(a);   // one subscription
sockets.disconnectAll(); // all of them (manager stays usable)
sockets.dispose();       // all of them, permanently
```

Notes:

- `baseUrl` accepts a **function** when the gateway is only known at runtime
  (e.g. it arrives via a QR code): `createCloudgateWebSockets({ baseUrl: () => getStoreBase(), ... })`.
  The function is re-read on every (re)connect, and connects are skipped
  while it returns `null`.
- If `baseUrl` already ends in `/sbx` or `/prod`, that environment is used
  automatically; an explicit `environment` option overrides it.
- JSON frames are parsed before reaching `onMessage`; non-JSON frames are
  delivered as raw strings.
- Connecting the same channel + filter twice reuses the socket and just
  replaces the handler.
- In Node < 22 pass a `WebSocket` implementation (e.g. the `ws` package):
  `createCloudgateWebSockets({ ..., WebSocket: WS })`.

## Require login (IdP auth)

The package also ships the hosted-login session flow used across Cloudgate
apps. Set `VITE_REQUIRE_LOGIN=true` and unauthenticated visitors are redirected
to the IdP login page **before the page loads** — the current URL is passed as
`returnUrl` at redirect time, so there is nothing to configure for it.

```bash
VITE_REQUIRE_LOGIN=true
VITE_IDP_BASE_URL=https://idp.cloudgate.dev
VITE_IDP_TENANCY_NAME=acme     # optional — falls back to ?idp_tenant= or the subdomain
```

```js
// src/services/auth.js — create once, import everywhere
import { createCloudgateAuth } from "@cloudgatedevs/cloudgate-client";

export const auth = createCloudgateAuth({
  idpBaseUrl: import.meta.env.VITE_IDP_BASE_URL,
  tenancyName: import.meta.env.VITE_IDP_TENANCY_NAME,
  requireLogin: import.meta.env.VITE_REQUIRE_LOGIN,
});
```

```js
// src/main.jsx — gate the page load
import { auth } from "./services/auth.js";

auth.init().then((session) => {
  if (auth.requireLogin && !session) return; // browser is redirecting to login
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
});
```

`init()` does the whole dance: it consumes the `?access_token=…` /
`?refresh_token=…` params the IdP appends on the way back (and cleans them out
of the address bar), otherwise restores the stored session from
`localStorage`, silently refreshes an expired token via
`POST {idpApiUrl}/api/idp/{tenant}/Refresh`, and only then — when
`requireLogin` is on and no session could be established — redirects to
`{idpBaseUrl}/idp/{tenant}/login?returnUrl={current page}`.

After boot:

```js
auth.isAuthenticated();  // boolean
auth.getUser();          // { id, displayName, email, claims } from the JWT
auth.getAccessToken();   // valid token or null
auth.logout();           // clear session (+ redirect back to login by default)
```

To send the user's bearer token on gateway calls, pass headers as a function —
it's evaluated per request, so it always uses the current token:

```js
const cloudgate = createCloudgateClient({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
  apiKey: import.meta.env.VITE_API_KEY,
  apiSecret: import.meta.env.VITE_API_SECRET,
  headers: () => auth.authHeader(), // Authorization: Bearer … when signed in
});
```

## Tests

```bash
npm test
```

Runs `node --test`: spins up a local mock gateway that **verifies the HMAC
signature server-side**, plus coverage for query-param signing, envelope
unwrapping, error mapping and unsigned mode.

## Publishing (maintainers)

```bash
npm login            # as a member of the @cloudgatedevs org
npm publish          # publishConfig.access is already "public"
```

## License

MIT © Cloudgate Devs
