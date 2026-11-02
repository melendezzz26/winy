import test from 'node:test';
import assert from 'node:assert/strict';
import { createCitationVerifier, analysisSources } from '../server/citations.mjs';
import { validateAnalysis } from '../server/ai.mjs';
test('las citas por índice recuperan el texto original sin pedir que la IA lo transcriba', () => {
  const sources = [{ name: 'Clase', text: 'El Partido Comunista del Perú utiliza la denominación «Sendero Luminoso».[7] La referencia bibliográfica aparece dentro del texto original.' }];
  const payload = analysisSources(sources), verify = createCitationVerifier(sources);
  assert.equal(payload[0].passages[0].text, verify({ source_id: 0, quote_id: 0 }).evidence);
  assert.ok(sources[0].text.includes(verify({ source_id: 0, quote_id: 1 }).evidence));
  assert.throws(() => verify({ source_id: 0, quote_id: 500 }), /verificar una cita/);
});
test('la compatibilidad de citas literales tolera formato y devuelve el pasaje real', () => {
  const text = 'La “fotosíntesis”[7] transforma energía luminosa en energía química. La ﬁbra del tallo tiene una función de sostén.';
  const verify = createCitationVerifier([{ name: 'Página 1', text }]);
  assert.equal(verify({ source_id: 0, quote: 'La "fotosíntesis" transforma energía luminosa en energía química.' }).evidence, text.split('. ')[0] + '.');
  assert.equal(verify({ source_id: 0, quote: 'La fibra del tallo tiene una función de sostén.' }).evidence, text.split('. ')[1]);
  assert.throws(() => verify({ source_id: 0, quote: 'Las plantas fabrican piedras y minerales nuevos.' }), /verificar una cita/);
});
test('una cita inválida no borra las preguntas respaldadas y una respuesta sin respaldo suficiente se rechaza', () => {
  const sources = [{ name: 'Clase', text: 'El río Rímac cruza la ciudad de Lima. Lima se encuentra en la costa central del Perú. El océano Pacífico bordea la costa peruana.' }];
  const q = (prompt, quote_id) => ({ prompt, options: ['Una', 'Dos', 'Tres'], answer: 0, explanation: 'Explicación de la fuente.', source_id: 0, quote_id });
  const raw = { title: 'Lima', summary: 'La ciudad y la costa.', key_points: [{ idea: 'La costa', source_id: 0, quote_id: 1 } ,{ idea: 'El río', source_id: 0, quote_id: 0 }], questions: [q('¿Qué río cruza Lima?', 0), q('¿Dónde se encuentra Lima?', 1), q('Una pregunta sin evidencia', 99)] };
  const game = validateAnalysis(raw, sources); assert.equal(game.questions.length, 2); assert.equal(game.quality.omittedQuestions, 1);
  raw.questions = [q('Una válida', 0), q('Una inventada', 99)]; assert.throws(() => validateAnalysis(raw, sources), /verificar una cita/);
});
