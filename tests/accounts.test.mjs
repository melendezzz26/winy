import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createAccounts } from '../server/accounts.mjs';
import { createApi } from '../server/api.mjs';
import { initialState } from '../web/core/state.js';

test('las contraseñas van a Supabase Auth y el progreso usa el token del usuario con RLS', async () => {
  const calls = [];
  const accounts = createAccounts({ url: 'https://test-project.supabase.co', key: 'test-publishable-key', transport: async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => url.includes('/winy_progress?user_id') ? [{ progress: { coins: 123 } }] : { requiresConfirmation: true } }; } });
  assert.equal(accounts.enabled, true);
  await accounts.signup(' Ana@example.invalid ', 'test-password-only', 'Ana');
  assert.match(calls[0].url, /\/auth\/v1\/signup$/); assert.equal(JSON.parse(calls[0].init.body).email, 'ana@example.invalid');
  assert.deepEqual(await accounts.load('user-id', 'test-user-access'), { coins: 123 });
  await accounts.save('user-id', 'test-user-access', { coins: 124 });
  assert.equal(calls[2].init.headers.Authorization, 'Bearer test-user-access'); assert.equal(calls[2].init.headers.apikey, 'test-publishable-key');
  assert.equal(JSON.parse(calls[2].init.body).user_id, 'user-id');
  await assert.rejects(accounts.login('bad-email', '123'), /correo válido/);
  assert.equal(calls.length, 3);
});

test('registro, entrada en dos dispositivos, progreso privado y cierre de una sesión', async t => {
  const writes = [], state = initialState(); state.onboarded = true; state.coins = 321;
  const accounts = { enabled: true, signup: async () => ({}), login: async email => ({ user: { id: email.startsWith('ana') ? 'user-ana' : 'user-luis', email, user_metadata: { nickname: email.startsWith('ana') ? 'Ana' : 'Luis' } }, access_token: 'test-provider-access', refresh_token: 'test-provider-refresh', expires_in: 3600 }), load: async id => id === 'user-ana' ? state : null, save: async (...args) => { writes.push(args); } };
  const api = createApi({ dbPath: ':memory:', accounts, ai: { enabled: false } });
  const server = http.createServer(api.handle); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await api.close(); });
  const call = async (path, data, token) => { const r = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data ? JSON.stringify(data) : undefined }); return { status: r.status, body: await r.json() }; };
  assert.equal((await call('/auth/register', { email: 'ana@example.invalid', password: 'test-password-only' })).body.requiresConfirmation, true);
  const login = async email => (await call('/auth/login', { email, password: 'test-password-only' })).body;
  const a = await login('ana@example.invalid'), second = await login('ana@example.invalid'), b = await login('luis@example.invalid');
  assert.notEqual(a.token, second.token); assert.equal(a.progress.coins, 321); assert.ok(!JSON.stringify(a).includes('test-provider'));
  assert.equal((await call('/auth/me', null, a.token)).body.account.email, 'ana@example.invalid');
  await call('/account/progress', { user_id: 'user-luis', progress: { ...state, coins: 400, password: 'must-not-be-stored' } }, a.token);
  assert.equal(writes[0][0], 'user-ana'); assert.equal(writes[0][1], 'test-provider-access'); assert.equal(writes[0][2].coins, 400); assert.equal(writes[0][2].password, undefined);
  assert.equal((await call('/account/progress', null, b.token)).body.progress, null);
  await call('/auth/logout', {}, a.token); assert.equal((await call('/auth/me', null, a.token)).status, 401);
  assert.equal((await call('/auth/me', null, second.token)).status, 200);
});
