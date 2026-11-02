import { request, identify, currentName } from './connection.js';
import { QUIZZES } from './data.js';

const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function createOnline({ open, active, onFinish }) {
  let code = '', poll, room, signature = '', busy = false, offset = 0;
  try { const saved = localStorage.getItem('winy.room'); if (/^[A-Z0-9]{6}$/.test(saved)) code = saved; } catch {}
  const remember = value => { try { value ? localStorage.setItem('winy.room', value) : localStorage.removeItem('winy.room'); } catch {} };
  function setup(join) {
    clearTimeout(poll); signature = '';
    open(join ? 'Entrar a una sala' : 'Crea tu batalla', `<p class="muted">Cada uno juega desde su teléfono. Responden las mismas preguntas y el servidor lleva la puntuación.</p><form id="online-form" data-kind="${join ? 'join' : 'create'}"><label for="online-name">Tu nombre</label><input id="online-name" name="nickname" required maxlength="28" value="${escape(currentName())}" autocomplete="nickname" placeholder="¿Cómo te llamas?">${join ? '<label for="room-code">Código de sala</label><input id="room-code" name="code" required pattern="[A-Za-z0-9]{6}" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="Ej. A1B2C3">' : `<label for="online-topic">Tema</label><select id="online-topic" name="topic">${Object.values(QUIZZES).map(q => `<option value="${q.id}">${escape(q.title)}</option>`).join('')}</select>`}<p id="online-error" class="form-error" role="alert"></p><button type="submit" class="primary">${join ? 'Entrar con mi código' : 'Crear sala'}</button></form><p class="notice">Necesitan conexión a Internet durante la partida. El código abre una sala para dos personas.</p>`);
  }
  function show(next) {
    if (!active()) return;
    if (room?.code === next.code && room.version > next.version) return;
    room = next; offset = next.serverTime - Date.now();
    const serialized = JSON.stringify({ ...next, serverTime: 0, version: 0 });
    if (serialized === signature) { updateClock(); return; }
    signature = serialized;
    const scores = `<div class="scoreboard">${next.players.map(p => `<div><strong>${escape(p.name)}${p.me ? ' · Tú' : ''}</strong><span>${p.score} puntos</span><small>${p.answered && next.phase === 'asking' ? 'Respuesta enviada' : ''}</small></div>`).join('')}</div>`;
    if (next.phase === 'waiting') {
      open('Tu sala está lista', `<p class="muted center">Comparte este código con tu amigo.</p><p class="room-code">${next.code}</p><div class="room-players">${next.players.map(p => `<p>✓ ${escape(p.name)}${p.me ? ' · Tú' : ''}</p>`).join('')}${next.players.length < 2 ? '<p class="muted">Esperando al segundo jugador…</p>' : ''}</div>${next.host ? `<button class="primary" data-action="online-start" ${next.players.length < 2 ? 'disabled' : ''}>Empezar partida</button>` : '<p class="notice">La persona que creó la sala empezará la partida.</p>'}<p class="small muted center" id="online-status">Sala conectada · ${next.players.length} de 2</p>`);
    } else if (next.phase === 'finished') {
      const [a, b] = next.players, winner = a.score === b.score ? '¡Empate!' : `¡Ganó ${a.score > b.score ? a.name : b.name}!`;
      onFinish(next);
      open('Batalla terminada', `<div class="result"><span class="result-star">✦</span><h3>${escape(winner)}</h3>${scores}<p>¡Gracias por aprender juntos!</p><button class="primary" data-action="online-new">Crear otra sala</button><button class="secondary full" data-action="close">Volver a Winy</button></div>`);
      code = ''; remember(''); clearTimeout(poll); return;
    } else {
      const reveal = next.phase === 'reveal';
      open('Batalla en línea', `<div class="quiz-meta"><span class="tag">Ronda ${next.round + 1} de ${next.total}</span><span id="online-clock" role="timer"></span></div>${scores}<h3 class="question">${escape(next.question.prompt)}</h3><div class="answers">${next.question.options.map((o, i) => `<button class="answer ${reveal && next.feedback.answer === i ? 'correct' : ''} ${reveal && next.feedback.selected === i && next.feedback.answer !== i ? 'incorrect' : ''}" data-action="online-answer" data-answer="${i}" ${reveal || next.answered ? 'disabled' : ''}><span>${'ABC'[i]}</span>${escape(o)}</button>`).join('')}</div>${reveal ? `<div class="feedback"><strong>${next.feedback.selected === next.feedback.answer ? '¡Así es!' : 'Seguimos aprendiendo'}</strong><p>${escape(next.feedback.explanation)}</p></div><p class="small muted center">La siguiente ronda empieza en unos segundos.</p>` : `<p class="small muted center">${next.answered ? 'Tu respuesta está enviada. Esperamos a tu amigo.' : 'Elige tu respuesta antes de que termine el tiempo.'}</p>`}<p id="online-status" class="small muted center">Conectado con la sala ${next.code}</p>`);
    }
    updateClock();
  }
  function updateClock() {
    const el = document.querySelector('#online-clock');
    if (el && room?.deadline) el.textContent = Math.max(0, Math.ceil((room.deadline - Date.now() - offset) / 1000)) + ' s';
  }
  async function refresh() {
    if (!code || !active()) return;
    const current = code;
    try { const next = await request(`/rooms/${current}`); if (code === current && active()) show(next); }
    catch (error) { const el = document.querySelector('#online-status'); if (el && code === current) el.textContent = error.message; }
    if (code === current && active()) poll = setTimeout(refresh, 1000);
  }
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.id !== 'online-form') return;
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    try {
      const fd = new FormData(form); await identify(fd.get('nickname').trim());
      const join = form.dataset.kind === 'join'; const inputCode = String(fd.get('code') || '').toUpperCase();
      const next = await request(join ? `/rooms/${inputCode}/join` : '/rooms', { method: 'POST', data: join ? {} : { topic: fd.get('topic') } });
      if (!form.isConnected || !active()) return;
      code = next.code; remember(code); signature = ''; show(next); clearTimeout(poll); poll = setTimeout(refresh, 1000);
    } catch (error) { if (form.isConnected) { form.querySelector('#online-error').textContent = error.message; button.disabled = false; } }
  });
  document.addEventListener('click', async event => {
    const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
    const action = el.dataset.action;
    if (action === 'online-create' || action === 'online-new') setup(false);
    else if (action === 'online-join') setup(true);
    else if (action === 'online-resume') { signature = ''; open('Conectando con tu sala', '<p id="online-status" class="muted">Recuperando la partida…</p>'); refresh(); }
    else if (action === 'online-start' || action === 'online-answer') {
      if (busy || !code) return; busy = true;
      try { const next = await request(`/rooms/${code}/${action === 'online-start' ? 'start' : 'answer'}`, { method: 'POST', data: action === 'online-start' ? {} : { round: room.round, answer: Number(el.dataset.answer) } }); show(next); }
      catch (error) { const status = document.querySelector('#online-status'); if (status) status.textContent = error.message; }
      finally { busy = false; }
    }
  });
  return { pending: () => Boolean(code) };
}
