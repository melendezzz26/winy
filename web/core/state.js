import { PETS, ITEMS } from './data.js';
export const STORAGE_KEY = 'winy.v1';
export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function initialState() {
  return { version: 1, onboarded: false, pet: 'cuy', names: Object.fromEntries(PETS.map(p => [p.id, p.defaultName])), xp: 0, coins: 90, owned: ['natural'], equipped: 'natural', habits: {}, rewards: {}, visited: [], games: [], matches: [], focus: null };
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
      equipped: owned.includes(s.equipped) ? s.equipped : 'natural',
      xp: Number.isSafeInteger(s.xp) && s.xp >= 0 ? s.xp : 0,
      coins: Number.isSafeInteger(s.coins) && s.coins >= 0 ? s.coins : 90,
      habits: Object.fromEntries(Object.entries(validRecord(s.habits)).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, [...new Set(v.filter(x => ['food', 'focus', 'move'].includes(x)))]])),
      rewards: Object.fromEntries(Object.entries(validRecord(s.rewards)).filter(([, v]) => v === true)),
      visited: Array.isArray(s.visited) ? s.visited.filter(x => typeof x === 'string').slice(-100) : [],
      games: Array.isArray(s.games) ? s.games.filter(g => g && typeof g.title === 'string' && Array.isArray(g.questions) && g.questions.length && g.questions.every(q => typeof q.prompt === 'string' && typeof q.evidence === 'string' && (typeof q.expected === 'string' || (Array.isArray(q.options) && q.options.length === 3 && q.options.every(o => typeof o === 'string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3)))).slice(-10) : [],
      matches: Array.isArray(s.matches) ? s.matches.filter(m => m && typeof m.code === 'string' && typeof m.opponent === 'string' && Number.isInteger(m.mine) && Number.isInteger(m.theirs) && Number.isFinite(m.played)).slice(-20) : [],
      focus: s.focus && Number.isFinite(s.focus.endsAt) && Number.isFinite(s.focus.remaining) && s.focus.remaining >= 0 && [30, 300, 1500].includes(s.focus.duration) ? s.focus : null
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
  if (s.rewards[key]) return { xp: 0, coins: 0, claimed: true };
  s.rewards[key] = true;
  s.rewards = Object.fromEntries(Object.entries(s.rewards).slice(-200));
  const xp = score * 10, coins = score * 5;
  s.xp += xp; s.coins += coins;
  return { xp, coins, claimed: false };
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
