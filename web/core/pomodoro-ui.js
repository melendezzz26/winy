import { createFocus, remainingFocus, toggleFocus, advanceFocus, phaseLabel } from './pomodoro.js';
import { completeHabit, today } from './state.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
export function createPomodoro({ getState, save, render, open, active, dialog, toast, onReview }) {
  function show(gameId) {
    const s = getState(); s.focus ||= createFocus(); const f = s.focus;
    if (gameId && !f.endsAt && f.phase === 'focus') {
      const game = s.games.find(g => g.id === gameId);
      if (game) { f.gameId = game.id; f.goal = `Explicar las ideas de ${game.title}`.slice(0, 160); save(); }
    }
    const locked = Boolean(f.endsAt) || f.phase !== 'focus', last = s.studySessions.at(-1);
    open('Mi bloque de estudio', `<p class="small muted">Una meta concreta, una pausa y un repaso. Puedes pausar o parar cuando lo necesites.</p>
      <label for="focus-goal">Al terminar quiero poder…</label><input id="focus-goal" maxlength="160" placeholder="Ej. explicar dos causas sin mirar mis apuntes" value="${esc(f.goal)}" ${locked ? 'disabled' : ''}>
      <label for="focus-game">Material para practicar</label><select id="focus-game" ${locked ? 'disabled' : ''}><option value="">Estudio con mis apuntes fuera de Winy</option>${s.games.map(g => `<option value="${esc(g.id)}" ${f.gameId === g.id ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select>
      ${f.phase === 'focus' ? `<div class="timer-options" role="group" aria-label="Duración de estudio">${[[1500, '25 min'], [900, '15 min']].map(([seconds, label]) => `<button class="pill ${f.focusDuration === seconds ? 'active' : ''}" data-action="focus-duration" data-duration="${seconds}" aria-pressed="${f.focusDuration === seconds}" ${f.endsAt ? 'disabled' : ''}>${label}</button>`).join('')}</div><details class="timer-demo"><summary>Probar el temporizador</summary><button class="pill" data-action="focus-duration" data-duration="30" ${f.endsAt ? 'disabled' : ''}>Prueba · 30 s</button><p class="small muted">La prueba no registra estudio ni entrega recompensas.</p></details>` : ''}
      <div class="timer-circle"><span id="timer-time" role="timer" aria-label="Tiempo restante">${clock(remainingFocus(f))}</span><span id="timer-status"></span></div>
      <p class="timer-phase">${f.demo ? 'Prueba del temporizador' : `${phaseLabel(f.phase)} · ${f.completed} ${f.completed === 1 ? 'bloque completado' : 'bloques completados'}`}</p>
      <button class="primary" id="timer-toggle" data-action="focus-toggle">Empezar</button>
      ${f.phase !== 'focus' ? '<p class="notice">Aparta la vista de la pantalla, toma agua o muévete un poco. No hace falta seguir jugando durante el descanso.</p>' : '<p class="notice">Estudia una idea, cierra los apuntes y recuérdala con tus palabras. 25 minutos es una opción; puedes empezar con 15.</p>'}
      ${last?.outcome === 'pending' ? `<section class="goal-check"><h3>¿Cómo te fue con tu última meta?</h3><p>${esc(last.goal)}</p><div class="card-ratings"><button class="secondary full" data-action="focus-outcome" data-outcome="achieved">Pude explicarlo sin mirar</button><button class="secondary full" data-action="focus-outcome" data-outcome="partial">Necesito otro bloque</button></div><p class="small muted">Tu autoevaluación no cambia tus monedas.</p></section>` : ''}
      ${f.needsReview ? `<p class="notice">Antes de seguir, explica una idea sin mirar. Comprueba después lo que te faltó.</p>${f.gameId && s.games.some(g => g.id === f.gameId) ? '<button class="secondary full" data-action="focus-review">Repasar hasta 3 conceptos</button>' : ''}` : ''}
      <button class="secondary full" data-action="focus-reset">${f.phase === 'focus' ? 'Reiniciar este bloque' : 'Reiniciar este descanso'}</button>
      <p class="footnote">Estudio → descanso de 5 min. Cada 4 bloques: descanso de 15 min. Tú inicias cada fase. El reloj se recupera al abrir Winy; no hay alarma con la app cerrada. Una recompensa de enfoque por día.</p>`, 'focus');
    paint();
  }
  function capture() {
    if (!active()) return;
    const f = getState().focus, goal = dialog.querySelector('#focus-goal'), game = dialog.querySelector('#focus-game');
    if (goal && !goal.disabled) f.goal = goal.value.trim().slice(0, 160);
    if (game && !game.disabled) f.gameId = game.value;
  }
  function bar() {
    const f = getState().focus;
    if (!f || f.demo || (!f.endsAt && f.remaining === f.duration && !f.completed && !f.needsReview)) return '';
    return `<button class="pomodoro-bar" data-action="focus" aria-label="Abrir mi bloque de estudio"><span>◷ ${phaseLabel(f.phase)}</span><strong id="mini-timer">${clock(remainingFocus(f))}</strong><small>${f.endsAt ? 'En marcha' : 'En pausa · abrir'}</small></button>`;
  }
  function paint() {
    const f = getState().focus; if (!f) return;
    const time = document.querySelector('#mini-timer'); if (time) time.textContent = clock(remainingFocus(f));
    if (!active()) return;
    dialog.querySelector('#timer-time').textContent = clock(remainingFocus(f));
    dialog.querySelector('#timer-status').textContent = f.endsAt ? f.phase === 'focus' ? 'Una idea a la vez.' : 'Una pausa para recargar.' : 'En pausa. Tú eliges cuándo seguir.';
    dialog.querySelector('#timer-toggle').textContent = f.endsAt ? 'Pausar' : f.demo ? 'Empezar prueba' : f.phase === 'focus' ? 'Empezar estudio' : 'Empezar descanso';
  }
  function tick() {
    const s = getState(), event = advanceFocus(s.focus); if (event) {
      if (event.type === 'study') {
        if (!s.studySessions.some(x => x.id === event.session.id)) s.studySessions = [...s.studySessions, event.session].slice(-60);
        const rewarded = completeHabit(s, 'focus', today(new Date(event.session.endedAt)));
        toast(rewarded ? 'Bloque registrado. +20 XP. Toca descansar.' : 'Bloque registrado. Toca descansar.');
      } else toast(event.type === 'demo' ? 'Prueba terminada. Elige una meta para estudiar.' : 'Descanso terminado. Recuerda una idea antes de continuar.');
      save(); render(); if (active()) show();
    }
    paint();
  }
  function handle(action, el) {
    if (!action.startsWith('focus-')) return false;
    const s = getState(); s.focus ||= createFocus(); capture(); const f = s.focus;
    if (action === 'focus-duration' && !f.endsAt && f.phase === 'focus') {
      const duration = Number(el.dataset.duration); if (![30, 900, 1500].includes(duration)) return true;
      s.focus = { ...createFocus(duration, f), completed: f.completed };
    } else if (action === 'focus-reset') { f.endsAt = 0; f.remaining = f.duration; }
    else if (action === 'focus-toggle') {
      if (!f.endsAt && !f.demo && f.phase === 'focus' && !f.goal.trim()) { toast('Escribe una meta pequeña para este bloque.'); dialog.querySelector('#focus-goal')?.focus(); return true; }
      if (!f.endsAt && f.phase === 'focus') f.needsReview = false;
      toggleFocus(f);
    } else if (action === 'focus-outcome') {
      const session = s.studySessions.at(-1); if (session?.outcome === 'pending') session.outcome = el.dataset.outcome === 'achieved' ? 'achieved' : 'partial';
    } else if (action === 'focus-review') {
      const game = s.games.find(g => g.id === f.gameId); f.needsReview = false; save(); if (game) onReview(game); return true;
    }
    save(); render(); show(); return true;
  }
  return { show, tick, bar, handle, capture };
}
