import { request, identify, currentName } from './connection.js';
import { QUIZZES } from './data.js';

const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function createOnline({ open, active, onFinish, getGames = () => [], onSave = () => {} }) {
  let code = '', poll, room, signature = '', busy = false, offset = 0, draft = { code: '', round: -1, value: '' };
  try { const saved = localStorage.getItem('winy.room'); if (/^[A-Z0-9]{6}$/.test(saved)) code = saved; } catch {}
  const remember = value => { try { value ? localStorage.setItem('winy.room', value) : localStorage.removeItem('winy.room'); } catch {} };
  const status = message => { const el = document.querySelector('#online-status'); if (el) el.textContent = message; };
  function setup(join, selectedId) {
    clearTimeout(poll); signature = '';
    const games = getGames(), selected = selectedId || games.at(-1)?.id;
    open(join ? 'Entrar a una sala' : 'Mi examen con un compañero', `<p class="muted">Cada uno juega desde su teléfono. Responden las mismas preguntas y revisan juntos lo que falta aprender.</p><form id="online-form" data-kind="${join ? 'join' : 'create'}"><label for="online-name">Tu nombre</label><input id="online-name" name="nickname" required maxlength="28" value="${escape(currentName())}" autocomplete="nickname" placeholder="¿Cómo te llamas?">${join ? '<label for="room-code">Código de sala</label><input id="room-code" name="code" required pattern="[A-Za-z0-9]{6}" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="Ej. A1B2C3">' : `<label for="online-topic">¿Qué van a estudiar?</label><select id="online-topic" name="topic">${games.length ? `<optgroup label="Mis apuntes y exámenes">${games.map(q => `<option value="saved:${escape(q.id)}" ${q.id === selected ? 'selected' : ''}>${escape(q.title)} · ${q.questions.length} preguntas</option>`).join('')}</optgroup>` : ''}<optgroup label="Retos de Winy">${Object.values(QUIZZES).map(q => `<option value="${q.id}">${escape(q.title)}</option>`).join('')}</optgroup></select>${!games.length ? '<p class="notice">Para jugar tu propio examen, prepara primero un repaso en Estudiar → Crear juego con mis archivos.</p>' : ''}<label for="online-rounds">Cantidad de preguntas</label><select id="online-rounds" name="rounds"><option value="20">Todas las disponibles · hasta 20</option><option value="10">Hasta 10</option><option value="5">Hasta 5</option></select><label for="online-seconds">Tiempo para responder</label><select id="online-seconds" name="seconds"><option value="60" selected>60 segundos por pregunta</option><option value="90">90 segundos · más tiempo para pensar</option><option value="30">30 segundos · reto rápido</option></select><p class="notice">Al compartir tu repaso, tu compañero verá las preguntas y sus citas. El archivo completo no se comparte. En exámenes, ambos eligen cuándo continuar después de leer la explicación.</p>`}<p id="online-error" class="form-error" role="alert"></p><button type="submit" class="primary">${join ? 'Entrar con mi código' : 'Crear sala con este tema'}</button></form><p class="notice">Necesitan conexión a Internet. El código permite entrar a otra persona; compártelo con tu compañero.</p>`);
    const dialog = document.querySelector('#dialog'); if (dialog) dialog.scrollTop = 0;
  }
  function show(next) {
    if (!active()) return;
    if (room?.code === next.code && room.version > next.version) return;
    const samePhase = room?.code === next.code && room.round === next.round && room.phase === next.phase;
    const scroll = samePhase ? document.querySelector('#dialog')?.scrollTop || 0 : 0;
    room = next; offset = next.serverTime - Date.now();
    const serialized = JSON.stringify({ ...next, serverTime: 0, version: 0 });
    if (serialized === signature) { updateClock(); return; }
    signature = serialized;
    const scores = `<div class="scoreboard">${next.players.map(p => `<div><strong>${escape(p.name)}${p.me ? ' · Tú' : ''}</strong><span>${p.score} puntos</span><small>${p.answered && next.phase === 'asking' ? 'Respuesta enviada' : ''}</small></div>`).join('')}</div>`;
    if (next.phase === 'waiting') {
      open('Tu sala está lista', `<h3 class="room-title">${escape(next.title)}</h3><p class="small muted center">${next.total} preguntas · ${next.roundSeconds || 30} s para responder</p><p class="muted center">Comparte este código con tu compañero.</p><p class="room-code">${next.code}</p><button class="secondary full" data-action="online-copy">Copiar o compartir código</button><div class="room-players">${next.players.map(p => `<p>✓ ${escape(p.name)}${p.me ? ' · Tú' : ''}</p>`).join('')}${next.players.length < 2 ? '<p class="muted">Esperando al segundo jugador…</p>' : ''}</div>${next.host ? `<button class="primary" data-action="online-start" ${next.players.length < 2 ? 'disabled' : ''}>Empezar partida</button>` : '<p class="notice">La persona que creó la sala empezará la partida.</p>'}<p class="small muted center" id="online-status">Sala conectada · ${next.players.length} de 2</p>`);
    } else if (next.phase === 'finished') {
      const [a, b] = next.players, winner = a.score === b.score ? '¡Empate!' : `¡Ganó ${a.score > b.score ? a.name : b.name}!`;
      onFinish(next);
      open('Repaso compartido terminado', `<div class="result"><span class="result-star">✦</span><h3>${escape(winner)}</h3><p>${escape(next.title)} · ${next.total} preguntas</p>${scores}<p>¿Qué idea podrían explicarse mejor ahora?</p>${next.game ? '<button class="primary" data-action="online-save">Guardar preguntas y repasar mis errores</button><p class="small muted">Quedará en Estudiar, con tus errores pendientes y las citas del repaso compartido.</p>' : ''}<button class="secondary full" data-action="online-new">Crear otra sala</button><button class="secondary full" data-action="close">Volver a Winy</button></div>`);
      const dialog = document.querySelector('#dialog'); if (dialog) dialog.scrollTop = 0;
      code = ''; remember(''); clearTimeout(poll); return;
    } else {
      const reveal = next.phase === 'reveal';
      const cloze = next.question.type === 'cloze', value = draft.code === next.code && draft.round === next.round ? draft.value : '', focused = document.activeElement?.id === 'online-word';
      open('Estudiamos juntos', `<div class="quiz-meta"><span class="tag">Ronda ${next.round + 1} de ${next.total}</span><span id="online-clock" role="timer"></span></div>${scores}<h3 class="question">${escape(next.question.prompt)}</h3>${cloze ? `<form id="online-answer-form"><label for="online-word">Completa la palabra de los apuntes</label><input id="online-word" name="answer" required maxlength="100" autocomplete="off" value="${escape(value)}" ${reveal || next.answered ? 'disabled' : ''}><button class="primary" type="submit" ${reveal || next.answered ? 'disabled' : ''}>Enviar respuesta</button></form>` : `<div class="answers">${next.question.options.map((o, i) => `<button class="answer ${reveal && next.feedback.answer === i ? 'correct' : ''} ${reveal && next.feedback.selected === i && next.feedback.answer !== i ? 'incorrect' : ''}" data-action="online-answer" data-answer="${i}" ${reveal || next.answered ? 'disabled' : ''}><span>${'ABC'[i]}</span>${escape(o)}</button>`).join('')}</div>`}${reveal ? `<div class="feedback"><strong>${next.feedback.correct ?? (next.feedback.selected === next.feedback.answer) ? '¡Así es!' : 'Seguimos aprendiendo'}</strong>${cloze ? `<p>La palabra es <b>${escape(next.feedback.expected)}</b>.</p>` : ''}<p>${escape(next.feedback.explanation)}</p>${next.feedback.evidence ? `<blockquote>${escape(next.feedback.evidence)}<cite>${escape(next.feedback.source)}</cite></blockquote>` : ''}</div>${next.custom ? `<p class="notice">Explíquense por qué esta respuesta encaja con los apuntes. Continúan cuando ambos estén listos.</p><button class="primary" data-action="online-next" ${next.ready ? 'disabled' : ''}>${next.ready ? 'Esperando a mi compañero…' : 'Ya revisé la explicación'}</button>` : '<p class="small muted center">La siguiente ronda empieza en unos segundos.</p>'}` : `<p class="small muted center">${next.answered ? 'Tu respuesta está enviada. Esperamos a tu compañero.' : 'Responde antes de que termine el tiempo.'}</p>`}<p id="online-status" class="small muted center">Conectado con la sala ${next.code}</p>`);
      if (focused && !reveal && !next.answered) document.querySelector('#online-word')?.focus({ preventScroll: true });
    }
    const dialog = document.querySelector('#dialog'); if (dialog) dialog.scrollTop = scroll;
    if (!samePhase && next.phase === 'reveal') document.querySelector('#dialog .feedback')?.scrollIntoView({ block: 'nearest' });
    updateClock();
  }
  function updateClock() {
    const el = document.querySelector('#online-clock');
    if (el) el.textContent = room?.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now() - offset) / 1000)) + ' s' : 'Revisar juntos';
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
    if (form.id === 'online-answer-form') { event.preventDefault(); await send('answer', new FormData(form).get('answer').trim()); return; }
    if (form.id !== 'online-form') return;
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    try {
      const fd = new FormData(form); await identify(fd.get('nickname').trim());
      const join = form.dataset.kind === 'join'; const inputCode = String(fd.get('code') || '').toUpperCase();
      const topic = String(fd.get('topic') || ''), game = topic.startsWith('saved:') ? getGames().find(g => g.id === topic.slice(6)) : null;
      if (!join && topic.startsWith('saved:') && !game) throw new Error('Ese repaso ya no está guardado. Elige otro tema.');
      const next = await request(join ? `/rooms/${inputCode}/join` : '/rooms', { method: 'POST', data: join ? {} : { ...(game ? { game: { title: game.title, questions: game.questions } } : { topic }), questionCount: Number(fd.get('rounds')), roundSeconds: Number(fd.get('seconds')) } });
      if (game && !next.custom) throw new Error('Las salas con tus apuntes necesitan una actualización del servicio de Winy. Tu repaso sigue guardado.');
      if (!form.isConnected || !active()) return;
      code = next.code; remember(code); signature = ''; show(next); clearTimeout(poll); poll = setTimeout(refresh, 1000);
    } catch (error) { if (form.isConnected) { form.querySelector('#online-error').textContent = error.message; button.disabled = false; } }
  });
  document.addEventListener('input', event => { if (event.target.id === 'online-word' && room) draft = { code: room.code, round: room.round, value: event.target.value }; });
  async function send(action, answer) {
    if (busy || !code || !active()) return; busy = true;
    try { const next = await request(`/rooms/${code}/${action}`, { method: 'POST', data: action === 'start' ? {} : { round: room.round, ...(action === 'answer' ? { answer } : {}) } }); show(next); }
    catch (error) { const status = document.querySelector('#online-status'); if (status) status.textContent = error.message; }
    finally { busy = false; }
  }
  document.addEventListener('click', async event => {
    const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
    const action = el.dataset.action;
    if (action === 'online-create' || action === 'online-new') setup(false, el.dataset.quiz);
    else if (action === 'online-join') setup(true);
    else if (action === 'online-resume') { signature = ''; open('Conectando con tu sala', '<p id="online-status" class="muted">Recuperando la partida…</p>'); refresh(); }
    else if (action === 'online-start' || action === 'online-answer' || action === 'online-next') await send(action.slice(7), Number(el.dataset.answer));
    else if (action === 'online-save' && active() && room?.phase === 'finished' && room.game) onSave(room.game, room.results);
    else if (action === 'online-copy' && room) {
      const message = `Winy · ${room.title}. Código: ${room.code}. Entra en Amigos → Tengo un código.`;
      try {
        if (window.WinyAndroid?.share) window.WinyAndroid.share(message);
        else if (navigator.share) await navigator.share({ title: 'Estudiemos juntos en Winy', text: message });
        else if (navigator.clipboard) { await navigator.clipboard.writeText(message); status('Código copiado. Envíalo a tu compañero.'); }
        else status('Tu código es ' + room.code + '. Puedes copiarlo de la pantalla.');
      } catch (error) { if (error.name !== 'AbortError') status('Puedes compartir el código que aparece en pantalla.'); }
    }
  });
  return { pending: () => Boolean(code) };
}
