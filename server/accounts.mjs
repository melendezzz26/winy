// Supabase Auth owns passwords and email verification. Only its publishable
// key is needed here; never use service_role for these user-scoped requests.
export function createAccounts({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY, transport = fetch } = {}) {
  const origin = String(url || '').replace(/\/$/, '');
  if (origin && (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(origin))) throw new Error('SUPABASE_URL debe ser la URL HTTPS de tu proyecto Supabase.');
  const enabled = Boolean(origin && key);
  function failure(message, status = 400, code = 'account_error') { const error = new Error(message); error.status = status; error.code = code; throw error; }
  async function call(route, { method = 'GET', data, token } = {}) {
    if (!enabled) failure('El acceso con correo todavía no está disponible. Puedes continuar como invitado.', 503, 'accounts_not_configured');
    let response;
    try { response = await transport(origin + route, { method, signal: AbortSignal.timeout(15000), headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}), ...(route.startsWith('/rest/') && method === 'POST' ? { Prefer: 'resolution=merge-duplicates,return=minimal' } : {}) }, body: data ? JSON.stringify(data) : undefined }); }
    catch { failure('No se pudo conectar con tu cuenta. Tus avances en este dispositivo se conservan.', 503, 'accounts_unavailable'); }
    let result = null; try { result = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 429) failure('Espera un momento antes de volver a intentar entrar o registrarte.', 429, 'account_rate_limited');
      if (['email_address_not_authorized', 'over_email_send_rate_limit', 'unexpected_failure'].includes(result?.code) && route.includes('/signup')) failure('El servicio de correo no pudo enviar la confirmación. Tu contraseña no se guardó en Winy. Reintenta más tarde.', 503, 'email_delivery_unavailable');
      if (result?.code === 'email_not_confirmed') failure('Confirma tu correo con el enlace que recibiste antes de entrar.', 403, 'email_not_confirmed');
      if (route.startsWith('/rest/')) failure('No se pudo sincronizar tu progreso. Se conserva en este dispositivo; reintenta en unos segundos.', 503, 'progress_unavailable');
      if (route.includes('token')) failure('No se pudo iniciar sesión. Revisa tu correo y contraseña.', 401, 'invalid_credentials');
      failure('No se pudo crear la cuenta. Revisa el correo, usa una contraseña de al menos 8 caracteres o intenta iniciar sesión si ya te registraste.', 400, 'signup_failed');
    }
    return result;
  }
  const credentials = (email, password) => {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || typeof password !== 'string' || password.length < 8 || password.length > 128) failure('Escribe un correo válido y una contraseña de 8 a 128 caracteres.');
    return { email: email.trim().toLowerCase(), password };
  };
  return {
    enabled,
    async signup(email, password, nickname) { return call('/auth/v1/signup', { method: 'POST', data: { ...credentials(email, password), data: { nickname: String(nickname || 'Explorador').trim().slice(0, 28) } } }); },
    async login(email, password) { return call('/auth/v1/token?grant_type=password', { method: 'POST', data: credentials(email, password) }); },
    refresh(refreshToken) { return call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', data: { refresh_token: refreshToken } }); },
    async load(userId, token) { const rows = await call(`/rest/v1/winy_progress?user_id=eq.${encodeURIComponent(userId)}&select=progress`, { token }); return rows?.[0]?.progress || null; },
    async save(userId, token, progress) { await call('/rest/v1/winy_progress?on_conflict=user_id', { method: 'POST', token, data: { user_id: userId, progress, updated_at: new Date().toISOString() } }); }
  };
}
