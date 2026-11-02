const FOCUS_DURATIONS = [30, 300, 900, 1500];
export const phaseLabel = phase => ({ focus: 'Estudio', shortBreak: 'Descanso corto', longBreak: 'Descanso largo' })[phase] || 'Estudio';
export function createFocus(duration = 1500, options = {}) {
  if (!FOCUS_DURATIONS.includes(duration)) duration = 1500;
  return { version: 2, phase: 'focus', focusDuration: duration, duration, remaining: duration, endsAt: 0, completed: 0, goal: String(options.goal || '').slice(0, 160), gameId: typeof options.gameId === 'string' ? options.gameId.slice(0, 160) : '', needsReview: false, demo: duration === 30 };
}
export function restoreFocus(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isFinite(raw.endsAt) || raw.endsAt < 0 || !Number.isFinite(raw.remaining) || raw.remaining < 0) return null;
  const focusDuration = raw.version === 2 ? raw.focusDuration : raw.duration;
  if (!FOCUS_DURATIONS.includes(focusDuration)) return null;
  const f = createFocus(focusDuration, raw);
  f.phase = ['focus', 'shortBreak', 'longBreak'].includes(raw.phase) && !f.demo ? raw.phase : 'focus';
  f.duration = f.phase === 'shortBreak' ? 300 : f.phase === 'longBreak' ? 900 : focusDuration;
  f.remaining = Math.min(f.duration, raw.remaining); f.endsAt = raw.endsAt;
  f.completed = Number.isSafeInteger(raw.completed) && raw.completed >= 0 && raw.completed <= 10000 ? raw.completed : 0;
  f.needsReview = raw.needsReview === true;
  return f;
}
export function remainingFocus(f, now = Date.now()) { return f.endsAt ? Math.max(0, Math.ceil((f.endsAt - now) / 1000)) : f.remaining; }
export function toggleFocus(f, now = Date.now()) {
  if (f.endsAt) { f.remaining = remainingFocus(f, now); f.endsAt = 0; return; }
  if (!f.remaining) f.remaining = f.duration;
  f.endsAt = now + f.remaining * 1000;
}
export function advanceFocus(f, now = Date.now()) {
  if (!f?.endsAt || f.endsAt > now) return null;
  const endedAt = f.endsAt; f.endsAt = 0;
  if (f.demo) { f.remaining = 0; return { type: 'demo' }; }
  if (f.phase === 'focus') {
    f.completed++;
    const session = { id: `pomo-${endedAt}-${f.completed}`, endedAt, minutes: f.focusDuration / 60, goal: f.goal, gameId: f.gameId, outcome: 'pending' };
    f.phase = f.completed % 4 === 0 ? 'longBreak' : 'shortBreak';
    f.duration = f.phase === 'longBreak' ? 900 : 300; f.remaining = f.duration;
    return { type: 'study', session };
  }
  f.phase = 'focus'; f.duration = f.focusDuration; f.remaining = f.duration; f.needsReview = true;
  return { type: 'break' };
}
export function restoreStudySessions(value) {
  return Array.isArray(value) ? value.filter(s => s && typeof s.id === 'string' && Number.isFinite(s.endedAt) && [5, 15, 25].includes(s.minutes)).slice(-60).map(s => ({ id: s.id.slice(0, 80), endedAt: s.endedAt, minutes: s.minutes, goal: String(s.goal || '').slice(0, 160), gameId: typeof s.gameId === 'string' ? s.gameId.slice(0, 160) : '', outcome: ['achieved', 'partial'].includes(s.outcome) ? s.outcome : 'pending' })) : [];
}
