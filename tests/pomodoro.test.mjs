import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocus, restoreFocus, remainingFocus, toggleFocus, advanceFocus, restoreStudySessions } from '../web/core/pomodoro.js';
import { restoreState } from '../web/core/state.js';

test('Pomodoro pausa, persiste y continúa sin perder el tiempo restante', () => {
  let f = createFocus(900, { goal: 'Explicar dos causas', gameId: 'clase' });
  toggleFocus(f, 1000); assert.equal(f.endsAt, 901000);
  toggleFocus(f, 31000); assert.equal(f.remaining, 870); assert.equal(f.endsAt, 0);
  f = restoreFocus(JSON.parse(JSON.stringify(f)));
  toggleFocus(f, 50000); assert.equal(remainingFocus(f, 51000), 869);
  assert.equal(advanceFocus(f, 919999), null);
  const event = advanceFocus(f, 920000);
  assert.equal(event.session.minutes, 15); assert.equal(event.session.goal, 'Explicar dos causas'); assert.equal(event.session.gameId, 'clase');
  assert.equal(f.phase, 'shortBreak'); assert.equal(f.remaining, 300); assert.equal(f.endsAt, 0);
  assert.equal(advanceFocus(f, 999999999), null, 'No se completan descansos ni bloques automáticamente al estar cerrada');
});
test('cada cuatro bloques se ofrece descanso largo y cada fase comienza por decisión del estudiante', () => {
  const f = createFocus(1500); let now = 0;
  for (let block = 1; block <= 4; block++) {
    toggleFocus(f, now); now = f.endsAt;
    assert.equal(advanceFocus(f, now).type, 'study'); assert.equal(f.completed, block);
    assert.equal(f.duration, block === 4 ? 900 : 300); assert.equal(f.phase, block === 4 ? 'longBreak' : 'shortBreak');
    assert.equal(f.endsAt, 0); toggleFocus(f, now); now = f.endsAt;
    assert.equal(advanceFocus(f, now).type, 'break'); assert.equal(f.phase, 'focus'); assert.equal(f.remaining, 1500); assert.equal(f.needsReview, true);
  }
});
test('la demo de 30 segundos no registra una sesión de estudio ni aumenta el ciclo', () => {
  const f = createFocus(30); toggleFocus(f, 1000);
  assert.deepEqual(advanceFocus(f, 31000), { type: 'demo' });
  assert.equal(f.completed, 0); assert.equal(f.remaining, 0); assert.equal(advanceFocus(f, 32000), null);
});
test('se migran temporizadores antiguos, se recupera una fase vencida una sola vez y se limitan los registros', () => {
  assert.equal(restoreFocus({ duration: 300, remaining: 123, endsAt: 0 }).focusDuration, 300);
  assert.equal(restoreFocus({ duration: 1500, remaining: -1, endsAt: 0 }), null);
  assert.equal(restoreFocus({ duration: 10, remaining: 1, endsAt: 0 }), null);
  const f = createFocus(900); toggleFocus(f, 1000);
  const state = restoreState({ focus: f }); const event = advanceFocus(state.focus, 10000000);
  assert.equal(event.type, 'study'); assert.equal(advanceFocus(state.focus, 10000001), null);
  const sessions = restoreStudySessions(Array.from({ length: 70 }, (_, i) => ({ id: `s${i}`, endedAt: i, minutes: 25, goal: 'x'.repeat(200), outcome: 'bad' })));
  assert.equal(sessions.length, 60); assert.equal(sessions[0].id, 's10'); assert.equal(sessions[0].goal.length, 160); assert.equal(sessions[0].outcome, 'pending');
});
