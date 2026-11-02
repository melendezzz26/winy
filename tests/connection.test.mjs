import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(identity, transport, run) {
  const originals = new Map(['localStorage', 'window', 'location', 'fetch'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const storage = new Map([['winy.connection.v1', JSON.stringify(identity)], ['winy.v1', '{"coins":123}']]);
  const win = new EventTarget();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: 'https://winy.test' } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: transport });
  try { const connection = await import(`../web/core/connection.js?test=${Math.random()}`); await run(connection, storage, win); }
  finally { for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } }
}
test('un 401 tras un despliegue renueva la identidad invitada una sola vez y conserva los apuntes', async () => {
  const calls = [], sources = [{ name: 'Clase', text: 'Texto de la clase' }], oldToken = 'a'.repeat(43), newToken = 'b'.repeat(43);
  await fixture({ token: oldToken, nickname: 'Ana' }, async (url, init) => {
    const path = new URL(url).pathname; calls.push({ path, init });
    if (path === '/api/players') return Response.json({ token: newToken, nickname: 'Ana' }, { status: 201 });
    if (init.headers.Authorization === 'Bearer ' + oldToken) return Response.json({ error: 'Sesión caducada' }, { status: 401 });
    return Response.json({ id: 'notes-recovered', questions: [{ prompt: 'Una pregunta' }] }, { status: 201 });
  }, async (connection, storage) => {
    const game = await connection.analyze(sources, 'Clase', 'Ana'); assert.equal(game.id, 'notes-recovered');
    assert.deepEqual(calls.map(c => c.path), ['/api/study', '/api/players', '/api/study']);
    assert.deepEqual(JSON.parse(calls[0].init.body).sources, JSON.parse(calls[2].init.body).sources);
    assert.equal(JSON.parse(storage.get('winy.connection.v1')).token, newToken); assert.equal(storage.get('winy.v1'), '{"coins":123}');
  });
});
test('una cuenta caducada pide volver a entrar y nunca se convierte en un invitado', async () => {
  const account = { id: 'account-id', email: 'ana@example.invalid' }, calls = [];
  await fixture({ token: 'a'.repeat(43), nickname: 'Ana', account }, async (url) => { calls.push(new URL(url).pathname); return Response.json({ error: 'Sesión caducada' }, { status: 401 }); }, async (connection, storage, win) => {
    let expired = false; win.addEventListener('winy-session-expired', () => { expired = true; });
    await assert.rejects(connection.analyze([{ name: 'Clase', text: 'Texto' }], '', 'Ana'), error => error.status === 401);
    assert.deepEqual(calls, ['/api/study']); assert.equal(expired, true); assert.equal(connection.hasSession(), false); assert.deepEqual(connection.currentAccount(), account);
    assert.equal(storage.get('winy.v1'), '{"coins":123}');
  });
});
