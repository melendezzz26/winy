import { readSources, makeStudyGame } from './study.js';
import { selectMaterial } from './review.js';
import { analyze, currentName } from './connection.js';
import { providerLabel, providerDisclosure } from './providers.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const FORMATS = { trivia: 'Trivia', cards: 'Tarjetas de memoria', mixed: 'Repaso mixto', explain: 'Explicación con mis palabras' };
export function createStudyFlow({ open, dialog, getService, refresh, onGame }) {
  let cached = null, values = null, prepared = null, work = null;
  function snapshot(form) { return { topic: form.topic.value, notes: form.notes.value, mode: form.mode.value, format: form.format.value, scope: form.scope.value }; }
  function stash() { const form = dialog.querySelector('#notes-form'); if (form) { values = snapshot(form); const files = [...form.querySelector('#files').files]; if (files.length && (!cached || cached.files.length !== files.length || files.some((f, i) => cached.files[i] !== f))) { cached = { files, sources: null }; prepared = null; } } }
  function cancel() { stash(); work?.abort(); }
  function show() {
    const service = getService();
    open('Tus apuntes, tu próximo reto', `<p class="small muted">Primero revisa el texto leído y elige cómo quieres practicar.</p>
      <form id="notes-form">
      <p id="service-state" class="small muted" role="status"></p><button type="button" class="pill service-retry" data-action="retry-service">Actualizar conexión</button>
      <label for="study-mode">Cómo preparar el contenido</label><select id="study-mode" name="mode"><option value="ai" ${service.ai ? 'selected' : 'disabled'}>Ideas clave con IA</option><option value="local" ${service.ai ? '' : 'selected'}>Completar palabras · sin conexión</option></select>
      <label for="topic">¿Qué tema quieres estudiar?</label><input id="topic" name="topic" maxlength="100" placeholder="Ej. Primer militarismo en el Perú">
      <div class="upload-area"><strong>Trae tus archivos</strong><p>PDF con texto, DOCX, PPTX, TXT o Markdown<br>Hasta 5 archivos · 8 MB por archivo</p><input id="files" type="file" accept=".pdf,.docx,.pptx,.txt,.md,.markdown" multiple aria-label="Elegir archivos de apuntes"><p id="cached-files"></p></div>
      <label for="notes">O pega un fragmento de tus apuntes</label><textarea id="notes" name="notes" rows="4" maxlength="80000" placeholder="Pega varios párrafos de tu clase…"></textarea>
      <label for="review-format">Elige tu juego</label><select id="review-format" name="format"><option value="trivia">Trivia · elige una respuesta</option><option value="cards">Tarjetas · recuerda y da la vuelta</option><option value="mixed">Mixto · combina trivia y tarjetas</option><option value="explain">Con mis palabras · explica y compara</option></select>
      <p class="small muted">En todos los modos podrás repasar tus errores y volver a practicar más adelante.</p>
      <label for="study-scope">Cuánto quieres analizar</label><select id="study-scope" name="scope"><option value="fast">Lectura rápida · hasta 24.000 caracteres</option><option value="full">Documento completo · hasta 80.000 caracteres</option></select>
      <div id="source-preview"></div><p id="study-progress" class="study-progress" role="status" aria-live="polite"></p><p class="form-error" id="notes-error" role="alert"></p>
      <button type="submit" class="primary">Ver mi repaso</button><button type="button" class="secondary full" data-action="cancel-study" hidden>Cancelar preparación</button></form>
      <p class="notice">El modo IA envía el texto al servicio de Winy y a <span id="ai-provider-name">${esc(providerDisclosure(service))}</span>. Cada cita se comprueba contra los extractos. La lectura rápida distribuye extractos por el documento; puede omitir contenido. Groq analiza hasta 10.000 caracteres en extractos si el material es mayor. La opción sin conexión crea ejercicios locales. Hasta 40 páginas por PDF y 80 diapositivas por PPTX; no incluye OCR.</p>`, 'notes');
    const form = dialog.querySelector('#notes-form');
    if (values) for (const key of ['topic', 'notes', 'mode', 'format', 'scope']) form.elements[key].value = values[key];
    if (cached) form.querySelector('#cached-files').textContent = 'Archivo preparado: ' + cached.files.map(f => f.name).join(', ');
    if (prepared) preview(form, prepared.material);
    refresh();
  }
  function updateService(service, pending) {
    const form = dialog.querySelector('#notes-form'); if (!form) return;
    const option = form.querySelector('option[value=ai]'); option.disabled = !service.ai;
    form.querySelector('#service-state').textContent = pending ? 'Conectando… Puedes preparar tus apuntes mientras tanto.' : service.ai ? 'IA configurada. Revisa primero el texto que quieres estudiar.' : service.online ? 'Puedes estudiar sin conexión mientras se activa la IA.' : 'El servicio no responde. Puedes actualizar la conexión o estudiar sin conexión.';
    dialog.querySelector('#ai-provider-name').textContent = providerDisclosure(service);
    const retry = form.querySelector('[data-action=retry-service]'); retry.disabled = pending; retry.textContent = pending ? 'Conectando…' : 'Actualizar conexión';
  }
  function preview(form, material) {
    const mode = form.format.value;
    form.querySelector('#source-preview').innerHTML = `<section class="source-preview"><span class="tag">Tu archivo está leído</span><h3>${FORMATS[mode]}</h3><p>${mode === 'explain' ? 'Escribe tu explicación sin mirar. Luego compárala con la respuesta y los apuntes; tú valoras qué falta.' : mode === 'cards' ? 'Piensa tu respuesta, descubre la explicación y marca qué recordaste.' : mode === 'mixed' ? 'Alterna preguntas con tarjetas para recordar sin mirar las alternativas.' : 'Responde preguntas, recibe una explicación y vuelve a practicar tus errores.'}</p><p class="small">${material.selected.toLocaleString('es-PE')} de ${material.total.toLocaleString('es-PE')} caracteres${material.sampled ? ' · extractos distribuidos' : ' · texto completo leído'}</p><details><summary>Ver el texto detectado</summary><blockquote>${esc(material.sources[0]?.text.slice(0, 750))}<cite>${esc(material.sources[0]?.name)}</cite></blockquote></details><p class="small muted">Se crearán hasta 6 preguntas con IA, o hasta 8 ejercicios locales según el material. Podrás ver el juego antes de empezar.</p></section>`;
    form.querySelector('button[type=submit]').textContent = 'Preparar mi ' + FORMATS[mode].toLowerCase();
    form.querySelector('.source-preview').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  async function submit(form) {
    if (work) return;
    const submit = form.querySelector('button[type=submit]'), cancelButton = form.querySelector('[data-action=cancel-study]');
    const controller = new AbortController(); work = controller;
    submit.disabled = true; cancelButton.hidden = false; form.querySelector('#notes-error').textContent = '';
    const started = Date.now(); let stage = 'Leyendo tu archivo…';
    const update = () => { if (form.isConnected) form.querySelector('#study-progress').textContent = stage + ` · ${Math.floor((Date.now() - started) / 1000)} s`; };
    const timer = setInterval(update, 1000);
    form.querySelectorAll('input,select,textarea').forEach(control => { control.disabled = true; });
    try {
      stash(); values = snapshot(form);
      if (cached && !cached.sources) cached.sources = await readSources(cached.files, { signal: controller.signal, onProgress: p => { stage = p.page ? `Leyendo ${p.file}: ${p.page} de ${p.total}` : `Abriendo ${p.file}…`; update(); } });
      const sources = [...(cached?.sources || [])];
      if (values.notes.trim()) sources.push({ name: 'Apuntes pegados', text: values.notes });
      if (sources.reduce((n, s) => n + s.text.trim().length, 0) < 120) throw new Error('Agrega varios párrafos explicativos. Si el PDF es un escaneo, pega su texto; el título no basta.');
      const fingerprint = JSON.stringify(values);
      const material = selectMaterial(sources, values.scope);
      if (!prepared || prepared.fingerprint !== fingerprint) {
        prepared = { fingerprint, material }; preview(form, material); stage = 'Texto listo. Revisa la vista previa y prepara tu juego'; update(); return;
      }
      stage = values.mode === 'ai' ? 'La IA está seleccionando ideas y preparando tu repaso…' : 'Preparando ejercicios sin conexión…'; update();
      let game = values.mode === 'ai' ? await analyze(material.sources, values.topic, currentName() || 'Explorador', { signal: controller.signal, onProgress: job => { stage = job.fallback || job.stage === 'fallback' ? `Preparando tu repaso con ${providerLabel(job.provider)} como respaldo…` : job.stage === 'retrying' ? 'El proveedor está ocupado. Reintentando una vez…' : job.stage === 'validating' ? 'Comprobando preguntas y citas…' : job.attempt > 1 ? 'Preparando el repaso · segundo intento…' : 'Seleccionando ideas y creando el repaso…'; update(); } }) : makeStudyGame(material.sources, values.topic);
      controller.signal.throwIfAborted();
      if (!form.isConnected) return;
      game = { ...game, playMode: values.format, coverage: { selected: material.selected, total: material.total, sampled: material.sampled } };
      cached = null; prepared = null; values = null; onGame(game);
    } catch (error) {
      if (form.isConnected) { form.querySelector('#notes-error').textContent = controller.signal.aborted ? 'Preparación cancelada. El archivo sigue listo para continuar.' : error.message; form.querySelector('#study-progress').textContent = ''; }
    } finally {
      clearInterval(timer); if (work === controller) work = null;
      if (form.isConnected) { form.querySelectorAll('input,select,textarea').forEach(control => { control.disabled = false; }); submit.disabled = false; cancelButton.hidden = true; submit.textContent = prepared ? 'Preparar mi repaso' : 'Ver mi repaso'; }
    }
  }
  return { show, submit, cancel, updateService };
}
