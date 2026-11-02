const QUOTA_ERRORS = new Set(['ai_quota_exhausted', 'ai_free_quota_unavailable', 'ai_daily_quota_exhausted', 'ai_rate_limited', 'ai_usage_limit', 'ai_not_configured']);
export function withQuotaFallback(primary, fallback, { clock = Date.now } = {}) {
  let primaryPausedUntil = 0;
  return { enabled: primary.enabled || fallback.enabled, provider: primary.provider, model: primary.model, fallback: { provider: fallback.provider, model: fallback.model, enabled: fallback.enabled },
    async generate(sources, topic, context = {}) {
      let contactedPrimary = false;
      try {
        if (clock() < primaryPausedUntil) throw Object.assign(new Error('El proveedor principal sigue sin cuota.'), { code: 'ai_not_configured' });
        if (!primary.enabled) throw Object.assign(new Error('El proveedor principal no está configurado.'), { code: 'ai_not_configured' });
        contactedPrimary = true;
        const game = await primary.generate(sources, topic, context);
        return { ...game, provider: primary.provider, model: primary.model };
      } catch (error) {
        if (!fallback.enabled || !QUOTA_ERRORS.has(error.code)) throw error;
        if (contactedPrimary) primaryPausedUntil = clock() + (['ai_rate_limited', 'ai_usage_limit'].includes(error.code) ? 60000 : 15 * 60000);
        context.signal?.throwIfAborted();
        // The job already reserved the first call. A real primary call means
        // reserving another slot before contacting the second provider.
        if (contactedPrimary) await context.beforeRetry?.();
        context.onProgress?.({ stage: 'fallback', provider: fallback.provider, reason: 'quota', attempt: 1 });
        const game = await fallback.generate(sources, topic, { ...context, onProgress: progress => context.onProgress?.({ ...progress, provider: fallback.provider, fallback: true }) });
        return { ...game, provider: fallback.provider, model: fallback.model };
      }
    }
  };
}
