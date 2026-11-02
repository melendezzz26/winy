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
