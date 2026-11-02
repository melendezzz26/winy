import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, restoreState, level, completeHabit, finishQuiz, wear, today } from '../web/core/state.js';

test('un nuevo jugador comienza con 90 monedas y cuatro nombres', () => {
  const s = initialState(); assert.equal(s.coins, 90); assert.equal(s.onboarded, false); assert.equal(Object.keys(s.names).length, 4); assert.equal(level(s), 1);
});
test('restaurar un guardado corrupto recupera un estado válido', () => {
  assert.deepEqual(restoreState('{'), initialState());
  const s = restoreState({ coins: -5, xp: '100', pet: 'unknown', names: { cuy: '  Mi cuy  ' }, equipped: 'crown', owned: ['scarf', 'unknown'], games: [{ title: 'Juego dañado', questions: [null] }], habits: { '2026-11-01': true, '2026-11-02': ['food', 'food', 'bad'] } });
  assert.equal(s.coins, 90); assert.equal(s.pet, 'cuy'); assert.equal(s.names.cuy, 'Mi cuy'); assert.equal(s.equipped, 'natural'); assert.deepEqual(s.owned, ['natural', 'scarf']); assert.deepEqual(s.habits, { '2026-11-02': ['food'] });
});
test('cada hábito da una recompensa diaria y se renueva al día siguiente', () => {
  const s = initialState();
  assert.equal(completeHabit(s, 'food', '2026-11-01'), true); assert.equal(completeHabit(s, 'food', '2026-11-01'), false);
  assert.equal(completeHabit(s, 'food', '2026-11-02'), true); assert.equal(completeHabit(s, 'bad'), false);
  assert.equal(s.xp, 40); assert.equal(s.coins, 106);
});
test('la trivia suma recompensas una vez por juego y día y conserva el nivel', () => {
  const s = initialState();
  assert.deepEqual(finishQuiz(s, 'peru', 5, 5, '2026-11-01'), { xp: 50, coins: 25, claimed: false });
  assert.deepEqual(finishQuiz(s, 'peru', 5, 5, '2026-11-01'), { xp: 0, coins: 0, claimed: true });
  finishQuiz(s, 'peru', 5, 5, '2026-11-02'); assert.equal(level(s), 2); assert.equal(s.coins, 140);
  finishQuiz(s, 'bad', 9, 5); assert.equal(s.coins, 140);
});
test('mejorar la marca diaria paga solo la diferencia, también después de cero aciertos y de recargar', () => {
  let s = initialState();
  assert.deepEqual(finishQuiz(s, 'peru', 0, 5, '2026-11-01'), { xp: 0, coins: 0, claimed: false });
  s = restoreState(JSON.stringify(s));
  assert.deepEqual(finishQuiz(s, 'peru', 2, 5, '2026-11-01'), { xp: 20, coins: 10, claimed: false });
  assert.deepEqual(finishQuiz(s, 'peru', 1, 5, '2026-11-01'), { xp: 0, coins: 0, claimed: true });
  assert.deepEqual(finishQuiz(s, 'peru', 5, 5, '2026-11-01'), { xp: 30, coins: 15, claimed: false });
  assert.deepEqual(finishQuiz(s, 'peru', 5, 5, '2026-11-01'), { xp: 0, coins: 0, claimed: true });
  assert.equal(s.xp, 50); assert.equal(s.coins, 115);
  assert.deepEqual(finishQuiz(s, 'peru', 2, 5, '2026-11-02'), { xp: 20, coins: 10, claimed: false });
});
test('las recompensas de versiones anteriores conservan su pago al actualizar', () => {
  const s = restoreState({ xp: 40, coins: 110, rewards: { '2026-11-01:peru': true }, bestScores: { bad: 3, '2026-11-01:life': '2' } });
  assert.deepEqual(s.bestScores, {});
  assert.deepEqual(finishQuiz(s, 'peru', 5, 5, '2026-11-01'), { xp: 0, coins: 0, claimed: true });
  assert.equal(s.xp, 40); assert.equal(s.coins, 110);
  assert.equal(finishQuiz(s, 'peru', 5, 5, '2026-11-02').xp, 50);
});
test('comprar descuenta una sola vez, equipar no cobra y un saldo insuficiente no cambia nada', () => {
  const s = initialState(); assert.equal(wear(s, 'scarf').ok, true); assert.equal(s.coins, 55); assert.equal(s.equipped, 'scarf');
  wear(s, 'natural'); wear(s, 'scarf'); assert.equal(s.coins, 55);
  const before = structuredClone(s); assert.equal(wear(s, 'crown').ok, false); assert.deepEqual(s, before);
  assert.equal(wear(s, 'unknown').ok, false);
});
test('el cambio de compañero no pierde el progreso ni los accesorios al recargar', () => {
  const s = initialState(); completeHabit(s, 'focus'); wear(s, 'flower'); s.pet = 'llama'; s.onboarded = true;
  const saved = restoreState(JSON.stringify(s)); assert.deepEqual(saved, s);
});
test('la fecha diaria usa el calendario local', () => { assert.equal(today(new Date(2026, 0, 9, 12)), '2026-01-09'); });
