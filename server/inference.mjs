import { setTimeout as wait } from 'node:timers/promises';

// Transient failures and a recognized optional-setting incompatibility can
// share ONE retry, on the same model and key, within the same deadline.
// The callback reserves a second quota slot before a second outbound call.
export async function requestModel(transport, url, init, context, ServiceError) {
  const extended = context.questionCount === 20 ? 60000 : context.questionCount === 12 ? 40000 : 27000;
  const deadline = Date.now() + Math.max(55000, extended * 2 - 1000);
  for (let attempt = 0; attempt < 2; attempt++) {
    context.signal?.throwIfAborted();
    context.onProgress?.({ stage: 'generating', attempt: attempt + 1 });
    const signal = AbortSignal.any([AbortSignal.timeout(Math.min(extended, Math.max(1, deadline - Date.now()))), ...(context.signal ? [context.signal] : [])]);
    let response;
    try { response = await transport(url, { ...init, signal }); }
    catch (error) {
      if (context.signal?.aborted) throw error;
      if (signal.aborted) throw new ServiceError('La IA tardó demasiado. Tus apuntes siguen preparados: prueba el análisis rápido o vuelve a intentarlo.', 504, 'ai_timeout');
      throw new ServiceError('No se pudo conectar con el proveedor de IA. Tus apuntes siguen preparados para reintentar.', 503, 'ai_provider_unavailable');
    }
    const replacement = attempt === 0 && response.status === 400 ? await context.adaptRequest?.(response, init) : null;
    if (attempt === 0 && ([502, 503, 504].includes(response.status) || replacement) && deadline - Date.now() > 5000) {
      await response.body?.cancel();
      await context.beforeRetry?.();
      if (replacement) init = replacement;
      context.onProgress?.({ stage: 'retrying', attempt: 2, ...(replacement ? { reason: 'compatibility' } : {}) });
      await wait(context.retryDelayMs ?? 900, undefined, { signal: context.signal });
      continue;
    }
    return response;
  }
}
