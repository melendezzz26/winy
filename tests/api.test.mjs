import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApi } from '../server/api.mjs';
import { QUIZZES } from '../web/core/data.js';
import { AIServiceError } from '../server/ai.mjs';

async function fixture(t, overrides = {}) {
  let time = 1000000;
  const api = createApi({ dbPath: ':memory:', ai: { enabled: false }, clock: () => time, ...overrides });
  const server = http.createServer(api.handle); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); api.close(); });
  const call = async (path, token, data) => { const response = await fetch(base + '/api' + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data ? JSON.stringify(data) : undefined }); return { status: response.status, body: await response.json() }; };
  const player = async nickname => (await call('/players', null, { nickname })).body.token;
  return { call, player, tick: n => { time += n; } };
}
test('dos clientes entran con código, reciben preguntas sin respuestas y juegan una partida completa', async t => {
  const f = await fixture(t), a = await f.player('Ana'), b = await f.player('Luis'), c = await f.player('Tercero');
  const created = await f.call('/rooms', a, { topic: 'wellbeing' }); assert.equal(created.status, 201); const code = created.body.code;
  assert.equal(created.body.phase, 'waiting'); assert.equal(created.body.question, undefined);
  assert.equal((await f.call(`/rooms/${code}/start`, a, {})).status, 409);
  assert.equal((await f.call(`/rooms/${code}/join`, b, {})).status, 200);
  assert.equal((await f.call(`/rooms/${code}/join`, c, {})).status, 409);
  assert.equal((await f.call(`/rooms/${code}/start`, b, {})).status, 403);
  assert.equal((await f.call(`/rooms/${code}/start`, a, {})).body.phase, 'asking');
  for (let round = 0; round < 4; round++) {
    const q = (await f.call(`/rooms/${code}`, b)).body;
    assert.equal(q.question.answer, undefined); assert.equal(q.feedback, undefined); assert.equal(q.round, round);
    const right = QUIZZES.wellbeing.questions[round].answer;
    // Concurrent submissions must not lose either answer.
    await Promise.all([f.call(`/rooms/${code}/answer`, a, { round, answer: right }), f.call(`/rooms/${code}/answer`, b, { round, answer: (right + 1) % 3 })]);
    const revealed = (await f.call(`/rooms/${code}`, a)).body; assert.equal(revealed.phase, 'reveal'); assert.equal(revealed.feedback.answer, right);
    assert.equal(revealed.players[0].score, round + 1); assert.equal(revealed.players[1].score, 0);
    await f.call(`/rooms/${code}/answer`, a, { round, answer: right });
    assert.equal((await f.call(`/rooms/${code}`, a)).body.players[0].score, round + 1);
    f.tick(4501);
  }
  const final = (await f.call(`/rooms/${code}`, a)).body; assert.equal(final.phase, 'finished'); assert.equal(final.players[0].score, 4); assert.equal(final.players[1].score, 0);
});
test('el servidor hace cumplir el tiempo, la autenticación y la caducidad de sala', async t => {
  const f = await fixture(t), a = await f.player('Ana'), b = await f.player('Luis');
  assert.equal((await f.call('/rooms', null, {})).status, 401);
  const code = (await f.call('/rooms', a, {})).body.code;
  await f.call(`/rooms/${code}/join`, b, {}); await f.call(`/rooms/${code}/start`, a, {});
  f.tick(30001); assert.equal((await f.call(`/rooms/${code}`, a)).body.phase, 'reveal');
  assert.equal((await f.call(`/rooms/${code}/answer`, a, { round: 0, answer: 0 })).status, 409);
  f.tick(7200001); assert.equal((await f.call(`/rooms/${code}`, a)).status, 410);
});
test('el análisis de IA exige clave activada, material suficiente y respeta el límite global', async t => {
  const off = await fixture(t), p = await off.player('Ana'); assert.equal((await off.call('/study', p, { sources: [] })).status, 503);
  let calls = 0;
  const f = await fixture(t, { aiDailyLimit: 1, ai: { enabled: true, model: 'test-model', generate: async () => { calls++; return { id: 'test-game', title: 'Juego' }; } } });
  const player = await f.player('Ana'); assert.equal((await f.call('/study', player, { sources: [{ text: 'Un título' }] })).status, 400);
  const input = { sources: [{ name: 'Clase', text: 'Una explicación sobre la fotosíntesis. '.repeat(12) }] };
  assert.equal((await f.call('/study', player, input)).status, 201);
  assert.equal((await f.call('/study', player, input)).status, 429); assert.equal(calls, 1);
});
test('los errores de cuota del proveedor llegan al cliente sin invalidar la sesión de Winy', async t => {
  const f = await fixture(t, { ai: { enabled: true, model: 'test-model', generate: async () => { throw new AIServiceError('OpenAI indica que no hay cuota disponible.', 503, 'ai_quota_exhausted'); } } });
  const player = await f.player('Ana');
  const result = await f.call('/study', player, { sources: [{ name: 'Clase', text: 'Un párrafo explicativo de prueba. '.repeat(12) }] });
  assert.equal(result.status, 503); assert.equal(result.body.code, 'ai_quota_exhausted');
  assert.equal((await f.call('/rooms', player, { topic: 'peru' })).status, 201);
});
test('el estado informa el proveedor y el modelo incluso si falta configurar su clave', async t => {
  const f=await fixture(t,{ai:{enabled:false,provider:'gemini',model:'gemini-3.8-flash'}});
  const response=await f.call('/status');assert.equal(response.status,200);assert.deepEqual(response.body,{online:true,ai:false,provider:'gemini',model:'gemini-3.8-flash'});
});
