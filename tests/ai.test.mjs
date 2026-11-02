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
test('un análisis malformado, una cita extensa y preguntas repetidas no producen una trivia', () => {
  for (const value of [null, [], 'texto']) assert.throws(() => validateAnalysis(value, sources), /análisis incompleto/);
  const malformed = example(); malformed.key_points[0] = null;
  assert.throws(() => validateAnalysis(malformed, sources), /idea válida/);
  const stringIndex = example(); stringIndex.questions[0].source_id = '0';
  assert.throws(() => validateAnalysis(stringIndex, sources), /verificar una cita/);
  const repeated = example(); repeated.questions = [repeated.questions[0], { ...repeated.questions[0], prompt: '  ¿Qué transforma la fotosíntesis?  ' }];
  assert.throws(() => validateAnalysis(repeated, sources), /repitió las preguntas/);
  const longQuote = example(); longQuote.questions[0].quote = sources[0].text.repeat(4);
  assert.throws(() => validateAnalysis(longQuote, [{ ...sources[0], text: sources[0].text.repeat(4) }]), /verificar una cita/);
});
test('la llamada usa Responses API y JSON estructurado sin introducir la clave en el juego', async () => {
  let captured;
  const ai = createAI({ provider: 'openai', key: 'test-only-token', transport: async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(example()) }] }] }) }; } });
  const game = await ai.generate(sources, 'Plantas'); const body = JSON.parse(captured.options.body);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses'); assert.equal(body.model, 'gpt-5.4-mini'); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.ok(!JSON.stringify(game).includes('test-only-token'));
});
test('la falta de cuota se distingue del límite temporal y no expone el mensaje del proveedor', async () => {
  const failed = (status, error) => createAI({ provider: 'openai', key: 'test-only-token', transport: async () => ({ ok: false, status, json: async () => ({ error }) }) });
  await assert.rejects(failed(429, { code: 'insufficient_quota', message: 'raw message test-only-sensitive' }).generate(sources, ''), error => {
    assert.equal(error.code, 'ai_quota_exhausted'); assert.equal(error.status, 503); assert.match(error.message, /facturación/); assert.ok(!error.message.includes('test-only-sensitive')); return true;
  });
  await assert.rejects(failed(429, { code: 'rate_limit_exceeded' }).generate(sources, ''), error => error.code === 'ai_rate_limited' && error.status === 429 && /Espera/.test(error.message));
});
test('clave inválida, modelo inaccesible y respuesta de error no JSON conservan diagnósticos seguros', async () => {
  for (const [status, code] of [[401, 'ai_invalid_key'], [403, 'ai_access_denied'], [404, 'ai_model_unavailable'], [400, 'ai_configuration_error']]) {
    const ai = createAI({ provider: 'openai', key: 'test-only-token', transport: async () => ({ ok: false, status, json: async () => ({ error: { message: 'private provider error' } }) }) });
    await assert.rejects(ai.generate(sources, ''), error => error.code === code && !error.message.includes('private provider error'));
  }
  const ai = createAI({ provider: 'openai', key: 'test-only-token', transport: async () => ({ ok: false, status: 429, json: async () => { throw new Error('not JSON'); } }) });
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
test('las variables estándar de Gemini seleccionan Gemini sin llamar al proveedor de pago', () => {
  const names=['WINY_AI_PROVIDER','WINY_GEMINI_KEY','GEMINI_API_KEY','WINY_GEMINI_MODEL','GEMINI_MODEL','WINY_AI_KEY'];
  const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  try {
    for(const n of names) delete process.env[n];
    process.env.GEMINI_API_KEY='test-only-standard-google-key';process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.WINY_AI_KEY='test-only-old-openai-key';
    const selected=createAI();assert.equal(selected.provider,'gemini');assert.equal(selected.enabled,true);assert.equal(selected.model,'gemini-3.8-flash');
    process.env.WINY_AI_PROVIDER='openai';assert.equal(createAI().provider,'openai');
  } finally { for(const n of names) {if(before[n]===undefined)delete process.env[n];else process.env[n]=before[n];} }
});
test('Gemini reintenta un 503 una sola vez, reserva cuota y reduce la generación para Flash', async () => {
  let calls = 0, reserved = 0, body; const stages = [];
  const ai = createAI({ provider: 'gemini', model: 'gemini-3.8-flash', key: 'test-only-key', transport: async (_url, options) => { calls++; body = JSON.parse(options.body); return calls === 1 ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(example()) }] } }] }) }; } });
  const result = await ai.generate(sources, '', { retryDelayMs: 0, beforeRetry: () => { reserved++; }, onProgress: p => stages.push(p.stage) });
  assert.equal(result.questions.length, 2); assert.equal(calls, 2); assert.equal(reserved, 1); assert.ok(stages.includes('retrying')); assert.ok(stages.includes('validating'));
  assert.equal(body.generationConfig.maxOutputTokens, 4096); assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL');
  calls = 0;
  const down = createAI({ provider: 'gemini', key: 'test-only-key', transport: async () => { calls++; return { ok: false, status: 503, json: async () => ({ error: { message: 'private-message' } }) }; } });
  await assert.rejects(down.generate(sources, '', { retryDelayMs: 0 }), e => e.status === 503 && e.code === 'ai_provider_unavailable' && !e.message.includes('private-message'));
  assert.equal(calls, 2);
});
test('el cuerpo REST de Gemini usa el enum canónico y no provoca el rechazo por minúsculas', async () => {
  let calls = 0;
  const ai = createAI({ provider: 'gemini', key: 'test-only-key', reportDiagnostic: () => {}, transport: async (_url, init) => {
    calls++; const config = JSON.parse(init.body).generationConfig;
    if (config.thinkingConfig?.thinkingLevel !== 'MINIMAL') return { status: 400, ok: false, json: async () => ({ error: { status: 'INVALID_ARGUMENT', message: 'Invalid value at generation_config.thinking_config.thinking_level' } }) };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(example()) }] } }] }) };
  } });
  const result = await ai.generate(sources, '', { retryDelayMs: 0 }); assert.equal(result.questions.length, 2); assert.equal(calls, 1);
});
test('un ajuste de razonamiento no admitido tiene un solo reintento sin perder esquema, modelo ni citas', async () => {
  const bodies = [], reports = [], stages = []; let reserved = 0;
  const ai = createAI({ provider: 'gemini', key: 'test-only-sensitive-key', reportDiagnostic: event => reports.push(event), transport: async (url, init) => {
    const body = JSON.parse(init.body); bodies.push(body); assert.ok(url.includes('gemini-3.8-flash'));
    if (bodies.length === 1) return { status: 400, ok: false, json: async () => ({ error: { status: 'INVALID_ARGUMENT', message: 'thinking_config.thinking_level not supported; private-note test-only-sensitive-key' } }) };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(example()) }] } }] }) };
  } });
  const result = await ai.generate(sources, '', { retryDelayMs: 0, beforeRetry: () => { reserved++; }, onProgress: p => stages.push(p) });
  assert.equal(bodies.length, 2); assert.equal(reserved, 1); assert.equal(result.questions.length, 2);
  assert.equal(bodies[1].generationConfig.thinkingConfig, undefined); assert.equal(bodies[1].generationConfig.maxOutputTokens, 8192);
  assert.deepEqual(bodies[1].generationConfig.responseJsonSchema, bodies[0].generationConfig.responseJsonSchema); assert.deepEqual(bodies[1].contents, bodies[0].contents);
  assert.ok(stages.some(p => p.reason === 'compatibility')); assert.deepEqual(reports[0].fields, ['thinkingConfig']);
  assert.ok(!JSON.stringify(reports).includes('private-note')); assert.ok(!JSON.stringify(reports).includes('test-only-sensitive-key'));
  let attempts = 0;
  const stillRejected = createAI({ provider: 'gemini', key: 'test-only-key', reportDiagnostic: () => {}, transport: async () => { attempts++; return attempts === 1 ? { ok: false, status: 503 } : { ok: false, status: 400, json: async () => ({ error: { message: 'thinkingConfig.thinkingLevel not supported' } }) }; } });
  await assert.rejects(stillRejected.generate(sources, '', { retryDelayMs: 0 }), error => error.code === 'ai_configuration_error');
  assert.equal(attempts, 2, 'La recuperación temporal y la de compatibilidad comparten un único reintento');
  attempts = 0;
  const noQuota = createAI({ provider: 'gemini', key: 'test-only-key', reportDiagnostic: () => {}, transport: async () => { attempts++; return { ok: false, status: 400, json: async () => ({ error: { message: 'thinkingConfig.thinkingLevel not supported' } }) }; } });
  await assert.rejects(noQuota.generate(sources, '', { retryDelayMs: 0, beforeRetry: () => { throw Object.assign(new Error('Cupo global agotado'), { code: 'winy_daily_requests_limit' }); } }), error => error.code === 'winy_daily_requests_limit');
  assert.equal(attempts, 1, 'La compatibilidad no debe saltarse la reserva de cuota');
});
test('los rechazos de esquema tienen referencia segura y no generan reintentos de configuración a ciegas', async () => {
  const reports = []; let calls = 0;
  const ai = createAI({ provider: 'gemini', key: 'test-only-key', reportDiagnostic: report => reports.push(report), transport: async () => { calls++; return { status: 400, ok: false, json: async () => ({ error: { status: 'INVALID_ARGUMENT', message: 'response_json_schema rejected: private-document', details: [{ fieldViolations: [{ field: 'generation_config.response_json_schema', description: 'private-diagnostic' }] }] } }) }; } });
  await assert.rejects(ai.generate(sources, '', { retryDelayMs: 0 }), error => error.code === 'ai_configuration_error' && error.message.includes(reports[0].reference) && !error.message.includes('private-'));
  assert.equal(calls, 1); assert.equal(reports[0].httpStatus, 400); assert.deepEqual(reports[0].fields, ['responseJsonSchema']);
  assert.ok(!JSON.stringify(reports).includes('private-'));
});
