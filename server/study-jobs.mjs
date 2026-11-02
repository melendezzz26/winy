import { randomUUID, createHash } from 'node:crypto';

export function createStudyJobs({ generate, save, reserve, clock = Date.now }) {
  const jobs = new Map();
  const view = job => ({ id: job.id, status: job.status, stage: job.stage, attempt: job.attempt, elapsed: Math.max(0, clock() - job.created), ...(job.provider ? { provider: job.provider, fallback: job.fallback } : {}), ...(job.game ? { game: job.game } : {}), ...(job.error ? { error: job.error, code: job.code } : {}) });
  const clean = () => { for (const [id, job] of jobs) if (job.finished && clock() - job.finished > 600000) jobs.delete(id); };
  function start(owner, sources, topic) {
    clean();
    const digest = createHash('sha256').update(JSON.stringify({ sources, topic })).digest('hex');
    const same = [...jobs.values()].find(j => j.owner === owner && j.digest === digest && ['running', 'completed'].includes(j.status));
    if (same) return view(same);
    if ([...jobs.values()].some(j => j.owner === owner && j.status === 'running')) { const error = new Error('Ya tienes un repaso preparándose. Termínalo o cancélalo antes de crear otro.'); error.status = 409; throw error; }
    if ([...jobs.values()].filter(j => j.status === 'running').length >= 2) { const error = new Error('Hay dos repasos preparándose. Reintenta en unos segundos; tu archivo sigue listo.'); error.status = 429; throw error; }
    reserve(owner);
    const job = { id: randomUUID(), owner, digest, status: 'running', stage: 'generating', attempt: 1, created: clock(), controller: new AbortController() };
    jobs.set(job.id, job);
    const deadline = setTimeout(() => job.controller.abort(new Error('ai_timeout')), 60000);
    job.done = (async () => {
      try {
        const game = await generate(sources, topic, { signal: job.controller.signal, beforeRetry: () => reserve(owner), onProgress: progress => { job.stage = progress.stage; job.attempt = progress.attempt || job.attempt; if (progress.provider) job.provider = progress.provider; if (progress.fallback || progress.stage === 'fallback') job.fallback = true; } });
        job.controller.signal.throwIfAborted();
        save(owner, game); job.game = game; job.status = 'completed'; job.stage = 'completed';
      } catch (error) {
        if (job.controller.signal.aborted) { job.status = job.stage === 'cancelled' ? 'cancelled' : 'failed'; job.code = job.status === 'cancelled' ? 'cancelled' : 'ai_timeout'; job.error = job.status === 'cancelled' ? 'Preparación cancelada. Tu archivo sigue listo.' : 'La IA tardó demasiado. Prueba el análisis rápido o reintenta con tus apuntes ya preparados.'; }
        else { job.status = 'failed'; job.code = error.code || 'ai_invalid_output'; job.error = error.status || /^(La |El |No )/.test(error.message) ? error.message : 'No se pudo preparar el repaso. Tu archivo sigue listo para reintentar.'; }
      } finally { clearTimeout(deadline); job.finished = clock() || 1; }
    })();
    return view(job);
  }
  function get(id, owner) { clean(); const job = jobs.get(id); return job?.owner === owner ? view(job) : null; }
  function cancel(id, owner) { const job = jobs.get(id); if (job?.owner !== owner) return null; if (job.status === 'running') { job.stage = 'cancelled'; job.controller.abort(); } return view(job); }
  return { start, get, cancel, async close() { const active = [...jobs.values()]; active.forEach(j => j.controller.abort()); await Promise.allSettled(active.map(j => j.done)); jobs.clear(); } };
}
