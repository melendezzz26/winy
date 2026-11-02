import { PETS, ITEMS, QUIZZES, DESTINATIONS, FRIENDS } from './core/data.js';
import { STORAGE_KEY, restoreState, today, level, completeHabit, finishQuiz, wear } from './core/state.js';
import { checkStudyAnswer } from './core/study.js';
import { pet } from './core/pets.js';
import { peruMap } from './core/map.js';
import { serviceStatus, currentName, currentAccount, hasSession, signIn, signOut, syncProgress, pullProgress } from './core/connection.js';
import { createOnline } from './core/online.js';
import { MISSIONS, completeDestination, companionMessage } from './core/gameplay.js';
import { createStudyFlow } from './core/study-flow.js';
import { recordReview, reviewQuestions, reviewCount } from './core/review.js';
import { providerLabel } from './core/providers.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const confirmedEmail = /(?:access_token|refresh_token)=/.test(location.hash);
if (confirmedEmail) history.replaceState(null, '', location.pathname + location.search);
let state;
try { state = restoreState(localStorage.getItem(STORAGE_KEY)); } catch { state = restoreState(null); }
let greetingIndex = 0;
let service = { online: false, ai: false, provider: 'openai' };
let serviceCheck = null;
let syncTimer, cloudMessage = 'Guardado en este dispositivo', tutorialStep = 0;
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
  ,account: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M5 19a7 7 0 0 1 14 0"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
const button = (label, action, extra = '', cls = 'primary') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const petData = () => PETS.find(p => p.id === state.pet);
function save() {
  state.savedAt = Date.now();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('Le falta espacio al navegador. Tu avance se mantendrá solo durante esta sesión.'); }
  if (currentAccount()) { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncProgress(state).then(() => { cloudMessage = 'Progreso sincronizado con tu cuenta'; }).catch(() => { cloudMessage = 'Guardado aquí · sincronización pendiente'; }), 1200); }
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2500);
}
function scene(p = state.pet, item = state.equipped, message = '¿Qué descubrimos hoy?', dress = false) {
  return `<div class="scene"><svg class="landscape" viewBox="0 0 540 340" preserveAspectRatio="none" aria-hidden="true"><rect width="540" height="340" fill="#e1ecd6"/><circle cx="453" cy="72" r="55" fill="#edf0ce"/><circle cx="453" cy="72" r="40" fill="#fbebba"/><path d="M0 93q100 0 212 104L300 340H0Z" fill="#bccdac"/><path d="M540 115q-87-61-263 70L188 340h352Z" fill="#cdd9b7"/><path d="M0 251q263-48 540 0v89H0Z" fill="#e4d8af"/><path d="M0 251q263-48 540 0" fill="none" stroke="#d5c99e" stroke-width="2"/><ellipse cx="270" cy="290" rx="119" ry="23" fill="#d6c89d" stroke="#cabb8f" stroke-width="2"/><g stroke="#91a772" stroke-width="3"><path d="m44 292 17-49m-13 38 28-16m-24 6-12-15"/><g fill="#c9dc8d" stroke="none"><ellipse cx="41" cy="253" rx="5" ry="12" transform="rotate(-27 41 253)"/><ellipse cx="58" cy="249" rx="5" ry="12" transform="rotate(20 58 249)"/><ellipse cx="71" cy="264" rx="12" ry="5" transform="rotate(-25 71 264)"/><ellipse cx="61" cy="282" rx="12" ry="5"/></g></g><path d="m482 279 22 0-4 15h-14Z" fill="#b89977"/><path d="M493 279v-27m0 18-9-8m9 1 10-8" stroke="#879e65" stroke-width="2"/><g fill="#b9cf89"><ellipse cx="485" cy="260" rx="7" ry="3" transform="rotate(35 485 260)"/><ellipse cx="501" cy="256" rx="7" ry="3" transform="rotate(-30 501 256)"/><ellipse cx="492" cy="253" rx="3" ry="7"/></g></svg><span class="speech" aria-live="polite">${esc(message)}</span>${pet(p, item, 'scene-pet')}<button class="pet-interact" data-action="pet-greet" data-pet="${p}" aria-label="Saludar a ${esc(state.names[p] || p)}"></button><span class="pet-touch-hint">Toca a tu compañero ♡</span>${dress ? button(icon('style'), 'nav', 'data-view="style" aria-label="Vestir a mi compañero"', 'dress-button') : ''}</div>`;
}
function header() { return `<header class="topbar"><button class="brand" data-action="nav" data-view="home" aria-label="Winy, ir al hogar"><img src="assets/logo.svg" alt=""><span>winy<span class="spark">✦</span></span></button><div class="stats"><button class="pill account-button" data-action="account" aria-label="Mi cuenta y tutorial">${icon('account')}</button><span class="pill">✦ Nv. ${level(state)}</span><span class="pill coins" aria-label="${state.coins} monedas">🪙 ${state.coins}</span></div></header>`; }
function heading(eyebrow, title, subtitle) { return `<div class="page-heading"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="subtitle">${subtitle}</p></div>`; }
function nav() { return `<nav class="bottom-nav" aria-label="Navegación principal">${[['home', 'Hogar'], ['study', 'Estudiar'], ['adventure', 'Aventura'], ['friends', 'Amigos'], ['style', 'Estilo']].map(([id, label]) => `<button data-action="nav" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}><span>${icon(id)}</span>${label}</button>`).join('')}</nav>`; }
function choices(selected, modalChoice = false) { return `<div class="pet-grid" role="group" aria-label="Elige a tu compañero">${PETS.map(p => `<button type="button" class="pet-choice ${selected === p.id ? 'selected' : ''}" data-action="select-pet" data-pet="${p.id}" aria-pressed="${selected === p.id}" ${modalChoice ? 'data-modal-choice="true"' : ''}>${selected === p.id ? `<span class="selection-check">${icon('check')}</span>` : ''}${pet(p.id, 'natural')}<strong>${p.name}</strong><small>${p.tagline}</small></button>`).join('')}</div>`; }
function onboarding() {
  return `<main id="content" class="onboarding"><img class="welcome-logo" src="assets/logo.svg" alt="Winy"><p class="eyebrow">Tu pequeña gran aventura</p><h1>Todo empieza<br>con un compañero.</h1><p class="subtitle">Estudia, juega y descubre el Perú.<br>¿Quién va contigo?</p><div class="welcome-account"><button class="primary" data-action="account-register">Crear cuenta con correo</button><button class="secondary full" data-action="account-login">Ya tengo cuenta · Entrar</button><p class="small muted">O elige un compañero y prueba como invitado.</p></div><form id="onboarding-form">${choices(selectedPet)}<label for="pet-name">¿Cómo se llamará tu compañero?</label><input id="pet-name" name="petName" required maxlength="28" value="${esc(state.names[selectedPet])}" autocomplete="off"><button class="primary" type="submit">¡Vamos a la aventura! ${icon('arrow')}</button></form><p class="welcome-note">Como invitado, tu progreso queda aquí. Con una cuenta puedes sincronizarlo.</p></main>`;
}
function passport() {
  const count = Object.keys(state.passport || {}).length;
  return `<section class="passport"><div class="section-title"><h2>Tu pasaporte</h2><span class="tag">${count} de 6 sellos</span></div><p>${count === 6 ? '¡Ya eres Explorador del Perú! Puedes seguir descubriendo y practicar.' : 'Consigue 2 de 3 aciertos en cada destino para ganar su sello.'}</p><div class="passport-grid">${DESTINATIONS.map(d => `<button class="passport-stamp ${state.passport[d.id] ? 'earned' : ''}" data-action="passport-destination" data-destination="${d.id}" aria-label="${d.name}${state.passport[d.id] ? ', sello conseguido' : ', explorar'}"><span aria-hidden="true">${d.icon}</span><strong>${d.name}</strong><small>${state.passport[d.id] ? '✓ Conseguido' : 'Por descubrir'}</small></button>`).join('')}</div></section>`;
}
function home() {
  const done = state.habits[today()] || [];
  const habits = [
    ['food', '🥑', 'Dale color a tu plato', 'Descubre un alimento peruano · +20 XP'],
    ['focus', '📚', 'Un ratito de enfoque', 'Estudia sin distracciones · +20 XP'],
    ['move', '🌿', 'Una pausa para ti', 'Estírate y recarga energía · +20 XP']
  ];
  return `${heading('Pequeños hábitos, grandes logros', 'Tu aventura de hoy<span class="gold-dot">.</span>', 'Un ratito para ti. Un gran paso juntos.')}${scene(state.pet, state.equipped, '¿Qué descubrimos hoy?', true)}<div class="pet-info"><div><h2>${esc(state.names[state.pet])} <span class="seed">🌱</span></h2><p>${petData().kind} · Explorador nivel ${level(state)}</p></div>${button(`Cambiar ${icon('arrow')}`, 'change-pet', '', 'pill change')}</div><div class="xp-label"><span>Un poquito más, un nivel más</span><span>${state.xp % 100} / 100 XP</span></div><progress class="xp" value="${state.xp % 100}" max="100" aria-label="Progreso al siguiente nivel"></progress><button class="challenge" data-action="quiz" data-quiz="peru"><span class="challenge-icon">ϟ</span><span><strong>Tu reto de 2 minutos</strong><small>Conoce el Perú · juega y gana XP</small></span>${icon('arrow')}</button><div class="section-title"><h2>Tus pequeñas victorias</h2><span class="tag">${done.length} de 3</span></div><div class="habit-list">${habits.map(([id, emoji, title, desc]) => `<button class="habit card ${done.includes(id) ? 'completed' : ''}" data-action="habit" data-habit="${id}"><span class="tile-icon">${emoji}</span><span><strong>${title}</strong><small>${done.includes(id) ? '¡Un pequeño gran paso! · Completado hoy' : desc}</small></span><span class="habit-check" aria-label="${done.includes(id) ? 'Completado' : 'Pendiente'}">${done.includes(id) ? icon('check') : ''}</span></button>`).join('')}</div>${passport()}<p class="footnote">Cada pequeño paso cuenta. Mañana, una nueva aventura.</p>`;
}
function quizCard(q, custom = false) { return `<button class="card quiz-card" data-action="${custom ? 'review-game' : 'quiz'}" data-quiz="${esc(q.id)}"><span class="tile-icon">${esc(q.icon || '📚')}</span><span><strong>${esc(q.title)}</strong><small>${q.questions.length} preguntas · ${esc(q.category)}</small><span class="tag">Jugar + XP</span></span>${icon('arrow')}</button>`; }
function study() {
  return `${heading('Aprende a tu manera', 'De apuntes a aventura.', 'Tú pones el tema. Tu compañero va contigo.')}<section class="study-hero"><span class="tag">Tu rincón de estudio</span><h2>¿Qué quieres<br>descubrir hoy?</h2><p>Trae tus apuntes y elige<br>ideas clave con trivia o<br>completar palabras.</p>${pet(state.pet, state.equipped)}</section>${button(`${icon('upload')} Crear juego con mis archivos`, 'notes')}<div class="section-title"><h2>Listos para jugar</h2><span class="tag">Solo o en dúo</span></div>${reviewCount(state) ? button(`Repasar ${reviewCount(state)} conceptos pendientes ${icon('arrow')}`, 'review-due', '', 'secondary full') : ''}<div class="quiz-list">${Object.values(QUIZZES).map(q => quizCard(q)).join('')}${state.games.map(q => quizCard(q, true)).join('')}</div><button class="focus-card" data-action="focus"><span class="tile-icon">◷</span><span><strong>Modo enfoque</strong><small>Una tarea pequeña. Un momento para ti.</small></span>${icon('arrow')}</button>`;
}
function map() { return peruMap(destination, state.passport); }
function adventure() {
  return `${heading('Un país, muchas aventuras', 'El Perú te espera.', 'Toca un destino, acércate y empieza tu reto.')}<div class="destination-tabs" role="group" aria-label="Destinos">${DESTINATIONS.map(d => `<button class="pill ${destination?.id === d.id ? 'active' : ''}" data-action="destination" data-destination="${d.id}" aria-pressed="${destination?.id === d.id}">${d.icon} ${d.name}</button>`).join('')}</div>${map()}<p class="map-caption">Contorno de Natural Earth · Destinos situados con coordenadas geográficas.</p><section class="destination-card"><span class="tag">${destination ? destination.region : 'Elige tu destino'}</span><h2>${destination ? destination.icon + ' ' + destination.title : '¿Costa, Andes o Amazonía?'}</h2><p>${destination ? destination.description : 'Cada destino abre un reto de cultura, naturaleza o bienestar. Tu próxima aventura empieza con un toque.'}</p>${destination ? `<p class="mission-goal">${state.passport[destination.id] ? '✓ Sello conseguido · Puedes mejorar tu marca' : 'Tu misión: 2 de 3 aciertos para conseguir el sello'}</p>` : ''}${destination ? button(`${state.passport[destination.id] ? 'Volver a jugar en' : 'Explorar'} ${destination.name} ${icon('arrow')}`, 'mission', `data-destination="${destination.id}"`) : ''}</section>`;
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
function closeModal() { if (modal === 'notes') studyFlow.cancel(); if (modal === 'tutorial') { state.tutorialSeen = true; save(); } dialog.close(); modal = null; }
dialog.addEventListener('close', () => { if (!dialog.open) { if (modal === 'notes') studyFlow.cancel(); if (modal === 'tutorial') { state.tutorialSeen = true; save(); } modal = null; } });
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
function showNotes() { studyFlow.show(); }
function updateServiceControls() { studyFlow.updateService(service, Boolean(serviceCheck)); }
function refreshService() {
  if (serviceCheck) { updateServiceControls(); return serviceCheck; }
  serviceCheck = serviceStatus().then(result => { service = result; }).catch(() => { service = { ...service, online: false, ai: false }; }).finally(() => {
    serviceCheck = null; updateServiceControls();
    if (state.onboarded && ['friends', 'study'].includes(view) && !dialog.open) render();
  });
  updateServiceControls();
  return serviceCheck;
}
function showAnalysis(game) {
  const errors = reviewQuestions(state, game, { errorsOnly: true }).length, q = game.questions[0];
  openModal(game.title, `<span class="tag">Tu repaso está listo · ${game.questions.length} conceptos</span>${game.provider ? `<p class="small muted">Preparado con ${providerLabel(game.provider)}</p>` : ''}${game.providerCoverage?.sampled ? `<p class="notice">Se analizaron extractos: ${Number(game.providerCoverage.selected).toLocaleString('es-PE')} de ${Number(game.providerCoverage.total).toLocaleString('es-PE')} caracteres preparados.</p>` : ''}${game.quality?.omittedQuestions || game.quality?.omittedKeyPoints ? '<p class="notice">Se descartaron partes sin citas verificables. Este repaso conserva únicamente las preguntas e ideas con respaldo en tus apuntes.</p>' : ''}${game.summary ? `<p class="analysis-summary">${esc(game.summary)}</p>` : '<p class="analysis-summary">Ejercicios locales para completar palabras de tus apuntes. Elige cómo practicar.</p>'}<div class="game-picker">${[['trivia', q.expected ? '✍️ Completar palabras' : '🎯 Trivia de comprensión', 'Responde y recibe una explicación.'], ['cards', '🃏 Tarjetas de memoria', 'Recuerda antes de descubrir la respuesta.'], ['mixed', '🧭 Repaso mixto', 'Alterna preguntas y tarjetas.']].map(([format, label, description]) => `<button class="game-option ${game.playMode === format ? 'recommended' : ''}" data-action="custom-quiz" data-quiz="${esc(game.id)}" data-format="${format}"><strong>${label}</strong><small>${description}</small></button>`).join('')}</div><details class="game-example"><summary>Ver una pregunta de ejemplo</summary><p>${esc(q.prompt)}</p>${q.options ? `<ul>${q.options.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : '<p class="small muted">Completarás la palabra que falta.</p>'}</details>${errors ? button(`Repasar mis errores (${errors})`, 'review-errors', `data-quiz="${esc(game.id)}"`, 'secondary full') : ''}<p class="notice">Tus respuestas guardan qué necesitas practicar. Los aciertos vuelven en 1, 3, 7 y 14 días; los errores puedes repasarlos ahora.</p><div class="key-points">${(Array.isArray(game.keyPoints) ? game.keyPoints : []).map(p => `<article><h3>${esc(p.idea)}</h3><blockquote>${esc(p.evidence)}<cite>${esc(p.source)}</cite></blockquote></article>`).join('')}</div>`, 'analysis');
}
function startQuiz(game, players = null, missionId = null, options = {}) {
  quiz = { game, missionId, questions: options.questions || (players ? game.questions.slice(0, 4) : game.questions), format: options.format || 'trivia', review: Boolean(options.review), index: 0, score: 0, scores: [0, 0], players, answered: false, result: null };
  showQuestion();
}
function showQuestion() {
  const q = quiz.questions[quiz.index], custom = !!q.expected;
  if (!quiz.players && (quiz.format === 'cards' || quiz.format === 'mixed' && quiz.index % 2 === 1)) { showCard(q); return; }
  openModal(quiz.players ? 'Trivia en dúo' : quiz.game.title, `<div class="quiz-meta"><span class="tag">${quiz.players ? 'Turno de ' + esc(quiz.players[quiz.index % 2]) : 'Reto ' + (quiz.index + 1)}</span><span>${quiz.index + 1} / ${quiz.questions.length}</span></div><progress class="xp" value="${quiz.index}" max="${quiz.questions.length}" aria-label="Preguntas completadas"></progress><h3 class="question">${esc(q.prompt)}</h3><p class="small muted">${custom ? 'Completa la palabra que falta en tus apuntes.' : 'Toca la respuesta que creas correcta.'}</p>${custom ? '<form id="answer-form"><label for="study-answer">Tu respuesta</label><input id="study-answer" name="answer" required maxlength="100" autocomplete="off"><button type="submit" class="primary">Comprobar</button></form>' : `<div class="answers">${q.options.map((o, i) => `<button class="answer" data-action="answer" data-answer="${i}"><span>${'ABC'[i]}</span>${esc(o)}</button>`).join('')}</div>`}<div id="feedback" aria-live="polite"></div>${quiz.players ? `<div class="duo-scores"><span>${esc(quiz.players[0])}: ${quiz.scores[0]}</span><span>${esc(quiz.players[1])}: ${quiz.scores[1]}</span></div>` : ''}`, 'quiz');
}
function answerQuiz(answer) {
  if (!quiz || quiz.answered || modal !== 'quiz') return;
  quiz.answered = true;
  const q = quiz.questions[quiz.index];
  const correct = q.expected ? checkStudyAnswer(answer, q.expected) : Number(answer) === q.answer;
  if (state.games.some(g => g.id === quiz.game.id)) { recordReview(state, quiz.game, q, correct); save(); }
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
  quiz.result = quiz.review ? { xp: 0, coins: 0, claimed: false } : finishQuiz(state, (quiz.players ? 'duo-' : '') + quiz.game.id, rewardScore, quiz.questions.length);
  const stamp = quiz.missionId ? completeDestination(state, quiz.missionId, quiz.score, quiz.questions.length) : null;
  save(); render();
  let result = '¡Tu aventura sigue creciendo!';
  if (quiz.players) result = quiz.scores[0] === quiz.scores[1] ? '¡Un gran empate!' : `¡Ganó ${quiz.players[quiz.scores[0] > quiz.scores[1] ? 0 : 1]}!`;
  const stampMessage = stamp ? `<p class="stamp-result">${stamp.earned ? '✦ ¡Nuevo sello para tu pasaporte!' : stamp.already ? '✓ Este destino ya forma parte de tu pasaporte.' : `Con ${stamp.required} aciertos consigues este sello. ¡Puedes intentarlo otra vez!`}</p>` : '';
  const errors = state.games.some(g => g.id === quiz.game.id) ? reviewQuestions(state, quiz.game, { errorsOnly: true }).length : 0;
  openModal('Pequeños pasos, grandes logros', `<div class="result"><span class="result-star" aria-hidden="true">✦</span><h3>${esc(result)}</h3><p>${quiz.score} de ${quiz.questions.length} respuestas correctas</p>${stampMessage}${quiz.players ? `<div class="scoreboard">${quiz.players.map((p, i) => `<div><strong>${esc(p)}</strong><span>${quiz.scores[i]} puntos</span></div>`).join('')}</div>` : ''}<div class="reward-pills"><span class="pill">+${quiz.result.xp} XP</span><span class="pill coins">🪙 +${quiz.result.coins}</span></div><p class="small muted">${quiz.review ? 'Repaso guardado. Los errores siguen pendientes y los aciertos volverán más adelante. Este repaso no duplica premios.' : quiz.result.claimed ? 'Tu mejor marca de hoy está guardada. Mejora tus aciertos para ganar la diferencia de XP y monedas.' : quiz.players ? 'Las recompensas de tu jugador se guardan en este dispositivo.' : '¡Lo que aprendes hoy te acompaña mañana!'}</p>${errors ? button(`Repasar mis errores (${errors})`, 'review-errors', `data-quiz="${esc(quiz.game.id)}"`, 'secondary full') : ''}${button('Seguir mi aventura', 'close')}${button('Volver a jugar', 'replay', '', 'secondary full')}</div>`, 'result');
}
function showCard(q) {
  openModal(quiz.game.title, `<div class="quiz-meta"><span class="tag">${quiz.review ? 'Repaso' : 'Tarjeta de memoria'}</span><span>${quiz.index + 1} / ${quiz.questions.length}</span></div><article class="memory-card"><span class="big-emoji" aria-hidden="true">🃏</span><h3 class="question">${esc(q.prompt)}</h3><p class="small muted">Piensa tu respuesta antes de descubrirla.</p>${button('Mostrar respuesta', 'card-flip')}<div class="review-back" hidden><h3>${esc(q.expected || q.options[q.answer])}</h3><p>${esc(q.explanation || 'Esta palabra completa la frase de tus apuntes.')}</p><blockquote>${esc(q.evidence)}<cite>${esc(q.source)}</cite></blockquote></div><div class="card-ratings" hidden><p>¿Lo recordaste sin mirar?</p>${button('Sí, lo recordé', 'card-rate', 'data-correct="true"')}${button('Necesito practicar', 'card-rate', 'data-correct="false"', 'secondary full')}</div></article><div id="feedback" aria-live="polite"></div>`, 'quiz');
}
function rateCard(correct) {
  if (!quiz || quiz.answered || modal !== 'quiz' || dialog.querySelector('.review-back')?.hidden) return;
  quiz.answered = true; if (correct) quiz.score++;
  recordReview(state, quiz.game, quiz.questions[quiz.index], correct); save();
  dialog.querySelectorAll('[data-action=card-rate]').forEach(b => { b.disabled = true; });
  dialog.querySelector('#feedback').innerHTML = `<p class="notice">${correct ? 'Guardado. Volverás a practicar este concepto más adelante.' : 'Lo guardamos para repasar. Puedes intentarlo otra vez al terminar.'}</p>${button(quiz.index + 1 === quiz.questions.length ? 'Ver mi resultado' : 'Siguiente concepto', 'next-question')}`;
}
function showTutorial() {
  const steps = [
    ['🌱', 'Tu compañero va contigo', 'Tócalo en el Hogar para saludarlo. Completa pequeños hábitos y retos para ganar monedas y elegir su estilo.'],
    ['🃏', 'Tus apuntes se vuelven un juego', 'Revisa el texto de tu archivo y elige trivia, tarjetas o un repaso mixto. Después podrás volver a practicar tus errores.'],
    ['🧭', 'Llena tu pasaporte', 'Explora los seis destinos del Perú. Dos aciertos de tres te dan un sello que queda guardado.'],
    ['⚔️', 'Comparte una aventura', 'Crea una sala en Amigos y pasa el código a otra persona. Cada uno responde desde su teléfono.']
  ];
  const [emoji, title, text] = steps[tutorialStep];
  openModal('Bienvenido a Winy', `<div class="tutorial"><p class="small muted">${tutorialStep + 1} de ${steps.length}</p><span class="tutorial-emoji" aria-hidden="true">${emoji}</span><h3>${title}</h3><p>${text}</p><div class="tutorial-dots" aria-hidden="true">${steps.map((_, i) => `<span class="${i === tutorialStep ? 'active' : ''}"></span>`).join('')}</div>${button(tutorialStep === 3 ? '¡A jugar!' : 'Siguiente', 'tutorial-next')}${tutorialStep ? button('Anterior', 'tutorial-back', '', 'secondary full') : ''}${button('Omitir tutorial', 'tutorial-skip', '', 'text-button')}</div>`, 'tutorial');
}
function showAccount(register = false) {
  const account = currentAccount();
  if (account && hasSession()) { openModal('Tu cuenta', `<p class="account-email">${esc(account.email)}</p><p class="notice" id="cloud-state">${esc(cloudMessage)}</p>${button('Recuperar el progreso de mi cuenta', 'account-pull', '', 'secondary full')}<p class="small muted">Carga el último guardado de tu cuenta en este dispositivo.</p>${button('Volver a ver el tutorial', 'tutorial', '', 'secondary full')}${button('Cerrar sesión', 'account-logout', '', 'text-button')}`, 'account'); return; }
  openModal(register ? 'Crea tu cuenta' : 'Qué bueno verte otra vez', `<p class="small muted">${register ? 'Guarda tu compañero y tus repasos con tu correo.' : 'Entra directamente a tu aventura. Puedes omitir la bienvenida.'}</p><form id="account-form" data-register="${register}">${register ? '<label for="account-name">Tu nombre de jugador</label><input id="account-name" name="nickname" required maxlength="28" autocomplete="nickname">' : ''}<label for="account-email">Correo electrónico</label><input id="account-email" name="email" type="email" required maxlength="254" autocomplete="email"><label for="account-password">Contraseña</label><input id="account-password" name="password" type="password" required minlength="8" maxlength="128" autocomplete="${register ? 'new-password' : 'current-password'}"><p class="form-error" id="account-error" role="alert"></p><button type="submit" class="primary">${register ? 'Crear mi cuenta' : 'Entrar'}</button></form>${button(register ? 'Ya tengo cuenta' : 'Quiero crear una cuenta', register ? 'account-login' : 'account-register', '', 'secondary full')}<p class="small muted">${register ? 'Recibirás un enlace para confirmar tu correo antes de entrar.' : 'Si acabas de registrarte, confirma primero tu correo.'}</p>`, 'account');
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
  openModal('¿Un nuevo look?', `<div class="item-preview">${scene(state.pet, i.id, 'Así se verá en tu compañero')}<h3>${i.name}</h3><p class="muted">Cuesta ${i.price} monedas. Tienes ${state.coins}.</p>${button(affordable ? `Conseguir por 🪙 ${i.price}` : `Te faltan ${i.price - state.coins} monedas`, 'buy', `data-item="${id}" ${affordable ? '' : 'disabled'}`)}${!affordable ? '<p class="small muted">Juega una trivia o completa tus hábitos para ganar monedas.</p>' : ''}</div>`, 'item');
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
  else if (action === 'pet-greet') { const scene = el.closest('.scene'); scene.querySelector('.speech').textContent = companionMessage(el.dataset.pet, greetingIndex++); scene.classList.remove('pet-reacting'); void scene.offsetWidth; scene.classList.add('pet-reacting'); }
  else if (action === 'passport-destination') { destination = DESTINATIONS.find(d => d.id === el.dataset.destination); view = 'adventure'; render(); window.scrollTo({top: 0}); }
  else if (action === 'mission') { const id = el.dataset.destination; if (MISSIONS[id]) startQuiz(MISSIONS[id], null, id); }
  else if (action === 'quiz') startQuiz(QUIZZES[el.dataset.quiz]);
  else if (action === 'review-game') { const game = state.games.find(g => g.id === el.dataset.quiz); if (game) showAnalysis(game); }
  else if (action === 'custom-quiz') { const game = state.games.find(g => g.id === el.dataset.quiz); if (game) startQuiz(game, null, null, { format: el.dataset.format || game.playMode || 'trivia' }); }
  else if (action === 'answer') answerQuiz(el.dataset.answer);
  else if (action === 'next-question') { if (!quiz?.answered) return; quiz.index++; quiz.answered = false; if (quiz.index === quiz.questions.length) endQuiz(); else showQuestion(); }
  else if (action === 'replay') startQuiz(quiz.game, quiz.players, quiz.missionId, { format: quiz.format, review: quiz.review, questions: quiz.review ? quiz.questions : undefined });
  else if (action === 'notes') showNotes();
  else if (action === 'retry-service') refreshService();
  else if (action === 'cancel-study') studyFlow.cancel();
  else if (action === 'account' || action === 'account-login') showAccount(false);
  else if (action === 'account-register') showAccount(true);
  else if (action === 'tutorial') { tutorialStep = 0; showTutorial(); }
  else if (action === 'tutorial-next') { tutorialStep++; if (tutorialStep >= 4) closeModal(); else showTutorial(); }
  else if (action === 'tutorial-back') { tutorialStep = Math.max(0, tutorialStep - 1); showTutorial(); }
  else if (action === 'tutorial-skip') closeModal();
  else if (action === 'account-logout') { clearTimeout(syncTimer); await signOut(); state = restoreState(null); selectedPet = state.pet; save(); closeModal(); render(); }
  else if (action === 'account-pull') { el.disabled = true; try { const progress = await pullProgress(); if (progress) { state = restoreState(progress); selectedPet = state.pet; save(); render(); } cloudMessage = 'Progreso de tu cuenta recuperado'; showAccount(); } catch (error) { toast(error.message); el.disabled = false; } }
  else if (action === 'card-flip') { dialog.querySelector('.review-back').hidden = false; dialog.querySelector('.card-ratings').hidden = false; el.hidden = true; }
  else if (action === 'card-rate') rateCard(el.dataset.correct === 'true');
  else if (action === 'review-errors' || action === 'review-due') { const game = action === 'review-errors' ? state.games.find(g => g.id === el.dataset.quiz) : state.games.find(g => reviewQuestions(state, g).length); if (game) { const questions = reviewQuestions(state, game, { errorsOnly: action === 'review-errors' }); if (questions.length) startQuiz(game, null, null, { review: true, format: 'mixed', questions }); } }
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
  if (form.id === 'account-form') {
    const submit = form.querySelector('button[type=submit]'); submit.disabled = true; form.querySelector('#account-error').textContent = '';
    try {
      const previousAccount = currentAccount()?.id;
      const fd = new FormData(form), result = await signIn(fd.get('email'), fd.get('password'), fd.get('nickname'), form.dataset.register === 'true');
      form.querySelector('[name=password]').value = '';
      if (result.requiresConfirmation) { openModal('Confirma tu correo', `<p>Abre el enlace que recibiste por correo para activar tu cuenta. Después vuelve a Winy e inicia sesión.</p>${button('Ya confirmé · Entrar', 'account-login', '', 'primary full')}`, 'account'); return; }
      if (result.progress) { const remote = restoreState(result.progress); if (previousAccount !== result.account.id || remote.savedAt >= state.savedAt) state = remote; }
      else if (result.syncPending) state = restoreState(null);
      else if (previousAccount && previousAccount !== result.account.id) state = restoreState(null);
      selectedPet = state.pet; tutorialStep = 0; view = 'home';
      cloudMessage = result.syncPending ? 'No se pudo recuperar el guardado. Usa Recuperar progreso antes de sincronizar.' : 'Progreso sincronizado con tu cuenta';
      save(); closeModal(); render(); toast(result.syncPending ? 'Entraste. Falta recuperar tu progreso de la cuenta.' : '¡Bienvenido! Tu aventura continúa.');
    } catch (error) { if (form.isConnected) form.querySelector('#account-error').textContent = error.message; }
    finally { if (form.isConnected) submit.disabled = false; }
  }
  else if (form.id === 'onboarding-form' || form.id === 'pet-form') {
    const name = new FormData(form).get('petName').trim();
    if (!name) { form.querySelector('input').setCustomValidity('Escribe un nombre para tu compañero.'); form.querySelector('input').reportValidity(); return; }
    state.names[selectedPet] = name.slice(0, 28); state.pet = selectedPet; state.onboarded = true;
    save(); render(); if (dialog.open) closeModal(); if (!state.tutorialSeen) showTutorial(); else toast('¡Listos para seguir la aventura!');
  }
  else if (form.id === 'duo-form') {
    const fd = new FormData(form); const p1 = fd.get('player1').trim(), p2 = fd.get('player2').trim();
    if (!p1 || !p2) return;
    startQuiz(QUIZZES[fd.get('quiz')], [p1, p2]);
  }
  else if (form.id === 'answer-form') answerQuiz(new FormData(form).get('answer').trim());
  else if (form.id === 'notes-form') await studyFlow.submit(form);

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
const studyFlow = createStudyFlow({ open: openModal, dialog, getService: () => service, refresh: refreshService, onGame: game => { state.games = [...state.games.filter(g => g.id !== game.id), game].slice(-10); save(); render(); showAnalysis(game); } });
render(); updateTimer();
if (confirmedEmail) showAccount(false);
refreshService();
window.addEventListener('online', refreshService);

window.addEventListener('winy-session-expired', () => toast('Tu sesión necesita renovarse. Entra con tu correo desde Mi cuenta; tu progreso local se conserva.'));
