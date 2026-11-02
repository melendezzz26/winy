const DAY = 86400000;
export function questionKey(question) {
  let hash = 0;
  for (const char of question.prompt + '\n' + (question.expected || question.options?.[question.answer] || '')) hash = Math.imul(hash, 31) + char.charCodeAt(0) | 0;
  return (hash >>> 0).toString(36);
}
export function restoreReviews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, records]) => typeof id === 'string' && !['__proto__', 'constructor', 'prototype'].includes(id) && records && typeof records === 'object' && !Array.isArray(records)).slice(-40).map(([id, records]) => [id, Object.fromEntries(Object.entries(records).filter(([key, r]) => /^[a-z0-9]{1,8}$/.test(key) && r && Number.isInteger(r.attempts) && r.attempts > 0 && r.attempts < 100000 && Number.isInteger(r.streak) && r.streak >= 0 && r.streak <= 10 && Number.isFinite(r.dueAt) && typeof r.correct === 'boolean').slice(-50))]));
}
export function recordReview(state, game, question, correct, now = Date.now(), confidence = 'sure') {
  state.reviews ||= {}; const records = state.reviews[game.id] ||= {};
  const key = questionKey(question), old = records[key];
  confidence = confidence === 'sure' ? 'sure' : 'unsure';
  const confident = correct && confidence === 'sure';
  const alreadyScheduled = confident && old?.correct && old.confidence !== 'unsure' && old.dueAt > now;
  const streak = confident ? alreadyScheduled ? old.streak : Math.min(10, (old?.streak || 0) + 1) : 0;
  records[key] = { attempts: Math.min(99999, (old?.attempts || 0) + 1), streak, correct, confidence, dueAt: alreadyScheduled ? old.dueAt : now + (confident ? [DAY, 3 * DAY, 7 * DAY, 14 * DAY][Math.min(3, streak - 1)] : correct ? 10 * 60000 : 60000) };
  state.reviews = Object.fromEntries(Object.entries(state.reviews).slice(-40));
}
export function reviewQuestions(state, game, { errorsOnly = false, now = Date.now() } = {}) {
  const records = state.reviews?.[game.id] || {};
  return game.questions.filter(q => { const record = records[questionKey(q)]; return record && (errorsOnly ? !record.correct || record.confidence === 'unsure' : !record.correct || record.dueAt <= now); });
}
export function reviewCount(state) { return state.games.reduce((n, game) => n + reviewQuestions(state, game).length, 0); }

export function selectMaterial(sources, scope = 'fast') {
  const cleaned = sources.filter(s => s.text.trim()).map(s => ({ ...s, text: s.text.trim() }));
  const total = cleaned.reduce((n, s) => n + s.text.length, 0);
  if (scope === 'full' || total <= 24000) {
    if (total > 80000) throw new Error('El documento completo supera 80.000 caracteres. Elige lectura rápida o un fragmento más pequeño.');
    return { sources: cleaned, total, selected: total, sampled: false };
  }
  // Distributed literal excerpts keep the beginning, middle and end of each
  // page. Selection is shown as sampling, never presented as semantic analysis.
  const allowance = Math.max(45, Math.floor(23500 / cleaned.length));
  const sampled = cleaned.flatMap(source => {
    if (source.text.length <= allowance) return [source];
    const length = Math.floor((allowance - 12) / 3), text = source.text;
    const at = [0, Math.max(0, Math.floor(text.length / 2 - length / 2)), Math.max(0, text.length - length)];
    return at.map((start, index) => ({ name: `${source.name} · extracto ${index + 1}`, text: text.slice(start, start + length) }));
  });
  return { sources: sampled, total, selected: sampled.reduce((n, s) => n + s.text.length, 0), sampled: true };
}
