import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, restoreState } from '../web/core/state.js';
import { recordReview, reviewQuestions, questionKey, selectMaterial } from '../web/core/review.js';
const game = { id: 'notes-clase', title: 'Mi clase', questions: [{ prompt: 'La planta usa ________.', expected: 'luz', evidence: 'La planta usa luz para crecer.', source: 'Clase' }, { prompt: 'Las raíces absorben ________.', expected: 'agua', evidence: 'Las raíces absorben agua del suelo.', source: 'Clase' }] };
test('los errores se pueden repasar de inmediato y los aciertos vuelven con intervalos crecientes', () => {
  let state = initialState(); state.games = [game];
  recordReview(state, game, game.questions[0], false, 1000);
  recordReview(state, game, game.questions[1], true, 1000);
  state = restoreState(JSON.stringify(state));
  assert.deepEqual(reviewQuestions(state, game, { now: 1001 }), [game.questions[0]]);
  recordReview(state, game, game.questions[0], true, 2000);
  recordReview(state, game, game.questions[0], true, 3000);
  assert.equal(state.reviews[game.id][questionKey(game.questions[0])].dueAt, 86402000, 'La práctica inmediata no debe aplazar un repaso varios días');
  assert.equal(reviewQuestions(state, game, { errorsOnly: true }).length, 0);
  assert.equal(reviewQuestions(state, game, { now: 86402001 }).length, 2);
  recordReview(state, game, game.questions[0], true, 86402001);
  assert.equal(state.reviews[game.id][questionKey(game.questions[0])].dueAt, 86402001 + 3 * 86400000);
  assert.equal(state.xp, 0); assert.equal(state.coins, 90, 'Recordar o fallar no debe generar premios repetibles');
});
test('la lectura rápida distribuye extractos literales y el modo completo no trunca contenido en silencio', () => {
  const sources = Array.from({ length: 40 }, (_, index) => ({ name: 'Página ' + index, text: ('Inicio ' + index + ': explicación de la clase. ').repeat(100) }));
  const fast = selectMaterial(sources);
  assert.equal(fast.sampled, true); assert.ok(fast.selected <= 24000); assert.equal(fast.sources.length, 120);
  for (const source of fast.sources) { const original = sources.find(s => source.name.startsWith(s.name + ' ·')); assert.ok(original.text.includes(source.text)); }
  assert.throws(() => selectMaterial(sources, 'full'), /80.000/);
  const small = selectMaterial(sources.slice(0, 2), 'full'); assert.deepEqual(small.sources, sources.slice(0, 2).map(s => ({ ...s, text: s.text.trim() })));
});
