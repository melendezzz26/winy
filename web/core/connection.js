const KEY = 'winy.connection.v1';
let identity;
try { identity = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { identity = null; }
function base() {
  return typeof window.WinyAndroid?.getApiBase === 'function' ? window.WinyAndroid.getApiBase().replace(/\/$/, '') : location.origin;
}
export async function request(path, { method = 'GET', data, auth = true } = {}) {
  const url = base();
  if (!url) throw new Error('El servicio en línea aún no está activado en esta versión de Winy.');
  if (auth && !identity?.token) throw new Error('Escribe tu nombre para entrar a la sala.');
  let response;
  try { response = await fetch(url + '/api' + path, { method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${identity.token}` } : {}) }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(path === '/study' ? 100000 : path === '/status' ? 60000 : 12000) }); }
  catch { throw new Error('No pudimos conectar con Winy. Comprueba tu conexión e inténtalo de nuevo.'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('El servicio de Winy no está disponible en este momento.'); }
  if (!response.ok) { if (response.status === 401) { identity = null; try { localStorage.removeItem(KEY); } catch {} } const error = new Error(payload.error || 'No se pudo completar la solicitud.'); error.status = response.status; throw error; }
  return payload;
}
export const serviceStatus = () => request('/status', { auth: false });
export const currentName = () => identity?.nickname || '';
export async function identify(nickname) {
  if (identity?.token) {
    if (identity.nickname !== nickname) {
      const profile = await request('/profile', { method: 'POST', data: { nickname } }); identity.nickname = profile.nickname;
      try { localStorage.setItem(KEY, JSON.stringify(identity)); } catch {}
    }
    return identity;
  }
  identity = await request('/players', { method: 'POST', data: { nickname }, auth: false });
  try { localStorage.setItem(KEY, JSON.stringify(identity)); } catch {}
  return identity;
}
export async function analyze(sources, topic, nickname) { await identify(nickname); return request('/study', { method: 'POST', data: { sources, topic } }); }
