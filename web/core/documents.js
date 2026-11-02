const MAX_XML = 8 * 1024 * 1024;
const MAX_TOTAL_XML = 24 * 1024 * 1024;
function parseXML(bytes) {
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('El documento contiene XML no válido.');
  return [...xml.getElementsByTagNameNS('*', 'p')].map(p => [...p.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join('')).join('\n');
}
async function readOffice(file, { signal, onProgress }) {
  signal?.throwIfAborted();
  const { unzipSync } = await import('../vendor/fflate.mjs');
  const word = /\.docx$/i.test(file.name);
  let declared = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter(info) {
      const slide = /^ppt\/slides\/slide(\d+)\.xml$/.exec(info.name);
      const wanted = word ? info.name === 'word/document.xml' : slide && Number(slide[1]) <= 80;
      if (!wanted) return false;
      declared += info.originalSize;
      if (info.originalSize > MAX_XML || declared > MAX_TOTAL_XML) throw new Error('El documento expandido es demasiado grande. Usa un fragmento más pequeño.');
      return true;
    }
  });
  const keys = Object.keys(files).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  if (!keys.length) throw new Error('No se encontró texto de Word o PowerPoint en el archivo.');
  return keys.map((key, index) => { signal?.throwIfAborted(); onProgress?.({ file: file.name, page: index + 1, total: keys.length, stage: 'reading' }); return { name: word ? file.name : `${file.name} · diapositiva ${key.match(/slide(\d+)/)[1]}`, text: parseXML(files[key]) }; });
}
async function readPDF(file, { signal, onProgress }) {
  const pdfjs = await import('../vendor/pdf.mjs');
  signal?.throwIfAborted();
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.mjs', import.meta.url).href;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: new URL('../vendor/cmaps/', import.meta.url).href,
    standardFontDataUrl: new URL('../vendor/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('../vendor/wasm/', import.meta.url).href,
    cMapPacked: true, useWasm: false, isEvalSupported: false
  });
  const abort = () => { task.destroy().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    signal?.throwIfAborted();
    const doc = await task.promise;
    const sources = [];
    for (let page = 1; page <= Math.min(doc.numPages, 40); page++) {
      signal?.throwIfAborted(); onProgress?.({ file: file.name, page, total: Math.min(doc.numPages, 40), stage: 'reading' });
      const content = await (await doc.getPage(page)).getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
      sources.push({ name: `${file.name} · página ${page}`, text });
    }
    if (!sources.some(s => s.text.trim().length > 30)) throw new Error('El PDF no contiene texto legible. Si es un escaneo, pega el texto de tu clase.');
    return sources;
  } finally { signal?.removeEventListener('abort', abort); await task.destroy(); }
}
export async function readDocument(file, options = {}) {
  try { return /\.pdf$/i.test(file.name) ? await readPDF(file, options) : await readOffice(file, options); }
  catch (err) {
    if (options.signal?.aborted) throw err;
    if (err.name === 'PasswordException') throw new Error(`«${file.name}» está protegido con contraseña. Usa una copia sin contraseña.`);
    throw new Error(`No pudimos leer «${file.name}». ${err.message}`);
  }
}
