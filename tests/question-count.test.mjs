import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStudyGame } from '../web/core/study.js';
import { questionTarget, outputBudget } from '../web/core/question-count.js';
import { createAI } from '../server/ai.mjs';
import { withQuotaFallback } from '../server/fallback.mjs';

const sentences = Array.from({ length: 24 }, (_, i) => `El concepto número ${i} explica una relación diferente entre la energía, los recursos y los procesos de la naturaleza.`);
const sources = [{ name: 'Mi examen.txt', text: sentences.join(' ') }];
const result = count => ({ title: 'Mi examen', summary: 'Relaciones explicadas en clase.', insufficient_material: false,
  key_points: [0, 1].map(i => ({ idea: `Idea ${i}`, source_id: 0, quote: sentences[i] })),
  questions: Array.from({ length: count }, (_, i) => ({ prompt: `¿Qué explica el concepto ${i}?`, options: ['La relación descrita', 'Una afirmación distinta', 'Un concepto contrario'], answer: 0, explanation: 'Explica la relación descrita en los apuntes.', skill: 'understand', source_id: 0, quote: sentences[i] })) });

test('se pueden preparar 6, 12 o 20 preguntas locales distintas sin repetir material escaso', () => {
  assert.equal(questionTarget(), 12);
  for (const count of [6, 12, 20]) {
    const game = makeStudyGame(sources, 'Examen', count);
    assert.equal(game.questions.length, count); assert.equal(game.requestedCount, count);
    assert.equal(new Set(game.questions.map(q => q.evidence)).size, count);
    assert.equal(game.questions.every(q => sources[0].text.includes(q.evidence)), true);
  }
  assert.equal(makeStudyGame([{ name: 'Clase', text: sentences.slice(0, 2).join(' ') }], '', 20).questions.length, 2);
  for (const count of [0, 7, 21, '20', null]) assert.throws(() => questionTarget(count), /6, 12 o 20/);
});
test('los tres proveedores reciben la cantidad elegida, un esquema de 20 y presupuesto suficiente en una sola llamada', async () => {
  for (const provider of ['gemini', 'groq', 'openai']) {
    let captured, calls = 0;
    const ai = createAI({ provider, fallbackProvider: '', key: 'test-only', transport: async (_url, init) => {
      captured = JSON.parse(init.body); calls++;
      const value = JSON.stringify(result(20));
      return Response.json(provider === 'gemini' ? { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: value }] } }] } : provider === 'groq' ? { choices: [{ finish_reason: 'stop', message: { content: value } }] } : { status: 'completed', output: [{ content: [{ type: 'output_text', text: value }] }] });
    } });
    const game = await ai.generate(sources, 'Examen', { questionCount: 20 });
    assert.equal(game.questions.length, 20); assert.equal(game.requestedCount, 20); assert.equal(calls, 1);
    const instructions = captured.systemInstruction?.parts[0].text || captured.messages?.[0].content || captured.instructions;
    assert.match(instructions, /Prepara 20 preguntas/);
    const schema = captured.generationConfig?.responseJsonSchema || captured.response_format?.json_schema.schema || captured.text.format.schema;
    assert.equal(schema.properties.questions.maxItems, 20);
    assert.equal(captured.generationConfig?.maxOutputTokens || captured.max_completion_tokens || captured.max_output_tokens, outputBudget(20));
  }
});
test('el respaldo de cuota conserva la cantidad solicitada', async () => {
  let actual;
  const ai = withQuotaFallback({ enabled: true, provider: 'gemini', generate: async () => { throw Object.assign(new Error('Sin cuota'), { code: 'ai_daily_quota_exhausted' }); } }, { enabled: true, provider: 'groq', generate: async (_s, _t, context) => { actual = context.questionCount; return {}; } });
  await ai.generate(sources, 'Examen', { questionCount: 20 }); assert.equal(actual, 20);
});
