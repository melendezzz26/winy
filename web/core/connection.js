const KEY = 'winy.connection.v1';
let identity;
try { identity = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { identity = null; }
let syncAllowed = true, pendingProgress = null, syncTask = null;
const rememberIdentity = () => { try { identity ? localStorage.setItem(KEY, JSON.stringify(identity)) : localStorage.removeItem(KEY); } catch {} };
function base() {
  return typeof window.WinyAndroid?.getApiBase === 'function' ? window.WinyAndroid.getApiBase().replace(/\/$/, '') : location.origin;
}
export async function request(path, { method = 'GET', data, auth = true, signal } = {}) {
  const url = base();
  if (!url) throw new Error('El servicio en línea aún no está activado en esta versión de Winy.');
  if (auth && !identity?.token) throw new Error('Escribe tu nombre para entrar a la sala.');
  let response;
  try { response = await fetch(url + '/api' + path, { method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${identity.token}` } : {}) }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.any([AbortSignal.timeout(path === '/status' ? 60000 : path.startsWith('/auth/') || path === '/account/progress' ? 20000 : 15000), ...(signal ? [signal] : [])]) }); }
  catch (error) { if (signal?.aborted) throw error; throw new Error('No pudimos conectar con Winy. Comprueba tu conexión e inténtalo de nuevo.'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('El servicio de Winy no está disponible en este momento.'); }
  if (!response.ok) {
    if (response.status === 401 && auth) {
      if (identity?.account) { identity.token = null; window.dispatchEvent(new CustomEvent('winy-session-expired')); }
      else identity = null;
      rememberIdentity();
    }
    const error = new Error(payload?.error || 'No se pudo completar la solicitud.'); error.status = response.status; error.code = payload?.code; throw error;
  }
  return payload;
}
export const serviceStatus = () => request('/status', { auth: false });
export const currentName = () => identity?.nickname || '';
export const currentAccount = () => identity?.account || null;
export const hasSession = () => Boolean(identity?.token);
export async function identify(nickname) {
  if (identity?.account && !identity.token) { const error = new Error('Vuelve a iniciar sesión con tu correo para continuar.'); error.status = 401; throw error; }
  if (identity?.token) {
    if (identity.nickname !== nickname) {
      try { const profile = await request('/profile', { method: 'POST', data: { nickname } }); identity.nickname = profile.nickname; rememberIdentity(); }
      catch (error) { if (error.status !== 401 || identity?.account) throw error; return identify(nickname); }
    }
    return identity;
  }
  identity = await request('/players', { method: 'POST', data: { nickname }, auth: false });
  rememberIdentity();
  return identity;
}
export async function analyze(sources, topic, nickname, { signal, onProgress } = {}) {
  await identify(nickname);
  const account = currentAccount();
  let job;
  try { job = await request('/study', { method: 'POST', data: { sources, topic, background: true }, signal }); }
  catch (error) { if (error.status !== 401 || account) throw error; await identify(nickname); job = await request('/study', { method: 'POST', data: { sources, topic, background: true }, signal }); }
  if (job.questions) return job; // Compatible with the previous deployed API.
  const deadline = Date.now() + 70000;
  const cancel = () => { request(`/study/jobs/${job.id}/cancel`, { method: 'POST', data: {} }).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (Date.now() < deadline) {
      signal?.throwIfAborted(); onProgress?.(job);
      if (job.status === 'completed') return job.game;
      if (job.status === 'failed' || job.status === 'cancelled') { const error = new Error(job.error); error.code = job.code; throw error; }
      await new Promise((resolve, reject) => { const timer = setTimeout(done, 1200); function done() { signal?.removeEventListener('abort', abort); resolve(); } function abort() { clearTimeout(timer); reject(signal.reason); } signal?.addEventListener('abort', abort, { once: true }); });
      job = await request(`/study/jobs/${job.id}`, { signal });
    }
    cancel(); throw new Error('El repaso tardó demasiado. Tus apuntes siguen listos; vuelve a intentarlo.');
  } finally { signal?.removeEventListener('abort', cancel); }
}
export async function signIn(email, password, nickname, register = false) {
  const result = await request(register ? '/auth/register' : '/auth/login', { method: 'POST', data: { email, password, nickname }, auth: false });
  if (result.token) { identity = { token: result.token, nickname: result.nickname, account: result.account }; syncAllowed = !result.syncPending; rememberIdentity(); }
  return result;
}
export async function signOut() { try { if (identity?.token) await request('/auth/logout', { method: 'POST', data: {} }); } catch {} finally { identity = null; pendingProgress = null; syncAllowed = true; rememberIdentity(); } }
export async function pullProgress() { const result = await request('/account/progress'); syncAllowed = true; return result.progress; }
export async function syncProgress(progress) {
  if (!currentAccount()) return;
  if (!syncAllowed || !identity?.token) throw new Error('Recupera tu sesión y tu progreso antes de sincronizar.');
  pendingProgress = structuredClone(progress);
  if (syncTask) return syncTask;
  syncTask = (async () => { while (pendingProgress) { const next = pendingProgress; pendingProgress = null; try { await request('/account/progress', { method: 'POST', data: { progress: next } }); } catch (error) { pendingProgress ||= next; throw error; } } })().finally(() => { syncTask = null; });
  return syncTask;
}
