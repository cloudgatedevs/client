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
  baseUrl: "https://acme.cloudgate.dev/prd/api", // gateway base incl. project path
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
});

// GET with query params
const stats = await cloudgate.get("/explorer/stats");
const page = await cloudgate.get("/payments/tickets", {
  params: { skip: 0, take: 25, status: "pending" },
});

// POST a JSON body
const created = await cloudgate.post("/contact", {
  name: "Jane Doe",
  email: "jane@company.com",
  message: "Hello!",
});
```

### In a Vite / React app

Keep credentials in `.env` (never commit it):

```bash
VITE_CLOUDGATE_API_URL=https://acme.cloudgate.dev/prd/api
VITE_API_KEY=...
VITE_API_SECRET=...
```

```js
// src/services/cloudgate.js — create once, import everywhere
import { createCloudgateClient } from "@cloudgatedevs/cloudgate-client";

export const cloudgate = createCloudgateClient({
  baseUrl: import.meta.env.VITE_CLOUDGATE_API_URL,
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
  apiKey: process.env.CLOUDGATE_API_KEY,
  apiSecret: process.env.CLOUDGATE_API_SECRET,
});

const rows = await cloudgate.get("/reports/daily", { params: { date: "2026-07-12" } });
```

## API

### `createCloudgateClient(options) → client`

| Option | Type | Notes |
| --- | --- | --- |
| `baseUrl` | `string` (required) | Gateway base URL incl. project path; endpoints are appended. |
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
