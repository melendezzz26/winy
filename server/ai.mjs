import { randomUUID } from 'node:crypto';
import { createGemini } from './gemini.mjs';
import { requestModel } from './inference.mjs';
import { createGroq } from './groq.mjs';
import { withQuotaFallback } from './fallback.mjs';
import { createCitationVerifier, CitationError, analysisSources } from './citations.mjs';
import { teachingInstructions } from './teaching.mjs';

const citation = {
  type: 'object', additionalProperties: false,
  properties: { source_id: { type: 'integer', minimum: 0 }, quote_id: { type: 'integer', minimum: 0 } },
  required: ['source_id', 'quote_id']
};
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    insufficient_material: { type: 'boolean' }, title: { type: 'string' }, summary: { type: 'string' },
    key_points: { type: 'array', maxItems: 8, items: {
      type: 'object', additionalProperties: false,
      properties: { idea: { type: 'string' }, ...citation.properties }, required: ['idea', ...citation.required]
    } },
    questions: { type: 'array', maxItems: 8, items: {
      type: 'object', additionalProperties: false,
      properties: { prompt: { type: 'string' }, options: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 }, answer: { type: 'integer', minimum: 0, maximum: 2 }, explanation: { type: 'string' }, skill: { type: 'string', enum: ['recall', 'understand', 'apply'] }, ...citation.properties },
      required: ['prompt', 'options', 'answer', 'explanation', 'skill', ...citation.required]
    } }
  },
  required: ['insufficient_material', 'title', 'summary', 'key_points', 'questions']
};
const compact = s => s.replace(/\s+/g, ' ').trim();
export class AIServiceError extends Error {
  constructor(message, status, code) { super(message); this.name = 'AIServiceError'; this.status = status; this.code = code; }
}
async function providerFailure(response) {
  let info;
  try { info = (await response.json()).error; } catch { info = null; }
  const code = info?.code, type = info?.type;
  if (code === 'insufficient_quota' || type === 'insufficient_quota' || code === 'billing_hard_limit_reached' || code === 'billing_not_active') {
    return new AIServiceError('OpenAI indica que no hay cuota disponible. Revisa el saldo, la facturación y los límites del proyecto de la API.', 503, 'ai_quota_exhausted');
  }
  if (response.status === 429 && (code === 'rate_limit_exceeded' || type === 'rate_limit_exceeded')) {
    return new AIServiceError('Hay demasiadas solicitudes a OpenAI en este momento. Espera un poco y vuelve a intentarlo.', 429, 'ai_rate_limited');
  }
  if (response.status === 429) return new AIServiceError('OpenAI rechazó la solicitud por un límite de uso. Revisa la cuota del proyecto o inténtalo más tarde.', 429, 'ai_usage_limit');
  if (response.status === 401 || code === 'invalid_api_key') return new AIServiceError('La clave de OpenAI del servidor no es válida. Revisa WINY_AI_KEY en la configuración segura del servidor.', 503, 'ai_invalid_key');
  if (response.status === 404 || code === 'model_not_found') return new AIServiceError('El modelo configurado no está disponible para este proyecto. Revisa WINY_AI_MODEL y sus permisos.', 503, 'ai_model_unavailable');
  if (response.status === 403) return new AIServiceError('El proyecto de OpenAI no tiene permiso para completar este análisis. Revisa sus permisos y verificación.', 503, 'ai_access_denied');
  if (response.status === 400) return new AIServiceError('OpenAI rechazó la configuración del análisis. Revisa el modelo y los parámetros del servidor.', 503, 'ai_configuration_error');
  return new AIServiceError('El proveedor de IA no está disponible en este momento. Inténtalo más tarde.', 502, 'ai_provider_unavailable');
}
export function validateAnalysis(result, sources) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('La IA devolvió un análisis incompleto. Inténtalo de nuevo.');
  if (result.insufficient_material) throw new Error('El material no contiene suficientes ideas explicadas para crear una trivia. Agrega el contenido de la clase.');
  if (typeof result.summary !== 'string' || !result.summary.trim() || !Array.isArray(result.key_points) || result.key_points.length < 2 || !Array.isArray(result.questions) || result.questions.length < 2 || result.questions.length > 8) throw new Error('La IA devolvió un análisis incompleto. Inténtalo de nuevo.');
  const evidence = createCitationVerifier(sources);
  let omittedKeyPoints = 0, omittedQuestions = 0, citationFailure;
  function verified(item) { try { return evidence(item); } catch (error) { if (!(error instanceof CitationError)) throw error; citationFailure = error; return null; } }
  const keyPoints = result.key_points.slice(0, 8).flatMap(p => {
    if (!p || typeof p !== 'object' || typeof p.idea !== 'string' || !p.idea.trim()) throw new Error('El análisis no contiene una idea válida.');
    const quote = verified(p); if (!quote) { omittedKeyPoints++; return []; }
    return [{ idea: p.idea.trim(), ...quote }];
  });
  const questions = result.questions.flatMap(q => {
    if (!q || typeof q !== 'object' || typeof q.prompt !== 'string' || !q.prompt.trim() || !Array.isArray(q.options) || q.options.length !== 3 || q.options.some(o => typeof o !== 'string' || !o.trim()) || new Set(q.options.map(o => compact(o).toLowerCase())).size !== 3 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 2 || typeof q.explanation !== 'string' || !q.explanation.trim()) throw new Error('La IA devolvió una pregunta no válida. Inténtalo de nuevo.');
    if (q.skill !== undefined && !['recall', 'understand', 'apply'].includes(q.skill)) throw new Error('La IA devolvió una habilidad de estudio no válida.');
    const quote = verified(q); if (!quote) { omittedQuestions++; return []; }
    return [{ skill: q.skill || 'recall', prompt: q.prompt.trim(), options: q.options.map(o => o.trim()), answer: q.answer, explanation: q.explanation.trim(), ...quote }];
  });
  if (questions.length < 2 || !keyPoints.length) throw citationFailure || new Error('El análisis no contiene suficientes preguntas respaldadas.');
  const distinct = [...new Map(questions.map(q => [compact(q.prompt).toLowerCase(), q])).values()];
  if (distinct.length < 2) throw new Error('La IA repitió las preguntas. Inténtalo con otro fragmento de tu clase.');
  return { id: `ai-${randomUUID()}`, title: String(result.title || 'Mi clase').slice(0, 100), icon: '📚', category: 'Ideas clave · IA', summary: result.summary.trim(), keyPoints, questions: distinct, ...(omittedQuestions || omittedKeyPoints ? { quality: { omittedQuestions, omittedKeyPoints } } : {}) };
}

export function createAI(options = {}) {
  const geminiKey = process.env.WINY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  const groqKey = process.env.WINY_GROQ_KEY || process.env.GROQ_API_KEY;
  const provider = String(options.provider ?? (process.env.WINY_AI_PROVIDER || (geminiKey ? 'gemini' : groqKey ? 'groq' : 'openai'))).trim().toLowerCase();
  const primary = createProvider(provider, options);
  const fallback = String(options.fallbackProvider ?? process.env.WINY_AI_FALLBACK ?? '').trim().toLowerCase();
  if (!fallback || fallback === provider) return primary;
  if (!['gemini', 'groq'].includes(fallback)) throw new Error('WINY_AI_FALLBACK admite gemini o groq. No se selecciona automáticamente un proveedor de pago.');
  return withQuotaFallback(primary, createProvider(fallback, options.fallbackOptions || {}));
}
function createProvider(provider, options) {
  const geminiKey = process.env.WINY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (provider === 'gemini') return createGemini({ key: options.key ?? geminiKey, model: options.model ?? (process.env.WINY_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash'), transport: options.transport ?? fetch, reportDiagnostic: options.reportDiagnostic, schema, validateAnalysis, ServiceError: AIServiceError });
  if (provider === 'groq') return createGroq({ key: options.key ?? (process.env.WINY_GROQ_KEY || process.env.GROQ_API_KEY), model: options.model ?? (process.env.WINY_GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-20b'), transport: options.transport ?? fetch, schema, validateAnalysis, ServiceError: AIServiceError });
  if (provider === 'openai') return createOpenAI(options);
  throw new Error('WINY_AI_PROVIDER debe ser openai, gemini o groq.');
}

function createOpenAI({ key = process.env.WINY_AI_KEY, model = process.env.WINY_AI_MODEL || 'gpt-5.4-mini', transport = fetch } = {}) {
  return {
    enabled: Boolean(key), model, provider: 'openai',
    async generate(sources, topic, context = {}) {
      if (!key) throw new Error('La función de IA aún no está activada en el servidor.');
      const response = await requestModel(transport, 'https://api.openai.com/v1/responses', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, store: false, max_output_tokens: 4096, reasoning: { effort: 'low' },
          instructions: teachingInstructions,
          input: JSON.stringify({ topic, sources: analysisSources(sources) }),
          text: { format: { type: 'json_schema', name: 'winy_study', strict: true, schema } }
        })
      }, context, AIServiceError);
      if (!response.ok) throw await providerFailure(response);
      context.onProgress?.({ stage: 'validating' });
      const data = await response.json();
      if (data.status && data.status !== 'completed') throw new Error('El análisis no se completó. Prueba con un fragmento más corto.');
      const output = (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('');
      let result;
      try { result = JSON.parse(output); } catch { throw new Error('La IA no devolvió un análisis válido.'); }
      return validateAnalysis(result, sources);
    }
  };
}
