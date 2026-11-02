import { randomBytes } from 'node:crypto';
import { QUIZZES } from '../web/core/data.js';

export const ROUND_MS = 30000;
const REVEAL_MS = 4500;
export function newCode() { return randomBytes(5).toString('hex').slice(0, 6).toUpperCase(); }
export function newRoom(host, topic, now) {
  const game = QUIZZES[topic];
  if (!game) throw new Error('Tema no disponible.');
  return { code: newCode(), host: host.id, players: [{ id: host.id, name: host.nickname, score: 0 }], title: game.title, questions: structuredClone(game.questions).slice(0, 4), phase: 'waiting', round: 0, answers: {}, deadline: 0, updated: now, expires: now + 2 * 3600000 };
}
export function reveal(room, now) {
  const q = room.questions[room.round];
  for (const p of room.players) if (room.answers[p.id] === q.answer) p.score++;
  room.phase = 'reveal'; room.deadline = now + REVEAL_MS; room.updated = now;
}
export function advance(room, now) {
  if (room.phase === 'asking' && now >= room.deadline) reveal(room, now);
  else if (room.phase === 'reveal' && now >= room.deadline) {
    room.round++; room.answers = {};
    if (room.round >= room.questions.length) { room.phase = 'finished'; room.deadline = 0; }
    else { room.phase = 'asking'; room.deadline = now + ROUND_MS; }
    room.updated = now;
  }
  return room;
}
export function publicRoom(room, playerId, now) {
  const q = room.questions[room.round];
  const result = { code: room.code, version: room.version || 0, host: room.host === playerId, title: room.title, phase: room.phase, round: room.round, total: room.questions.length, deadline: room.deadline, serverTime: now, answered: Object.hasOwn(room.answers, playerId), players: room.players.map(p => ({ name: p.name, score: p.score, me: p.id === playerId, answered: Object.hasOwn(room.answers, p.id) })) };
  if (q && room.phase !== 'waiting') result.question = { prompt: q.prompt, options: q.options };
  if (q && room.phase === 'reveal') result.feedback = { answer: q.answer, explanation: q.explanation, selected: room.answers[playerId] ?? null };
  return result;
}
