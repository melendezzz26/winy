import { randomBytes } from 'node:crypto';
import { QUIZZES } from '../web/core/data.js';
import { checkStudyAnswer } from '../web/core/study.js';
import { MAX_QUESTIONS } from '../web/core/question-count.js';

export const ROUND_MS = 30000;
const REVEAL_MS = 4500;
export function newCode() { return randomBytes(5).toString('hex').slice(0, 6).toUpperCase(); }
function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} no válido.`);
  return value.trim();
}
export function studyBank(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.questions) || value.questions.length < 2 || value.questions.length > MAX_QUESTIONS) throw new Error('Comparte un repaso de entre 2 y 20 preguntas.');
  const title = text(value.title, 100, 'Título');
  const questions = value.questions.map(q => {
    if (!q || typeof q !== 'object' || Array.isArray(q)) throw new Error('Pregunta no válida.');
    const common = { prompt: text(q.prompt, 1200, 'Enunciado'), evidence: text(q.evidence, 1200, 'Cita'), source: text(q.source, 400, 'Fuente') };
    if (typeof q.expected === 'string') return { ...common, expected: text(q.expected, 100, 'Respuesta'), explanation: 'Esta palabra completa la frase de tus apuntes.' };
    if (!Array.isArray(q.options) || q.options.length !== 3 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 2) throw new Error('Alternativas o respuesta no válidas.');
    const options = q.options.map(o => text(o, 500, 'Alternativa'));
    if (new Set(options.map(o => o.toLowerCase())).size !== 3) throw new Error('Las alternativas deben ser distintas.');
    return { ...common, options, answer: q.answer, explanation: text(q.explanation, 1500, 'Explicación'), ...( ['recall', 'understand', 'apply'].includes(q.skill) ? { skill: q.skill } : {}) };
  });
  if (new Set(questions.map(q => q.prompt.toLowerCase())).size !== questions.length) throw new Error('El repaso tiene preguntas repetidas.');
  return { title, questions };
}
export function newRoom(host, topic, now, options = {}) {
  const custom = options.game !== undefined;
  const game = custom ? studyBank(options.game) : QUIZZES[topic];
  if (!game) throw new Error('Tema no disponible.');
  const count = options.questionCount ?? (custom ? game.questions.length : 4), seconds = options.roundSeconds ?? (custom ? 60 : 30);
  if (!Number.isInteger(count) || count < 2 || count > MAX_QUESTIONS) throw new Error('Elige entre 2 y 20 preguntas para la sala.');
  if (![30, 60, 90].includes(seconds)) throw new Error('Elige 30, 60 o 90 segundos por pregunta.');
  return { code: newCode(), host: host.id, players: [{ id: host.id, name: host.nickname, score: 0 }], title: game.title, questions: structuredClone(game.questions).slice(0, count), custom, roundMs: seconds * 1000, history: [], ready: [], phase: 'waiting', round: 0, answers: {}, deadline: 0, updated: now, expires: now + 2 * 3600000 };
}
export function validAnswer(q, answer) { return q.expected ? typeof answer === 'string' && answer.trim().length > 0 && answer.length <= 100 : Number.isInteger(answer) && answer >= 0 && answer < q.options.length; }
const correct = (q, answer) => q.expected ? typeof answer === 'string' && checkStudyAnswer(answer, q.expected) : answer === q.answer;
export function reveal(room, now) {
  if (room.phase !== 'asking') return;
  const q = room.questions[room.round];
  for (const p of room.players) if (Object.hasOwn(room.answers, p.id) && correct(q, room.answers[p.id])) p.score++;
  (room.history ||= []).push({ round: room.round, answers: { ...room.answers } });
  room.ready = []; room.phase = 'reveal'; room.deadline = room.custom ? 0 : now + REVEAL_MS; room.updated = now;
}
export function nextRound(room, now) {
  room.round++; room.answers = {}; room.ready = [];
  if (room.round >= room.questions.length) { room.phase = 'finished'; room.deadline = 0; }
  else { room.phase = 'asking'; room.deadline = now + (room.roundMs || ROUND_MS); }
  room.updated = now;
}
export function advance(room, now) {
  if (room.phase === 'asking' && now >= room.deadline) reveal(room, now);
  else if (room.phase === 'reveal' && room.deadline && now >= room.deadline) nextRound(room, now);
  return room;
}
export function publicRoom(room, playerId, now) {
  const q = room.questions[room.round];
  const result = { code: room.code, version: room.version || 0, host: room.host === playerId, title: room.title, custom: room.custom === true, roundSeconds: (room.roundMs || ROUND_MS) / 1000, phase: room.phase, round: room.round, total: room.questions.length, deadline: room.deadline, serverTime: now, answered: Object.hasOwn(room.answers, playerId), ready: (room.ready || []).includes(playerId), players: room.players.map(p => ({ name: p.name, score: p.score, me: p.id === playerId, answered: Object.hasOwn(room.answers, p.id), ready: (room.ready || []).includes(p.id) })) };
  if (q && room.phase !== 'waiting') result.question = { prompt: q.prompt, type: q.expected ? 'cloze' : 'choice', ...(q.options ? { options: q.options } : {}) };
  if (q && room.phase === 'reveal') result.feedback = { ...(q.expected ? { expected: q.expected } : { answer: q.answer }), correct: Object.hasOwn(room.answers, playerId) && correct(q, room.answers[playerId]), explanation: q.explanation, selected: room.answers[playerId] ?? null, ...(q.evidence ? { evidence: q.evidence, source: q.source } : {}) };
  if (room.custom && room.phase === 'finished') {
    result.game = { id: `room-${room.code}`, title: room.title, icon: '📚', category: 'Repaso compartido', questions: room.questions };
    result.results = room.questions.map((question, i) => { const answer = room.history?.find(h => h.round === i)?.answers?.[playerId]; return { correct: correct(question, answer) }; });
  }
  return result;
}
