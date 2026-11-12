import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgateAuth } from '../src/index.js';

const jwt = (sub = '1') => `e30.${Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function monitoredTab(t, store, fetch) {
  const previous = globalThis.window, events = new Map();
  globalThis.window = { location: { search: '', hostname: 'app.test' },
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: name => events.delete(name) };
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: store, fetch });
  const stop = auth.startSessionMonitor({ intervalMs: 60000 });
  t.after(() => { stop(); globalThis.window = previous; });
  return { auth, events };
}

test('logout clears local state immediately and revokes the family using a navigation-safe request', async () => {
  const requests = [];
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async (url, options) => { requests.push({ url, options }); return new Response(null, { status: 204 }); } });
  auth.setSession({ accessToken: jwt(), refreshToken: 'rotated-refresh' });
  const result = auth.logout({ redirectToLogin: false });
  assert.equal(auth.getAccessToken(), null);
  assert.equal(await result, true);
  assert.equal(requests[0].url, 'https://api.test/api/idp/qa/Logout');
  assert.equal(JSON.parse(requests[0].options.body).refreshToken, 'rotated-refresh');
  assert.equal(requests[0].options.keepalive, true);
  assert.equal(requests[0].options.redirect, 'error');
});

test('logout stays local when offline and reports that remote revocation failed', async () => {
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: storage(), fetch: async () => { throw new Error('offline'); } });
  auth.setSession({ accessToken: jwt(), refreshToken: 'refresh' });
  assert.equal(await auth.logout({ redirectToLogin: false }), false);
  assert.equal(auth.getAccessToken(), null);
});

test('delayed storage events do not discard a refresh of the current session', async t => {
  const store = storage(), started = deferred(), gate = deferred();
  const { auth, events } = monitoredTab(t, store, async () => {
    started.resolve(); await gate.promise;
    return Response.json({ accessToken: jwt('fresh'), refreshToken: 'rotated' });
  });
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const pending = auth.refresh(); await started.promise;
  events.get('storage')({ key: 'idp_access_token', storageArea: store });
  events.get('storage')({ key: 'idp_refresh_token', storageArea: store });
  gate.resolve();
  assert.equal((await pending).accessToken, jwt('fresh'));
  assert.equal(store.getItem('idp_refresh_token'), 'rotated');
});

test('focus reconciles a missed cross-tab account switch and logout', async t => {
  const store = storage();
  const { auth, events } = monitoredTab(t, store);
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const changes = []; auth.subscribe(session => changes.push(session?.user.id ?? null));
  const other = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: store });
  other.setSession({ accessToken: jwt('other'), refreshToken: 'other-refresh' });
  await events.get('focus')();
  other.logout({ redirectToLogin: false });
  await events.get('focus')();
  assert.deepEqual(changes, ['other', null]);
});

test('cross-tab logout invalidates an outstanding refresh', async t => {
  const store = storage(), started = deferred(), gate = deferred();
  const { auth, events } = monitoredTab(t, store, async () => {
    started.resolve(); await gate.promise;
    return Response.json({ accessToken: jwt('stale'), refreshToken: 'stale-refresh' });
  });
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const pending = auth.refresh(); await started.promise;
  store.removeItem('idp_access_token'); store.removeItem('idp_refresh_token');
  events.get('storage')({ key: 'idp_access_token', storageArea: store });
  gate.resolve();
  assert.equal(await pending, null);
  assert.equal(auth.getAccessToken(), null);
});

test('parallel refreshes share one request and notify subscribers when the session changes', async () => {
  const gate = deferred(); let calls = 0;
  const fresh = jwt('2');
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: storage(), fetch: async () => {
    calls++; await gate.promise; return Response.json({ accessToken: fresh, refreshToken: 'rotated' });
  } });
  const changes = [];
  const unsubscribe = auth.subscribe(session => changes.push(session?.user.id ?? null));
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const requests = Array.from({ length: 20 }, () => auth.refresh());
  gate.resolve();
  await Promise.all(requests);
  assert.equal(calls, 1);
  assert.deepEqual(changes, ['1', '2']);
  assert.equal(await auth.ensureAccessToken(), fresh);
  unsubscribe(); auth.logout({ redirectToLogin: false });
  assert.deepEqual(changes, ['1', '2']);
});

test('a refresh completing after logout cannot restore a session', async () => {
  const gate = deferred(), started = deferred();
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: storage(), fetch: async () => {
    started.resolve(); await gate.promise; return Response.json({ accessToken: jwt(), refreshToken: 'rotated' });
  } });
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const pending = auth.refresh(); await started.promise;
  auth.logout({ redirectToLogin: false }); gate.resolve();
  assert.equal(await pending, null); assert.equal(auth.getAccessToken(), null);
});

test('initialization preserves a fresh session installed by another tab during refresh', async () => {
  const store = storage(), gate = deferred(), started = deferred();
  store.setItem('idp_refresh_token', 'initial');
  const options = { idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: store };
  const first = createCloudgateAuth({ ...options, fetch: async () => {
    started.resolve(); await gate.promise; return Response.json({ accessToken: jwt('old'), refreshToken: 'stale' });
  } });
  const pending = first.init(); await started.promise;
  createCloudgateAuth(options).setSession({ accessToken: jwt('new'), refreshToken: 'current' });
  gate.resolve();
  assert.equal((await pending).user.id, 'new');
  assert.equal(store.getItem('idp_refresh_token'), 'current');
});
