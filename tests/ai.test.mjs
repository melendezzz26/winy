import test from 'node:test';
import assert from 'node:assert/strict';
import { createAI, validateAnalysis } from '../server/ai.mjs';
const sources = [{ name: 'Clase.pdf · página 2', text: 'La fotosíntesis transforma energía luminosa en energía química. Las raíces absorben agua y nutrientes del suelo.' }];
const example = () => ({ insufficient_material: false, title: 'Las plantas', summary: 'La planta obtiene recursos y transforma energía.', key_points: [{ idea: 'Conversión de energía', source_id: 0, quote: 'La fotosíntesis transforma energía luminosa en energía química.' }, { idea: 'Absorción de agua', source_id: 0, quote: 'Las raíces absorben agua y nutrientes del suelo.' }], questions: [{ prompt: '¿Qué transforma la fotosíntesis?', options: ['Energía luminosa', 'Rocas', 'Sonido'], answer: 0, explanation: 'Transforma energía luminosa en química.', source_id: 0, quote: 'La fotosíntesis transforma energía luminosa en energía química.' }, { prompt: '¿Qué absorben las raíces?', options: ['Solo aire', 'Agua y nutrientes', 'Luz'], answer: 1, explanation: 'Absorben agua y nutrientes del suelo.', source_id: 0, quote: 'Las raíces absorben agua y nutrientes del suelo.' }] });
test('el análisis conserva ideas y citas verificadas, y rechaza fuentes o citas inventadas', () => {
  const game = validateAnalysis(example(), sources); assert.equal(game.questions.length, 2); assert.equal(game.keyPoints.length, 2); assert.equal(game.questions[0].source, sources[0].name);
  const bad = example(); bad.questions[0].quote = 'Una afirmación que no aparece en el documento.'; assert.throws(() => validateAnalysis(bad, sources), /verificar una cita/);
  const missing = example(); missing.questions[0].source_id = 8; assert.throws(() => validateAnalysis(missing, sources), /verificar una cita/);
});
test('la llamada usa Responses API y JSON estructurado sin introducir la clave en el juego', async () => {
  let captured;
  const ai = createAI({ key: 'test-only-token', transport: async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(example()) }] }] }) }; } });
  const game = await ai.generate(sources, 'Plantas'); const body = JSON.parse(captured.options.body);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses'); assert.equal(body.model, 'gpt-5.4-mini'); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.ok(!JSON.stringify(game).includes('test-only-token'));
});
test('la falta de cuota se distingue del límite temporal y no expone el mensaje del proveedor', async () => {
  const failed = (status, error) => createAI({ key: 'test-only-token', transport: async () => ({ ok: false, status, json: async () => ({ error }) }) });
  await assert.rejects(failed(429, { code: 'insufficient_quota', message: 'raw message test-only-sensitive' }).generate(sources, ''), error => {
    assert.equal(error.code, 'ai_quota_exhausted'); assert.equal(error.status, 503); assert.match(error.message, /facturación/); assert.ok(!error.message.includes('test-only-sensitive')); return true;
  });
  await assert.rejects(failed(429, { code: 'rate_limit_exceeded' }).generate(sources, ''), error => error.code === 'ai_rate_limited' && error.status === 429 && /Espera/.test(error.message));
});
test('clave inválida, modelo inaccesible y respuesta de error no JSON conservan diagnósticos seguros', async () => {
  for (const [status, code] of [[401, 'ai_invalid_key'], [403, 'ai_access_denied'], [404, 'ai_model_unavailable'], [400, 'ai_configuration_error']]) {
    const ai = createAI({ key: 'test-only-token', transport: async () => ({ ok: false, status, json: async () => ({ error: { message: 'private provider error' } }) }) });
    await assert.rejects(ai.generate(sources, ''), error => error.code === code && !error.message.includes('private provider error'));
  }
  const ai = createAI({ key: 'test-only-token', transport: async () => ({ ok: false, status: 429, json: async () => { throw new Error('not JSON'); } }) });
  await assert.rejects(ai.generate(sources, ''), error => error.code === 'ai_usage_limit');
});
test('Gemini genera el mismo juego con citas verificadas, JSON estructurado y clave solo en la cabecera', async () => {
  let captured;
  const ai = createAI({ provider: 'gemini', key: 'test-only-google-key', transport: async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'not part of the JSON answer' }, { text: JSON.stringify(example()) }] } }] }) };
  } });
  const game = await ai.generate(sources, 'Plantas'); const body = JSON.parse(captured.options.body);
  assert.equal(ai.provider, 'gemini'); assert.equal(ai.model, 'gemini-3.8-flash'); assert.equal(game.questions.length, 2);
  assert.equal(captured.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(captured.options.headers['x-goog-api-key'], 'test-only-google-key');
  assert.ok(!captured.url.includes('test-only-google-key')); assert.ok(!captured.options.body.includes('test-only-google-key')); assert.ok(!JSON.stringify(game).includes('test-only-google-key'));
  assert.equal(body.generationConfig.responseMimeType, 'application/json'); assert.equal(body.generationConfig.responseJsonSchema.additionalProperties, false);
});
test('Gemini distingue cuota cero, cupo diario, ritmo de solicitudes y clave inválida', async () => {
  for (const [status, error, code] of [
    [429, {details:[{violations:[{quotaValue:'0',quotaId:'FreeTierRequestsPerDay'}]}]}, 'ai_free_quota_unavailable'],
    [429, {details:[{violations:[{quotaId:'GenerateRequestsPerDayPerProjectPerModel-FreeTier'}]}]}, 'ai_daily_quota_exhausted'],
    [429, {details:[{violations:[{quotaId:'GenerateRequestsPerMinutePerProjectPerModel-FreeTier'}]}]}, 'ai_rate_limited'],
    [400, {details:[{reason:'API_KEY_INVALID'}]}, 'ai_invalid_key'],
    [404, {}, 'ai_model_unavailable'],
    [403, {}, 'ai_access_denied']
  ]) {
    const ai = createAI({ provider:'gemini', key:'test-only-google-key', transport: async()=>({ok:false,status,json:async()=>({error})}) });
    await assert.rejects(ai.generate(sources,''), failure=>failure.code===code && !failure.message.includes('test-only-google-key'));
  }
});
test('Gemini rechaza resultados truncados y citas inventadas sin generar un juego', async () => {
  const incomplete = createAI({ provider:'gemini', key:'test-only-google-key', transport:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})}) });
  await assert.rejects(incomplete.generate(sources,''), error=>error.code==='ai_incomplete');
  const fake=example();fake.questions[0].quote='Una cita inventada que no está en el material.';
  const bad=createAI({ provider:'gemini', key:'test-only-google-key', transport:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(fake)}]}}]})}) });
  await assert.rejects(bad.generate(sources,''), /verificar una cita/);
});
