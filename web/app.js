import { PETS, ITEMS, QUIZZES, DESTINATIONS, FRIENDS } from './core/data.js';
import { STORAGE_KEY, restoreState, today, level, completeHabit, finishQuiz, wear } from './core/state.js';
import { makeStudyGame, checkStudyAnswer, readSources } from './core/study.js';
import { pet } from './core/pets.js';
import { peruMap } from './core/map.js';
import { serviceStatus, analyze, currentName } from './core/connection.js';
import { createOnline } from './core/online.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let state;
try { state = restoreState(localStorage.getItem(STORAGE_KEY)); } catch { state = restoreState(null); }
let service = { online: false, ai: false, provider: 'openai' };
let view = 'home', selectedPet = state.pet, destination = null, modal = null, quiz = null, toastTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const paths = {
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  study: '<path d="M12 5v16M12 5Q6 1 2 4v15q6-2 10 2 4-4 10-2V4q-5-3-10 1Z"/>',
  adventure: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/>',
  friends: '<circle cx="8" cy="7" r="3"/><path d="M2 21v-4a5 5 0 0 1 10 0v4M16 4a3 3 0 0 1 0 6m0 3a5 5 0 0 1 6 4v4"/>',
  style: '<path d="m8 3-6 4 3 5 3-2v12h8V10l3 2 3-5-6-4q-4 5-8 0Z"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  upload: '<path d="M12 16V2m-6 6 6-6 6 6M3 15v7h18v-7"/>',
  star: '<path d="m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
const button = (label, action, extra = '', cls = 'primary') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const petData = () => PETS.find(p => p.id === state.pet);
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('Le falta espacio al navegador. Tu avance se mantendrá solo durante esta sesión.'); }
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2500);
}
function scene(p = state.pet, item = state.equipped, message = '¿Qué descubrimos hoy?', dress = false) {
  return `<div class="scene"><svg class="landscape" viewBox="0 0 540 340" preserveAspectRatio="none" aria-hidden="true"><rect width="540" height="340" fill="#e1ecd6"/><circle cx="453" cy="72" r="55" fill="#edf0ce"/><circle cx="453" cy="72" r="40" fill="#fbebba"/><path d="M0 93q100 0 212 104L300 340H0Z" fill="#bccdac"/><path d="M540 115q-87-61-263 70L188 340h352Z" fill="#cdd9b7"/><path d="M0 251q263-48 540 0v89H0Z" fill="#e4d8af"/><path d="M0 251q263-48 540 0" fill="none" stroke="#d5c99e" stroke-width="2"/><ellipse cx="270" cy="290" rx="119" ry="23" fill="#d6c89d" stroke="#cabb8f" stroke-width="2"/><g stroke="#91a772" stroke-width="3"><path d="m44 292 17-49m-13 38 28-16m-24 6-12-15"/><g fill="#c9dc8d" stroke="none"><ellipse cx="41" cy="253" rx="5" ry="12" transform="rotate(-27 41 253)"/><ellipse cx="58" cy="249" rx="5" ry="12" transform="rotate(20 58 249)"/><ellipse cx="71" cy="264" rx="12" ry="5" transform="rotate(-25 71 264)"/><ellipse cx="61" cy="282" rx="12" ry="5"/></g></g><path d="m482 279 22 0-4 15h-14Z" fill="#b89977"/><path d="M493 279v-27m0 18-9-8m9 1 10-8" stroke="#879e65" stroke-width="2"/><g fill="#b9cf89"><ellipse cx="485" cy="260" rx="7" ry="3" transform="rotate(35 485 260)"/><ellipse cx="501" cy="256" rx="7" ry="3" transform="rotate(-30 501 256)"/><ellipse cx="492" cy="253" rx="3" ry="7"/></g></svg><span class="speech">${esc(message)}</span>${pet(p, item, 'scene-pet')}${dress ? button(icon('style'), 'nav', 'data-view="style" aria-label="Vestir a mi compañero"', 'dress-button') : ''}</div>`;
}
function header() { return `<header class="topbar"><button class="brand" data-action="nav" data-view="home" aria-label="Winy, ir al hogar"><img src="assets/logo.svg" alt=""><span>winy<span class="spark">✦</span></span></button><div class="stats"><span class="pill">✦ Nv. ${level(state)}</span><span class="pill coins" aria-label="${state.coins} monedas">🪙 ${state.coins}</span></div></header>`; }
function heading(eyebrow, title, subtitle) { return `<div class="page-heading"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="subtitle">${subtitle}</p></div>`; }
function nav() { return `<nav class="bottom-nav" aria-label="Navegación principal">${[['home', 'Hogar'], ['study', 'Estudiar'], ['adventure', 'Aventura'], ['friends', 'Amigos'], ['style', 'Estilo']].map(([id, label]) => `<button data-action="nav" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}><span>${icon(id)}</span>${label}</button>`).join('')}</nav>`; }
function choices(selected, modalChoice = false) { return `<div class="pet-grid" role="group" aria-label="Elige a tu compañero">${PETS.map(p => `<button type="button" class="pet-choice ${selected === p.id ? 'selected' : ''}" data-action="select-pet" data-pet="${p.id}" aria-pressed="${selected === p.id}" ${modalChoice ? 'data-modal-choice="true"' : ''}>${selected === p.id ? `<span class="selection-check">${icon('check')}</span>` : ''}${pet(p.id, 'natural')}<strong>${p.name}</strong><small>${p.tagline}</small></button>`).join('')}</div>`; }
function onboarding() {
  return `<main id="content" class="onboarding"><img class="welcome-logo" src="assets/logo.svg" alt="Winy"><p class="eyebrow">Tu pequeña gran aventura</p><h1>Todo empieza<br>con un compañero.</h1><p class="subtitle">Estudia, juega y descubre el Perú.<br>¿Quién va contigo?</p><form id="onboarding-form">${choices(selectedPet)}<label for="pet-name">¿Cómo se llamará tu compañero?</label><input id="pet-name" name="petName" required maxlength="28" value="${esc(state.names[selectedPet])}" autocomplete="off"><button class="primary" type="submit">¡Vamos a la aventura! ${icon('arrow')}</button></form><p class="welcome-note">Tu progreso queda guardado en este navegador.</p></main>`;
}
function home() {
  const done = state.habits[today()] || [];
  const habits = [
    ['food', '🥑', 'Dale color a tu plato', 'Descubre un alimento peruano · +20 XP'],
    ['focus', '📚', 'Un ratito de enfoque', 'Estudia sin distracciones · +20 XP'],
    ['move', '🌿', 'Una pausa para ti', 'Estírate y recarga energía · +20 XP']
  ];
  return `${heading('Pequeños hábitos, grandes logros', 'Tu aventura de hoy<span class="gold-dot">.</span>', 'Un ratito para ti. Un gran paso juntos.')}${scene(state.pet, state.equipped, '¿Qué descubrimos hoy?', true)}<div class="pet-info"><div><h2>${esc(state.names[state.pet])} <span class="seed">🌱</span></h2><p>${petData().kind} · Explorador nivel ${level(state)}</p></div>${button(`Cambiar ${icon('arrow')}`, 'change-pet', '', 'pill change')}</div><div class="xp-label"><span>Un poquito más, un nivel más</span><span>${state.xp % 100} / 100 XP</span></div><progress class="xp" value="${state.xp % 100}" max="100" aria-label="Progreso al siguiente nivel"></progress><button class="challenge" data-action="quiz" data-quiz="peru"><span class="challenge-icon">ϟ</span><span><strong>Tu reto de 2 minutos</strong><small>Conoce el Perú · juega y gana XP</small></span>${icon('arrow')}</button><div class="section-title"><h2>Tus pequeñas victorias</h2><span class="tag">${done.length} de 3</span></div><div class="habit-list">${habits.map(([id, emoji, title, desc]) => `<button class="habit card ${done.includes(id) ? 'completed' : ''}" data-action="habit" data-habit="${id}"><span class="tile-icon">${emoji}</span><span><strong>${title}</strong><small>${done.includes(id) ? '¡Un pequeño gran paso! · Completado hoy' : desc}</small></span><span class="habit-check" aria-label="${done.includes(id) ? 'Completado' : 'Pendiente'}">${done.includes(id) ? icon('check') : ''}</span></button>`).join('')}</div><p class="footnote">Cada pequeño paso cuenta. Mañana, una nueva aventura.</p>`;
}
function quizCard(q, custom = false) { return `<button class="card quiz-card" data-action="${custom ? 'review-game' : 'quiz'}" data-quiz="${esc(q.id)}"><span class="tile-icon">${esc(q.icon || '📚')}</span><span><strong>${esc(q.title)}</strong><small>${q.questions.length} preguntas · ${esc(q.category)}</small><span class="tag">Jugar + XP</span></span>${icon('arrow')}</button>`; }
function study() {
  return `${heading('Aprende a tu manera', 'De apuntes a aventura.', 'Tú pones el tema. Tu compañero va contigo.')}<section class="study-hero"><span class="tag">Tu rincón de estudio</span><h2>¿Qué quieres<br>descubrir hoy?</h2><p>Sube tus apuntes y conviértelos<br>en un juego para completar<br>palabras.</p>${pet(state.pet, state.equipped)}</section>${button(`${icon('upload')} Crear juego con mis archivos`, 'notes')}<div class="section-title"><h2>Listos para jugar</h2><span class="tag">Solo o en dúo</span></div><div class="quiz-list">${Object.values(QUIZZES).map(q => quizCard(q)).join('')}${state.games.map(q => quizCard(q, true)).join('')}</div><button class="focus-card" data-action="focus"><span class="tile-icon">◷</span><span><strong>Modo enfoque</strong><small>Una tarea pequeña. Un momento para ti.</small></span>${icon('arrow')}</button>`;
}
function map() { return peruMap(destination); }
function adventure() {
  return `${heading('Un país, muchas aventuras', 'El Perú te espera.', 'Toca un destino, acércate y empieza tu reto.')}<div class="destination-tabs" role="group" aria-label="Destinos">${DESTINATIONS.map(d => `<button class="pill ${destination?.id === d.id ? 'active' : ''}" data-action="destination" data-destination="${d.id}" aria-pressed="${destination?.id === d.id}">${d.icon} ${d.name}</button>`).join('')}</div>${map()}<p class="map-caption">Contorno de Natural Earth · Destinos situados con coordenadas geográficas.</p><section class="destination-card"><span class="tag">${destination ? destination.region : 'Elige tu destino'}</span><h2>${destination ? destination.icon + ' ' + destination.title : '¿Costa, Andes o Amazonía?'}</h2><p>${destination ? destination.description : 'Cada destino abre un reto de cultura, naturaleza o bienestar. Tu próxima aventura empieza con un toque.'}</p>${destination ? button(`Explorar ${destination.name} ${icon('arrow')}`, 'quiz', `data-quiz="${destination.quiz}"`) : ''}</section>`;
}
function friends() {
  const recent = (state.matches || []).slice(-5).reverse();
  return `${heading('Mejor en compañía', 'Tu pequeña tribu.', 'Un reto compartido, desde dos teléfonos.')}<section class="duo-hero"><span class="tag">En línea · 2 teléfonos</span><span class="duo-symbol" aria-hidden="true">⚔️</span><h2>Tu amigo y tú.<br>Una misma aventura.</h2><p>Crea una sala y comparte el código. Responden las mismas preguntas y el servidor cuenta los puntos.</p>${button('Crear sala', 'online-create')}${button('Tengo un código', 'online-join', '', 'secondary full')}${online.pending() ? button('Volver a mi partida', 'online-resume', '', 'secondary full') : ''}</section>${!service.online ? '<p class="notice">Las salas estarán disponibles al conectar el servicio en línea de Winy.</p>' : '<p class="footnote">Ambos necesitan Internet durante la partida.</p>'}<div class="section-title"><h2>Últimas partidas</h2></div>${recent.length ? recent.map(m => `<article class="card recent-match"><strong>${esc(m.opponent)}</strong><span>${m.mine} — ${m.theirs}</span><small>${new Date(m.played).toLocaleDateString('es-PE')}</small></article>`).join('') : '<p class="empty-state">Tu tribu empieza con una partida. Invita a alguien y aquí aparecerá su resultado.</p>'}<section class="local-duo"><h2>¿Están juntos?</h2><p>También pueden jugar por turnos en un mismo teléfono.</p>${button('Jugar en este teléfono', 'duo', '', 'secondary full')}</section>${button('Compartir Winy', 'share', '', 'secondary full')}`;
}
function style() {
  return `${heading('Muy tú, muy ' + esc(state.names[state.pet]), 'Pequeño gran estilo.', 'Gana monedas aprendiendo. Dale tu toque.')}${scene(state.pet, state.equipped, '¡Ese estilo me queda!')}<div class="section-title"><h2>Su nueva personalidad</h2><span class="pill coins">🪙 ${state.coins}</span></div><div class="item-grid">${ITEMS.map(i => `<button class="item ${state.equipped === i.id ? 'selected' : ''}" data-action="item" data-item="${i.id}" aria-pressed="${state.equipped === i.id}"><span class="item-icon" aria-hidden="true">${i.icon}</span><strong>${i.name}</strong><small>${state.equipped === i.id ? '✓ Llevando' : state.owned.includes(i.id) ? 'En tu colección' : '🪙 ' + i.price}</small></button>`).join('')}</div><p class="notice">Puedes cambiar entre tus cuatro compañeros conservando tu progreso y tus accesorios.</p>${button('Elegir otro compañero', 'change-pet', '', 'secondary full')}`;
}
function render() {
  app.classList.toggle('welcome', !state.onboarded);
  if (!state.onboarded) { app.innerHTML = onboarding(); return; }
  app.innerHTML = `${header()}<main id="content" class="page">${({ home, study, adventure, friends, style })[view]()}</main>${nav()}`;
}
function openModal(title, body, type = 'info') {
  modal = type;
  dialog.innerHTML = `<div class="modal-handle"></div><div class="modal-header"><h2 id="modal-title">${esc(title)}</h2>${button(icon('close'), 'close', 'aria-label="Cerrar ventana"', 'close-button')}</div><div class="modal-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
}
function closeModal() { dialog.close(); modal = null; }
dialog.addEventListener('close', () => { if (!dialog.open) modal = null; });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
});
function showPetPicker() {
  selectedPet = state.pet;
  renderPetPicker();
}
function renderPetPicker() {
  openModal('Tu compañero de aventuras', `<p class="subtitle">Cuatro amigos, una misma aventura. Tu progreso se conserva.</p><form id="pet-form">${choices(selectedPet, true)}<label for="change-name">¿Cómo se llamará tu compañero?</label><input id="change-name" name="petName" maxlength="28" required value="${esc(state.names[selectedPet])}"><button class="primary" type="submit">Seguir con mi compañero ${icon('check')}</button></form>`, 'pet');
}
function showNotes() {
  openModal('Tus apuntes, tu próximo reto', `<p class="small muted">Elige cómo estudiar y trae el contenido de tu clase.</p><form id="notes-form"><label for="study-mode">Tipo de estudio</label><select id="study-mode" name="mode"><option value="ai" ${service.ai ? 'selected' : 'disabled'}>Ideas clave y trivia con IA${service.ai ? '' : ' · pendiente de activar'}</option><option value="local" ${service.ai ? '' : 'selected'}>Completar palabras · sin conexión</option></select><label for="topic">¿Qué tema quieres estudiar?</label><input id="topic" name="topic" maxlength="100" placeholder="Ej. La fotosíntesis"><div class="upload-area">${icon('upload')}<strong>Trae tus archivos</strong><p>PDF con texto, Word (.docx), PowerPoint (.pptx), TXT o Markdown<br>Máximo 5 archivos · 8 MB por archivo</p><input id="files" type="file" accept=".pdf,.docx,.pptx,.txt,.md,.markdown" multiple aria-label="Elegir archivos de apuntes"></div><label for="notes">O pega un fragmento de tus apuntes</label><textarea id="notes" name="notes" rows="5" maxlength="80000" placeholder="Pega varios párrafos del tema que estás estudiando…"></textarea><p class="form-error" id="notes-error" role="alert"></p><button type="submit" class="primary">Crear mi juego ${icon('star')}</button></form><p class="notice">El modo IA envía el texto extraído al servicio de Winy y a ${service.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} para seleccionar ideas y crear la trivia. Cada cita se comprueba contra tus apuntes. El modo sin conexión procesa el texto aquí. Hasta 40 páginas de PDF y 80 diapositivas; los escaneos necesitan texto legible.</p>`, 'notes');
}
function showAnalysis(game) {
  openModal(game.title, `<span class="tag">Tus ideas clave</span><p class="analysis-summary">${esc(game.summary)}</p><div class="key-points">${(Array.isArray(game.keyPoints) ? game.keyPoints : []).map(p => `<article><h3>${esc(p.idea)}</h3><blockquote>${esc(p.evidence)}<cite>${esc(p.source)}</cite></blockquote></article>`).join('')}</div>${button('Jugar mi trivia', 'custom-quiz', `data-quiz="${esc(game.id)}"`)}`, 'analysis');
}
function startQuiz(game, players = null) {
  quiz = { game, questions: players ? game.questions.slice(0, 4) : game.questions, index: 0, score: 0, scores: [0, 0], players, answered: false, result: null };
  showQuestion();
}
function showQuestion() {
  const q = quiz.questions[quiz.index], custom = !!q.expected;
  openModal(quiz.players ? 'Trivia en dúo' : quiz.game.title, `<div class="quiz-meta"><span class="tag">${quiz.players ? 'Turno de ' + esc(quiz.players[quiz.index % 2]) : 'Reto ' + (quiz.index + 1)}</span><span>${quiz.index + 1} / ${quiz.questions.length}</span></div><progress class="xp" value="${quiz.index}" max="${quiz.questions.length}" aria-label="Preguntas completadas"></progress><h3 class="question">${esc(q.prompt)}</h3><p class="small muted">${custom ? 'Completa la palabra que falta en tus apuntes.' : 'Toca la respuesta que creas correcta.'}</p>${custom ? '<form id="answer-form"><label for="study-answer">Tu respuesta</label><input id="study-answer" name="answer" required maxlength="100" autocomplete="off"><button type="submit" class="primary">Comprobar</button></form>' : `<div class="answers">${q.options.map((o, i) => `<button class="answer" data-action="answer" data-answer="${i}"><span>${'ABC'[i]}</span>${esc(o)}</button>`).join('')}</div>`}<div id="feedback" aria-live="polite"></div>${quiz.players ? `<div class="duo-scores"><span>${esc(quiz.players[0])}: ${quiz.scores[0]}</span><span>${esc(quiz.players[1])}: ${quiz.scores[1]}</span></div>` : ''}`, 'quiz');
}
function answerQuiz(answer) {
  if (!quiz || quiz.answered || modal !== 'quiz') return;
  quiz.answered = true;
  const q = quiz.questions[quiz.index];
  const correct = q.expected ? checkStudyAnswer(answer, q.expected) : Number(answer) === q.answer;
  if (correct) { quiz.score++; quiz.scores[quiz.index % 2]++; }
  dialog.querySelectorAll('.answer').forEach((el, i) => {
    el.disabled = true;
    if (i === q.answer) el.classList.add('correct');
    else if (i === Number(answer)) el.classList.add('incorrect');
  });
  const answerForm = dialog.querySelector('#answer-form');
  if (answerForm) answerForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
  const feedback = document.querySelector('#feedback');
  feedback.innerHTML = `<div class="feedback ${correct ? 'success' : 'try-again'}"><strong>${correct ? '¡Así es! Un poquito más de sabiduría.' : '¡Seguimos aprendiendo!'}</strong>${q.expected ? `<p>La palabra es <b>${esc(q.expected)}</b>.</p><blockquote>${esc(q.evidence)}<cite>${esc(q.source)}</cite></blockquote>` : `<p>${esc(q.explanation)}</p>${q.evidence ? `<blockquote>${esc(q.evidence)}<cite>${esc(q.source)}</cite></blockquote>` : ''}`}</div>${button(quiz.index + 1 === quiz.questions.length ? 'Ver mi resultado' : quiz.players ? 'Pasar al siguiente jugador ' + icon('arrow') : 'Siguiente reto ' + icon('arrow'), 'next-question')}`;
  feedback.querySelector('button').focus();
  feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function endQuiz() {
  const rewardScore = quiz.players ? quiz.scores[0] : quiz.score;
  quiz.result = finishQuiz(state, (quiz.players ? 'duo-' : '') + quiz.game.id, rewardScore, quiz.questions.length);
  save(); render();
  let result = '¡Tu aventura sigue creciendo!';
  if (quiz.players) result = quiz.scores[0] === quiz.scores[1] ? '¡Un gran empate!' : `¡Ganó ${quiz.players[quiz.scores[0] > quiz.scores[1] ? 0 : 1]}!`;
  openModal('Pequeños pasos, grandes logros', `<div class="result"><span class="result-star" aria-hidden="true">✦</span><h3>${esc(result)}</h3><p>${quiz.score} de ${quiz.questions.length} respuestas correctas</p>${quiz.players ? `<div class="scoreboard">${quiz.players.map((p, i) => `<div><strong>${esc(p)}</strong><span>${quiz.scores[i]} puntos</span></div>`).join('')}</div>` : ''}<div class="reward-pills"><span class="pill">+${quiz.result.xp} XP</span><span class="pill coins">🪙 +${quiz.result.coins}</span></div><p class="small muted">${quiz.result.claimed ? 'Ya recibiste la recompensa de este juego hoy. Puedes seguir practicando.' : quiz.players ? 'Las recompensas de tu jugador se guardan en este dispositivo.' : '¡Lo que aprendes hoy te acompaña mañana!'}</p>${button('Seguir mi aventura', 'close')}${button('Volver a jugar', 'replay', '', 'secondary full')}</div>`, 'result');
}
function showDuo() {
  openModal('Una partida entre amigos', `<p class="muted">Jueguen por turnos en este teléfono. Cada pregunta cambia de jugador.</p><form id="duo-form"><label for="player1">Jugador 1</label><input id="player1" name="player1" maxlength="28" required value="Tú"><label for="player2">Jugador 2</label><input id="player2" name="player2" maxlength="28" required placeholder="Nombre de tu amigo"><label for="duo-topic">Tema</label><select id="duo-topic" name="quiz">${Object.values(QUIZZES).map(q => `<option value="${q.id}">${q.title}</option>`).join('')}</select><button class="primary" type="submit">¡Que empiece el reto!</button></form><p class="notice">Partida local. No requiere que tu amigo tenga una cuenta. Son 4 preguntas, dos por persona.</p>`, 'duo');
}
function showVisit(i) {
  const f = FRIENDS[i];
  if (!f) return;
  openModal('Visitando a ' + f.name, `${scene(f.pet, f.accessory)}<div class="visit-info"><h3>${f.name} & ${f.petName}</h3><p class="muted">Mi plan: aprender algo nuevo cada día ⛰️</p><span class="pill">✦ Nivel ${f.level} · Perfil de ejemplo</span></div>${button(state.visited.includes(f.name) ? '✓ Ya está en mi tribu' : '+ Añadir a mi tribu', 'add-friend', `data-friend="${i}" ${state.visited.includes(f.name) ? 'disabled' : ''}`)}${button('Jugar con alguien en este teléfono', 'duo', '', 'secondary full')}`, 'visit');
}
function showItem(id) {
  const i = ITEMS.find(i => i.id === id); if (!i) return;
  if (state.owned.includes(id)) { wear(state, id); save(); render(); toast('¡Ese look es muy tú!'); return; }
  const affordable = state.coins >= i.price;
  openModal('¿Un nuevo look?', `<div class="item-preview"><span class="item-icon" aria-hidden="true">${i.icon}</span><h3>${i.name}</h3><p class="muted">Cuesta ${i.price} monedas. Tienes ${state.coins}.</p>${button(affordable ? `Conseguir por 🪙 ${i.price}` : `Te faltan ${i.price - state.coins} monedas`, 'buy', `data-item="${id}" ${affordable ? '' : 'disabled'}`)}${!affordable ? '<p class="small muted">Juega una trivia o completa tus hábitos para ganar monedas.</p>' : ''}</div>`, 'item');
}
function showHabit(id) {
  if ((state.habits[today()] || []).includes(id)) { toast('¡Ya completaste este pequeño paso hoy!'); return; }
  if (id === 'focus') { showFocus(); return; }
  const food = id === 'food';
  openModal(food ? 'Dale color a tu plato' : 'Una pausa para ti', `<div class="habit-detail"><span class="big-emoji" aria-hidden="true">${food ? '🥑' : '🌿'}</span><h3>${food ? 'Un sabor de nuestra tierra' : 'Respira. Estira. Sigue.'}</h3><p>${food ? 'La palta, la quinua y la granadilla son parte de la riqueza de nuestros alimentos. Hoy puedes conocer o probar un alimento peruano y sumar variedad a tu plato.' : 'Deja las pantallas un momento, mueve suavemente los hombros y estira las piernas. Haz una pausa a tu ritmo.'}</p><p class="muted small">Cuando lo hayas hecho, registra tu pequeña victoria.</p>${button(food ? 'Ya descubrí un alimento' : 'Ya hice mi pausa', 'complete-habit', `data-habit="${id}"`)}</div>`, 'habit');
}
function showFocus() {
  const f = state.focus;
  const duration = f?.duration || 1500;
  openModal('Un ratito de enfoque', `<p class="small muted">Elige una tarea pequeña. El temporizador continúa aunque cambies de pestaña dentro de Winy.</p><div class="timer-options" role="group" aria-label="Duración de la sesión">${[[1500, '25 min'], [300, '5 min'], [30, 'Prueba · 30 s']].map(([seconds, label]) => `<button class="pill ${duration === seconds ? 'active' : ''}" data-action="focus-duration" data-duration="${seconds}" aria-pressed="${duration === seconds}">${label}</button>`).join('')}</div><div class="timer-circle"><span id="timer-time" role="timer" aria-label="Tiempo restante">25:00</span><span id="timer-status">Listo cuando tú quieras.</span></div>${button('Empezar', 'focus-toggle', 'id="timer-toggle"')}${button('Reiniciar sesión', 'focus-reset', '', 'secondary full')}<p class="footnote">Una sesión completada suma a tu hábito de enfoque. Una recompensa por día.</p>`, 'focus');
  updateTimer();
}
function updateTimer() {
  const f = state.focus;
  let remaining = f ? f.endsAt ? Math.max(0, Math.ceil((f.endsAt - Date.now()) / 1000)) : f.remaining : 1500;
  if (f?.endsAt && remaining === 0) {
    f.endsAt = 0; f.remaining = 0;
    const rewarded = completeHabit(state, 'focus'); save(); render();
    toast(rewarded ? '¡Sesión completada! +20 XP y +8 monedas.' : '¡Terminaste otra sesión de enfoque!');
  }
  if (modal !== 'focus') return;
  const display = document.querySelector('#timer-time');
  if (!display) return;
  display.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  document.querySelector('#timer-status').textContent = f?.endsAt ? 'Una cosa a la vez. Tú puedes.' : remaining === 0 ? '¡Un pequeño gran logro!' : f && remaining !== f.duration ? 'En pausa. Vuelve a tu ritmo.' : 'Listo cuando tú quieras.';
  document.querySelector('#timer-toggle').textContent = f?.endsAt ? 'Pausar' : remaining === 0 ? 'Otra sesión' : 'Empezar';
}
document.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action;
  if (action === 'nav') { if (!state.onboarded) return; view = el.dataset.view; render(); window.scrollTo({ top: 0 }); app.querySelector('h1')?.focus({ preventScroll: true }); }
  else if (action === 'select-pet') {
    const input = document.querySelector(modal === 'pet' ? '#change-name' : '#pet-name');
    if (input?.value.trim()) state.names[selectedPet] = input.value.trim().slice(0, 28);
    selectedPet = el.dataset.pet;
    if (modal === 'pet') renderPetPicker(); else render();
  }
  else if (action === 'change-pet') showPetPicker();
  else if (action === 'close') closeModal();
  else if (action === 'quiz') startQuiz(QUIZZES[el.dataset.quiz]);
  else if (action === 'review-game') { const game = state.games.find(g => g.id === el.dataset.quiz); if (game) { if (game.summary) showAnalysis(game); else startQuiz(game); } }
  else if (action === 'custom-quiz') { const game = state.games.find(g => g.id === el.dataset.quiz); if (game) startQuiz(game); }
  else if (action === 'answer') answerQuiz(el.dataset.answer);
  else if (action === 'next-question') { if (!quiz?.answered) return; quiz.index++; quiz.answered = false; if (quiz.index === quiz.questions.length) endQuiz(); else showQuestion(); }
  else if (action === 'replay') startQuiz(quiz.game, quiz.players);
  else if (action === 'notes') showNotes();
  else if (action === 'duo') showDuo();
  else if (action === 'visit') showVisit(Number(el.dataset.friend));
  else if (action === 'add-friend') { const f = FRIENDS[Number(el.dataset.friend)]; if (f && !state.visited.includes(f.name)) state.visited.push(f.name); save(); render(); showVisit(Number(el.dataset.friend)); toast('Perfil de ejemplo añadido a tu tribu.'); }
  else if (action === 'item') showItem(el.dataset.item);
  else if (action === 'buy') { const result = wear(state, el.dataset.item); if (result.ok) { save(); render(); closeModal(); toast('¡Ese look es muy tú!'); } else toast(result.reason); }
  else if (action === 'destination') { destination = DESTINATIONS.find(d => d.id === el.dataset.destination); render(); }
  else if (action === 'reset-map') { destination = null; render(); }
  else if (action === 'habit') showHabit(el.dataset.habit);
  else if (action === 'complete-habit') { const done = completeHabit(state, el.dataset.habit); save(); render(); closeModal(); toast(done ? '¡Una pequeña victoria! +20 XP y +8 monedas.' : 'Ya registraste este hábito hoy.'); }
  else if (action === 'focus') showFocus();
  else if (action === 'focus-duration') { const duration = Number(el.dataset.duration); state.focus = { duration, remaining: duration, endsAt: 0 }; save(); showFocus(); }
  else if (action === 'focus-reset') { const duration = state.focus?.duration || 1500; state.focus = { duration, remaining: duration, endsAt: 0 }; save(); updateTimer(); }
  else if (action === 'focus-toggle') {
    if (!state.focus) state.focus = { duration: 1500, remaining: 1500, endsAt: 0 };
    const f = state.focus;
    if (f.endsAt) { f.remaining = Math.max(0, Math.ceil((f.endsAt - Date.now()) / 1000)); f.endsAt = 0; }
    else { if (!f.remaining) f.remaining = f.duration; f.endsAt = Date.now() + f.remaining * 1000; }
    save(); updateTimer();
  }
  else if (action === 'share') {
    const text = 'Winy · Tu pequeña gran aventura. Aprende, crea hábitos y descubre el Perú.';
    try { if (window.WinyAndroid?.share) window.WinyAndroid.share(text); else if (navigator.share) await navigator.share({ title: 'Winy', text, url: location.href }); else if (navigator.clipboard) { await navigator.clipboard.writeText(text + '\n' + location.href); toast('Invitación copiada. Compártela con tu tribu.'); } else openModal('Comparte Winy', `<p>Comparte esta dirección con tu tribu:</p><input aria-label="Dirección de Winy" value="${esc(location.href)}" readonly>`); }
    catch (err) { if (err.name !== 'AbortError') toast('No se pudo compartir. Puedes copiar la dirección desde el navegador.'); }
  }
});
document.addEventListener('keydown', event => { if (event.target.matches('.map-marker') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
document.addEventListener('submit', async event => {
  const form = event.target; event.preventDefault();
  if (form.id === 'onboarding-form' || form.id === 'pet-form') {
    const name = new FormData(form).get('petName').trim();
    if (!name) { form.querySelector('input').setCustomValidity('Escribe un nombre para tu compañero.'); form.querySelector('input').reportValidity(); return; }
    state.names[selectedPet] = name.slice(0, 28); state.pet = selectedPet; state.onboarded = true;
    save(); render(); if (dialog.open) closeModal(); toast('¡Tu pequeña gran aventura empieza ahora!');
  }
  else if (form.id === 'duo-form') {
    const fd = new FormData(form); const p1 = fd.get('player1').trim(), p2 = fd.get('player2').trim();
    if (!p1 || !p2) return;
    startQuiz(QUIZZES[fd.get('quiz')], [p1, p2]);
  }
  else if (form.id === 'answer-form') answerQuiz(new FormData(form).get('answer').trim());
  else if (form.id === 'notes-form') {
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = 'Preparando tu aventura…';
    try {
      const fd = new FormData(form), sources = await readSources([...form.querySelector('#files').files]);
      if (fd.get('notes').trim()) sources.push({ name: 'Apuntes pegados', text: fd.get('notes') });
      const game = fd.get('mode') === 'ai' ? await analyze(sources, fd.get('topic'), currentName() || 'Explorador') : makeStudyGame(sources, fd.get('topic'));
      if (modal !== 'notes' || !form.isConnected) return;
      state.games = [...state.games.filter(g => g.id !== game.id), game].slice(-10); save(); render(); if (game.summary) showAnalysis(game); else startQuiz(game);
    } catch (err) {
      if (!form.isConnected) return;
      form.querySelector('#notes-error').textContent = err.message;
      submit.disabled = false; submit.innerHTML = 'Crear mi juego ' + icon('star');
    }
  }
});
document.addEventListener('input', event => { if (event.target.matches('input')) event.target.setCustomValidity(''); });
document.addEventListener('visibilitychange', updateTimer);
setInterval(updateTimer, 500);
window.winyBack = () => {
  if (dialog.open) { closeModal(); return true; }
  if (state.onboarded && view !== 'home') { view = 'home'; render(); window.scrollTo({ top: 0 }); return true; }
  return false;
};
const online = createOnline({
  open: (title, body) => openModal(title, body, 'online'),
  active: () => modal === 'online' && dialog.open,
  onFinish: room => {
    const me = room.players.find(p => p.me), other = room.players.find(p => !p.me);
    finishQuiz(state, 'online-' + room.code, me.score, room.total);
    state.matches = [...(state.matches || []).filter(m => m.code !== room.code), { code: room.code, opponent: other.name, mine: me.score, theirs: other.score, played: Date.now() }].slice(-20);
    save(); render();
  }
});
render(); updateTimer();
serviceStatus().then(result => { service = result; if (state.onboarded && ['friends', 'study'].includes(view) && !dialog.open) render(); }).catch(() => {});
