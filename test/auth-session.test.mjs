import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgateAuth } from '../src/index.js';

const jwt = (sub = '1') => `e30.${Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

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
