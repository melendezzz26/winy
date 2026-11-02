export function providerLabel(provider) { return ({ gemini: 'Google Gemini', groq: 'Groq', openai: 'OpenAI' })[provider] || 'el proveedor de IA'; }
export function providerDisclosure(service) {
  const primary = providerLabel(service.provider);
  return service.fallback?.enabled ? `${primary} y, si se agota su cuota, a ${providerLabel(service.fallback.provider)}` : primary;
}
