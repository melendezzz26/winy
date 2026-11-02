import { PETS, ITEMS, DESTINATIONS } from './data.js';
import { restoreReviews } from './review.js';
import { restoreFocus, restoreStudySessions } from './pomodoro.js';
export const STORAGE_KEY = 'winy.v1';
export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function initialState() {
  return { version: 1, onboarded: false, tutorialSeen: false, savedAt: 0, pet: 'cuy', names: Object.fromEntries(PETS.map(p => [p.id, p.defaultName])), xp: 0, coins: 90, owned: ['natural'], equipped: 'natural', habits: {}, rewards: {}, bestScores: {}, passport: {}, reviews: {}, studySessions: [], visited: [], games: [], matches: [], focus: null };
}
export function restoreState(raw) {
  const base = initialState();
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s || typeof s !== 'object') return base;
    const pet = PETS.some(p => p.id === s.pet) ? s.pet : base.pet;
    const owned = ITEMS.filter(i => Array.isArray(s.owned) && s.owned.includes(i.id)).map(i => i.id);
    if (!owned.includes('natural')) owned.unshift('natural');
    const names = Object.fromEntries(PETS.map(p => [p.id, typeof s.names?.[p.id] === 'string' && s.names[p.id].trim() ? s.names[p.id].trim().slice(0, 28) : p.defaultName]));
    return { ...base, onboarded: s.onboarded === true, pet, names, owned,
      tutorialSeen: s.tutorialSeen === true || (s.tutorialSeen === undefined && s.onboarded === true),
      savedAt: Number.isFinite(s.savedAt) && s.savedAt >= 0 ? s.savedAt : 0,
      reviews: restoreReviews(s.reviews),
      studySessions: restoreStudySessions(s.studySessions),
      equipped: owned.includes(s.equipped) ? s.equipped : 'natural',
      xp: Number.isSafeInteger(s.xp) && s.xp >= 0 ? s.xp : 0,
      coins: Number.isSafeInteger(s.coins) && s.coins >= 0 ? s.coins : 90,
      habits: Object.fromEntries(Object.entries(validRecord(s.habits)).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, [...new Set(v.filter(x => ['food', 'focus', 'move'].includes(x)))]])),
      rewards: Object.fromEntries(Object.entries(validRecord(s.rewards)).filter(([, v]) => v === true)),
      bestScores: Object.fromEntries(Object.entries(s.bestScores && typeof s.bestScores === 'object' ? s.bestScores : {}).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}:/.test(k) && Number.isSafeInteger(v) && v >= 0 && v <= 1000).slice(-200)),
      passport: Object.fromEntries(Object.entries(s.passport && typeof s.passport === 'object' ? s.passport : {}).filter(([id, v]) => DESTINATIONS.some(d => d.id === id) && v && Number.isFinite(v.earnedAt) && Number.isInteger(v.score) && v.total === 3 && v.score >= 2 && v.score <= 3)),
      visited: Array.isArray(s.visited) ? s.visited.filter(x => typeof x === 'string').slice(-100) : [],
      games: Array.isArray(s.games) ? s.games.filter(g => g && typeof g.id === 'string' && !['__proto__', 'constructor', 'prototype'].includes(g.id) && typeof g.title === 'string' && Array.isArray(g.questions) && g.questions.length && g.questions.every(q => q && typeof q.prompt === 'string' && typeof q.evidence === 'string' && (typeof q.expected === 'string' || (Array.isArray(q.options) && q.options.length === 3 && q.options.every(o => typeof o === 'string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3)))).slice(-10) : [],
      matches: Array.isArray(s.matches) ? s.matches.filter(m => m && typeof m.code === 'string' && typeof m.opponent === 'string' && Number.isInteger(m.mine) && Number.isInteger(m.theirs) && Number.isFinite(m.played)).slice(-20) : [],
      focus: restoreFocus(s.focus)
    };
  } catch { return base; }
}
function validRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([key, val]) => /^\d{4}-\d{2}-\d{2}/.test(key) && (val === true || Array.isArray(val)))) : {}; }
export function level(s) { return Math.floor(s.xp / 100) + 1; }
export function completeHabit(s, habit, day = today()) {
  if (!['food', 'focus', 'move'].includes(habit)) return false;
  const completed = s.habits[day] || [];
  if (completed.includes(habit)) return false;
  s.habits[day] = [...completed, habit];
  s.habits = Object.fromEntries(Object.entries(s.habits).slice(-31));
  s.xp += 20; s.coins += 8;
  return true;
}
export function finishQuiz(s, id, score, total, day = today()) {
  if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) return { xp: 0, coins: 0, claimed: false };
  const key = `${day}:${id}`;
  s.bestScores ||= {};
  // Older saves only recorded a boolean. Preserve those payouts unchanged.
  if (s.rewards[key] && !Number.isInteger(s.bestScores[key])) return { xp: 0, coins: 0, claimed: true };
  const previous = s.bestScores[key] || 0, improvement = Math.max(0, score - previous), played = Boolean(s.rewards[key]);
  s.bestScores[key] = Math.max(previous, score);
  s.bestScores = Object.fromEntries(Object.entries(s.bestScores).slice(-200));
  s.rewards[key] = true;
  s.rewards = Object.fromEntries(Object.entries(s.rewards).slice(-200));
  const xp = improvement * 10, coins = improvement * 5;
  s.xp += xp; s.coins += coins;
  return { xp, coins, claimed: played && improvement === 0 };
}
export function wear(s, id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item) return { ok: false, reason: 'No existe este accesorio.' };
  if (!s.owned.includes(id)) {
    if (s.coins < item.price) return { ok: false, reason: `Te faltan ${item.price - s.coins} monedas. ¡Sigue aprendiendo!` };
    s.coins -= item.price; s.owned.push(id);
  }
  s.equipped = id;
  return { ok: true };
}
