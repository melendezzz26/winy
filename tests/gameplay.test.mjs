import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, completeDestination } from '../web/core/gameplay.js';
import { initialState, restoreState, finishQuiz } from '../web/core/state.js';
import { DESTINATIONS } from '../web/core/data.js';

test('un intento fallido se puede mejorar y ganar un sello que sobrevive a la recarga', () => {
  let state = initialState();
  finishQuiz(state, MISSIONS.lima.id, 1, 3, '2026-11-02');
  assert.deepEqual(completeDestination(state, 'lima', 1, 3, 1000), { earned: false, required: 2 });
  assert.deepEqual(state.passport, {});
  state = restoreState(JSON.stringify(state));
  assert.deepEqual(finishQuiz(state, MISSIONS.lima.id, 2, 3, '2026-11-02'), { xp: 10, coins: 5, claimed: false });
  assert.equal(completeDestination(state, 'lima', 2, 3, 2000).earned, true);
  const saved = restoreState(JSON.stringify(state));
  assert.deepEqual(saved.passport.lima, { earnedAt: 2000, score: 2, total: 3 });
  assert.deepEqual(completeDestination(saved, 'lima', 3, 3, 3000), { earned: false, already: true, required: 2 });
  assert.equal(saved.passport.lima.earnedAt, 2000);
  assert.equal(saved.xp, 20); assert.equal(saved.coins, 100);
});

test('cada destino tiene un reto propio y el pasaporte solo acepta resultados válidos', () => {
  const state = initialState();
  for (const id of ['desconocido', '__proto__']) assert.equal(completeDestination(state, id, 3, 3).earned, false);
  for (const [score, total] of [[4, 3], [-1, 3], [2.5, 3], [2, 2]]) assert.equal(completeDestination(state, 'lima', score, total).earned, false);
  assert.deepEqual(state.passport, {});
  const prompts = new Set();
  for (const destination of DESTINATIONS) {
    const game = MISSIONS[destination.id];
    for (const q of game.questions) { assert.ok(!prompts.has(q.prompt)); prompts.add(q.prompt); }
    assert.equal(completeDestination(state, destination.id, 3, game.questions.length, 1000).earned, true);
  }
  assert.equal(Object.keys(restoreState(JSON.stringify(state)).passport).length, 6);
  assert.deepEqual(restoreState({ passport: { lima: { earnedAt: 1000, score: 1, total: 3 }, fake: { earnedAt: 1000, score: 3, total: 3 } } }).passport, {});
});
