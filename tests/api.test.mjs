import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApi } from '../server/api.mjs';
import { QUIZZES } from '../web/core/data.js';
import { AIServiceError, createAI } from '../server/ai.mjs';

async function fixture(t, overrides = {}) {
  let time = 1000000;
  const api = createApi({ dbPath: ':memory:', ai: { enabled: false }, clock: () => time, ...overrides });
  const server = http.createServer(api.handle); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await api.close(); });
  const call = async (path, token, data) => { const response = await fetch(base + '/api' + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data ? JSON.stringify(data) : undefined }); return { status: response.status, body: await response.json() }; };
  const player = async nickname => (await call('/players', null, { nickname })).body.token;
  return { base, call, player, tick: n => { time += n; } };
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
test('dos usuarios estudian su examen completo, revisan juntos y reciben solo sus resultados al terminar', async t => {
  const f = await fixture(t), a = await f.player('Ana'), b = await f.player('Luis'), outsider = await f.player('Fuera');
  const questions = Array.from({ length: 12 }, (_, i) => ({ prompt: `Pregunta ${i} de mi examen`, options: ['Uno', 'Dos', 'Tres'], answer: i % 3, explanation: `La idea ${i} está explicada en clase.`, evidence: `Esta es la cita literal de la idea ${i} del material del examen.`, source: 'Mi clase.txt' }));
  questions[1] = { prompt: 'La ________ transforma la energía.', expected: 'fotosíntesis', evidence: 'La fotosíntesis transforma la energía.', source: 'Mi clase.txt' };
  const create = await f.call('/rooms', a, { game: { title: 'Examen de biología', questions }, roundSeconds: 90 });
  assert.equal(create.status, 201); assert.equal(create.body.total, 12); assert.equal(create.body.game, undefined); assert.equal(create.body.custom, true);
  const code = create.body.code, url = `/rooms/${code}`;
  assert.equal((await f.call(url, outsider)).status, 403);
  await f.call(url + '/join', b, {}); let current = (await f.call(url + '/start', a, {})).body;
  assert.equal(current.deadline - current.serverTime, 90000);
  for (let round = 0; round < 12; round++) {
    assert.equal(current.round, round); assert.equal(current.game, undefined); assert.equal(current.feedback, undefined);
    assert.equal(current.question.answer, undefined); assert.equal(current.question.expected, undefined); assert.equal(current.question.evidence, undefined);
    const right = round === 1 ? 'FOTOSINTESIS' : round % 3;
    if (round === 1) {
      assert.equal(current.question.type, 'cloze');
      assert.equal((await f.call(url + '/answer', b, { round, answer: 'x'.repeat(101) })).status, 400);
    }
    await Promise.all([f.call(url + '/answer', a, { round, answer: right }), f.call(url + '/answer', b, { round, answer: round === 1 ? 'otra' : (right + 1) % 3 })]);
    const revealed = (await f.call(url, a)).body;
    assert.equal(revealed.feedback.correct, true); assert.equal(revealed.feedback.evidence, questions[round].evidence); assert.equal(revealed.deadline, 0);
    f.tick(120000); assert.equal((await f.call(url, b)).body.phase, 'reveal', 'La explicación espera a los dos jugadores');
    await f.call(url + '/next', a, { round });
    assert.equal((await f.call(url, b)).body.phase, 'reveal');
    await f.call(url + '/next', a, { round }); // Readiness is idempotent.
    current = (await f.call(url + '/next', b, { round })).body;
    assert.equal((await f.call(url + '/next', a, { round })).status, 409, 'Una petición tardía no salta la ronda siguiente');
  }
  assert.equal(current.phase, 'finished'); assert.equal(current.game.questions.length, 12);
  assert.equal(current.results.filter(r => r.correct).length, 0); assert.equal(current.players[0].score, 12);
  const host = (await f.call(url, a)).body; assert.equal(host.results.filter(r => r.correct).length, 12);
  assert.equal((await f.call(url, outsider)).status, 403);
});
test('las salas rechazan bancos o ajustes inválidos y no convierten el archivo completo en datos públicos', async t => {
  const f = await fixture(t), a = await f.player('Ana');
  const game = { title: 'Examen', questions: [0, 1].map(i => ({ prompt: `Pregunta ${i}`, expected: 'luz', evidence: 'La planta necesita luz para crecer.', source: 'Clase' })) };
  for (const bad of [null, { ...game, questions: [] }, { ...game, questions: Array(21).fill(game.questions[0]) }, { ...game, questions: [game.questions[0], { prompt: 'Incompleta' }] }]) assert.equal((await f.call('/rooms', a, { game: bad })).status, 400);
  assert.equal((await f.call('/rooms', a, { game, roundSeconds: 1 })).status, 400);
  assert.equal((await f.call('/rooms', a, { game, questionCount: 21 })).status, 400);
  const room = await f.call('/rooms', a, { game: { ...game, originalFile: 'private raw file', notes: 'private notes' } });
  assert.equal(room.status, 201); assert.equal(JSON.stringify(room.body).includes('private'), false);
});
test('la cantidad de preguntas se valida antes de gastar cuota y distingue tareas con las mismas fuentes', async t => {
  const counts = [], f = await fixture(t, { ai: { enabled: true, generate: async (_s, _t, { questionCount }) => { counts.push(questionCount); return { id: 'count-' + questionCount, title: 'Clase', questions: [] }; } } });
  const token = await f.player('Ana'), input = { background: true, sources: [{ text: 'La clase contiene hechos explicados para preparar el examen. '.repeat(10) }] };
  for (const questionCount of [1, 7, 21, '20']) assert.equal((await f.call('/study', token, { ...input, questionCount })).status, 400);
  const six = (await f.call('/study', token, { ...input, questionCount: 6 })).body;
  const twenty = (await f.call('/study', token, { ...input, questionCount: 20 })).body;
  assert.notEqual(six.id, twenty.id); assert.deepEqual(counts, [6, 20]);
  assert.equal((await f.call('/study', token, { ...input, questionCount: 6 })).body.id, six.id);
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
  const response=await f.call('/status');assert.equal(response.status,200);assert.deepEqual(response.body,{online:true,ai:false,provider:'gemini',model:'gemini-3.8-flash',accounts:false});
});
test('JSON inválido y fuentes malformadas se rechazan antes de gastar solicitudes de IA', async t => {
  let calls = 0;
  const f = await fixture(t, { ai: { enabled: true, generate: async () => { calls++; return { id: 'valid', title: 'Juego' }; } } });
  const token = await f.player('Ana');
  for (const raw of ['null', '[]', '"texto"', '{']) {
    const response = await fetch(f.base + '/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: raw });
    assert.equal(response.status, 400); assert.match((await response.json()).error, /no válidos/);
  }
  for (const sources of [[null], [[]], [{}], [{ text: 3 }], Array(1204).fill({ text: 'Texto de clase' })]) {
    assert.equal((await f.call('/study', token, { sources })).status, 400);
  }
  assert.equal(calls, 0);
  const input = { sources: [{ text: 'Una explicación suficiente para analizar. '.repeat(12) }] };
  assert.equal((await f.call('/study', token, input)).status, 201); assert.equal(calls, 1);
});
test('cinco fallos del proveedor no se confunden con cinco juegos completados', async t => {
  let calls = 0;
  const f = await fixture(t, { ai: { enabled: true, generate: async () => { calls++; if (calls <= 5) throw new AIServiceError('El proveedor está temporalmente ocupado.', 503, 'ai_provider_unavailable'); return { id: 'game-' + calls, title: 'Clase' }; } } });
  const token = await f.player('Ana'), input = { sources: [{ text: 'Un párrafo explicativo sobre un tema de clase. '.repeat(10) }] };
  for (let i = 0; i < 5; i++) assert.equal((await f.call('/study', token, input)).body.code, 'ai_provider_unavailable');
  for (let i = 0; i < 5; i++) assert.equal((await f.call('/study', token, input)).status, 201);
  const limited = await f.call('/study', token, input);
  assert.equal(limited.status, 429); assert.equal(limited.body.code, 'winy_daily_games_limit'); assert.equal(calls, 10);
});
test('un análisis en segundo plano muestra avances, deduplica solicitudes y protege el resultado', async t => {
  let resolve, calls = 0;
  const f = await fixture(t, { ai: { enabled: true, generate: async (_sources, _topic, context) => { calls++; context.onProgress({ stage: 'retrying', attempt: 2 }); return new Promise(done => { resolve = done; }); } } });
  const a = await f.player('Ana'), b = await f.player('Luis'), input = { sources: [{ text: 'Un párrafo explicativo sobre un tema de clase. '.repeat(10) }], background: true };
  const started = await f.call('/study', a, input); assert.equal(started.status, 202);
  assert.equal((await f.call('/study', a, input)).body.id, started.body.id); assert.equal(calls, 1);
  const url = '/study/jobs/' + started.body.id;
  assert.equal((await f.call(url, b)).status, 410);
  assert.equal((await f.call(url, a)).body.stage, 'retrying');
  resolve({ id: 'finished', title: 'Clase', questions: [] });
  const result = await f.call(url, a); assert.equal(result.body.status, 'completed'); assert.equal(result.body.game.id, 'finished');
  assert.equal((await f.call('/study', a, input)).body.id, started.body.id); assert.equal(calls, 1, 'Reutilizar un resultado reciente no debe consumir otra llamada');
});
test('cancelar un análisis detiene la llamada y no guarda un resultado tardío', async t => {
  const f = await fixture(t, { ai: { enabled: true, generate: async (_s, _t, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) } });
  const token = await f.player('Ana'), input = { sources: [{ text: 'Un párrafo explicativo sobre un tema de clase. '.repeat(10) }], background: true };
  const job = (await f.call('/study', token, input)).body;
  await f.call(`/study/jobs/${job.id}/cancel`, token, {});
  assert.equal((await f.call(`/study/jobs/${job.id}`, token)).body.status, 'cancelled');
});
test('el repaso completo supera un rechazo opcional de Gemini y cobra exactamente dos solicitudes globales', async t => {
  const first = 'La fotosíntesis transforma energía luminosa en energía química.', second = 'Las raíces absorben agua y nutrientes del suelo.';
  const output = { insufficient_material: false, title: 'Las plantas', summary: 'Las plantas obtienen recursos y transforman energía.', key_points: [{ idea: 'Transformación de energía', source_id: 0, quote: first }, { idea: 'Recursos del suelo', source_id: 0, quote: second }], questions: [{ prompt: '¿Qué transforma la fotosíntesis?', options: ['Energía luminosa', 'Piedras', 'Sonido'], answer: 0, explanation: first, source_id: 0, quote: first }, { prompt: '¿Qué absorben las raíces?', options: ['Luz', 'Agua y nutrientes', 'Sonido'], answer: 1, explanation: second, source_id: 0, quote: second }] };
  let calls = 0;
  const provider = createAI({ provider: 'gemini', key: 'test-only-key', reportDiagnostic: () => {}, transport: async (_url, init) => {
    calls++; const body = JSON.parse(init.body);
    if (body.generationConfig.thinkingConfig) return Response.json({ error: { status: 'INVALID_ARGUMENT', message: 'thinking_config.thinking_level not supported' } }, { status: 400 });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] });
  } });
  const f = await fixture(t, { aiDailyLimit: 2, ai: { ...provider, generate: (sources, topic, context) => provider.generate(sources, topic, { ...context, retryDelayMs: 0 }) } });
  const token = await f.player('Ana'), input = { background: true, sources: [{ name: 'Clase.pdf · página 1', text: `${first} ${second} ${first} ${second}` }] };
  const started = await f.call('/study', token, input); assert.equal(started.status, 202);
  let job = started.body;
  for (let n = 0; n < 20 && job.status === 'running'; n++) { await new Promise(resolve => setTimeout(resolve, 10)); job = (await f.call(`/study/jobs/${job.id}`, token)).body; }
  assert.equal(job.status, 'completed'); assert.equal(job.game.questions.length, 2); assert.equal(calls, 2);
  assert.equal((await f.call('/study', token, input)).body.id, job.id); assert.equal(calls, 2);
  const limited = await f.call('/study', token, { ...input, topic: 'Otro enfoque' });
  assert.equal(limited.status, 429); assert.equal(limited.body.code, 'winy_daily_requests_limit'); assert.equal(calls, 2);
});
test('la API pasa de Gemini sin cuota a Groq, conserva citas y aplica el cupo global compartido', async t => {
  const text = 'La fotosíntesis transforma energía luminosa en energía química. Las raíces absorben agua y nutrientes del suelo.';
  const answer = { insufficient_material: false, title: 'Plantas', summary: 'Energía y recursos de las plantas.', key_points: [{ idea: 'Energía', source_id: 0, quote_id: 0 }, { idea: 'Raíces', source_id: 0, quote_id: 1 }], questions: [0, 1].map((quote_id) => ({ prompt: quote_id ? '¿Qué absorben las raíces?' : '¿Qué transforma la fotosíntesis?', options: ['Primera', 'Segunda', 'Tercera'], answer: 0, explanation: 'Un concepto de la fuente.', source_id: 0, quote_id })) };
  let google = 0, groq = 0;
  const ai = createAI({ provider: 'gemini', key: 'test-google-secret', transport: async () => { google++; return Response.json({ error: { details: [{ violations: [{ quotaId: 'RequestsPerDay' }] }] } }, { status: 429 }); }, fallbackProvider: 'groq', fallbackOptions: { key: 'test-groq-secret', transport: async () => { groq++; return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }] }); } } });
  const f = await fixture(t, { ai, aiDailyLimit: 3 }), token = await f.player('Ana');
  const status = (await f.call('/status')).body; assert.equal(status.fallback.provider, 'groq'); assert.equal(status.fallback.enabled, true); assert.ok(!JSON.stringify(status).includes('secret'));
  async function create(topic) { let job = (await f.call('/study', token, { background: true, topic, sources: [{ name: 'Clase', text: text + ' ' + text }] })).body; for (let n = 0; n < 20 && job.status === 'running'; n++) { await new Promise(r => setTimeout(r, 10)); job = (await f.call('/study/jobs/' + job.id, token)).body; } return job; }
  const first = await create('Tema 1'); assert.equal(first.status, 'completed'); assert.equal(first.game.provider, 'groq'); assert.equal(first.game.questions[0].source, 'Clase'); assert.ok(text.includes(first.game.questions[0].evidence));
  assert.equal((await create('Tema 2')).status, 'completed'); assert.equal(google, 1); assert.equal(groq, 2);
  const limited = await f.call('/study', token, { background: true, topic: 'Tema 3', sources: [{ text: text + ' ' + text }] }); assert.equal(limited.body.code, 'winy_daily_requests_limit'); assert.equal(groq, 2);
});
