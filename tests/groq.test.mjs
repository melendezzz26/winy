import test from 'node:test';
import assert from 'node:assert/strict';
import { createAI } from '../server/ai.mjs';
import { withQuotaFallback } from '../server/fallback.mjs';
import { groqMaterial } from '../server/materials.mjs';
const sources = [{ name: 'Clase.pdf · página 1', text: 'La fotosíntesis transforma energía luminosa en energía química. Las raíces absorben agua y nutrientes del suelo.' }];
const output = () => ({ insufficient_material: false, title: 'Las plantas', summary: 'Las plantas transforman energía y obtienen recursos.', key_points: [{ idea: 'Energía', source_id: 0, quote_id: 0 }, { idea: 'Recursos', source_id: 0, quote_id: 1 }], questions: [{ prompt: '¿Qué transforma la fotosíntesis?', options: ['Energía luminosa', 'Rocas', 'Sonido'], answer: 0, explanation: 'Transforma energía luminosa.', source_id: 0, quote_id: 0 }, { prompt: '¿Qué absorben las raíces?', options: ['Solo aire', 'Agua y nutrientes', 'Sonido'], answer: 1, explanation: 'Obtienen recursos del suelo.', source_id: 0, quote_id: 1 }] });
const success = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output()) } }] });
test('Groq devuelve citas originales a partir de índices y usa su clave solo en la cabecera', async () => {
  let captured;
  const ai = createAI({ provider: 'groq', key: 'test-groq-key', fallbackProvider: '', transport: async (url, init) => { captured = { url, init }; return success(); } });
  const game = await ai.generate(sources, 'Plantas'); const body = JSON.parse(captured.init.body);
  assert.equal(captured.url, 'https://api.groq.com/openai/v1/chat/completions'); assert.equal(captured.init.headers.Authorization, 'Bearer test-groq-key');
  assert.equal(body.model, 'openai/gpt-oss-20b'); assert.equal(body.reasoning_effort, 'low'); assert.equal(body.store, undefined); assert.equal(body.response_format.type, 'json_schema');
  assert.equal(game.provider, 'groq'); assert.equal(game.questions[0].evidence, sources[0].text.split('. ')[0] + '.');
  const payload = JSON.parse(body.messages[1].content); assert.equal(payload.sources[0].passages[1].quote_id, 1);
  assert.ok(!captured.init.body.includes('test-groq-key')); assert.ok(!JSON.stringify(game).includes('test-groq-key'));
});
test('Gemini sin cuota pasa a Groq una sola vez y respeta la reserva de la segunda llamada', async () => {
  let geminiCalls = 0, groqCalls = 0, reserved = 0; const stages = [];
  const ai = createAI({ provider: 'gemini', key: 'test-google-key', transport: async () => { geminiCalls++; return Response.json({ error: { details: [{ violations: [{ quotaId: 'RequestsPerDay' }] }] } }, { status: 429 }); }, fallbackProvider: 'groq', fallbackOptions: { key: 'test-groq-key', transport: async () => { groqCalls++; return success(); } } });
  const game = await ai.generate(sources, '', { beforeRetry: () => { reserved++; }, onProgress: p => stages.push(p) });
  assert.equal(game.provider, 'groq'); assert.equal(geminiCalls, 1); assert.equal(groqCalls, 1); assert.equal(reserved, 1);
  assert.ok(stages.some(p => p.stage === 'fallback' && p.provider === 'groq'));
  await ai.generate(sources, '', { beforeRetry: () => { reserved++; } });
  assert.equal(geminiCalls, 1, 'No debe consultar de nuevo al principal agotado durante la pausa'); assert.equal(groqCalls, 2); assert.equal(reserved, 1);
});
test('el respaldo no oculta citas inventadas, claves inválidas ni errores de configuración', async () => {
  for (const code of ['ai_invalid_output', 'ai_invalid_key', 'ai_configuration_error', 'ai_model_unavailable', 'winy_daily_requests_limit']) {
    let calls = 0;
    const primary = { enabled: true, provider: 'gemini', model: 'test', generate: async () => { throw Object.assign(new Error('Error controlado'), { code }); } };
    const backup = { enabled: true, provider: 'groq', model: 'test', generate: async () => { calls++; return {}; } };
    await assert.rejects(withQuotaFallback(primary, backup).generate(sources, ''), e => e.code === code); assert.equal(calls, 0);
  }
  let calls = 0;
  const primary = { enabled: true, provider: 'gemini', generate: async () => { throw Object.assign(new Error('Cuota'), { code: 'ai_daily_quota_exhausted' }); } };
  const backup = { enabled: true, provider: 'groq', generate: async () => { calls++; return {}; } };
  await assert.rejects(withQuotaFallback(primary, backup).generate(sources, '', { beforeRetry: () => { throw Object.assign(new Error('Cupo Winy'), { code: 'winy_daily_requests_limit' }); } }), e => e.code === 'winy_daily_requests_limit'); assert.equal(calls, 0);
});
test('Groq distingue su cuota, clave y modelo sin exponer mensajes privados', async () => {
  for (const [status, message, code] of [[401, 'private', 'ai_invalid_key'], [429, 'requests per day private', 'ai_daily_quota_exhausted'], [429, 'tokens per minute private', 'ai_rate_limited'], [404, 'private', 'ai_model_unavailable'], [400, 'private', 'ai_configuration_error']]) {
    const ai = createAI({ provider: 'groq', key: 'test-groq-key', fallbackProvider: '', transport: async () => Response.json({ error: { message } }, { status }) });
    await assert.rejects(ai.generate(sources, ''), e => e.code === code && !e.message.includes('private'));
  }
});
test('los extractos de Groq conservan texto literal y declaran la cobertura del documento', () => {
  const source = { name: 'Clase', text: 'Una explicación de la clase con datos originales. '.repeat(1000) };
  const material = groqMaterial([source]); assert.ok(material.coverage.selected <= 10000); assert.equal(material.coverage.sampled, true);
  for (const part of material.sources) assert.ok(source.text.includes(part.text));
});
