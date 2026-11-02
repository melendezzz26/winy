import { questionTarget } from './question-count.js';
export const MAX_FILES = 5;
export const MAX_BYTES = 8 * 1024 * 1024;
export function normalize(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
const STOP = new Set('para como esta este estas estos entre sobre porque cuando donde desde hasta tiene tienen puede pueden una unas unos del las los que con por sus son ser más muy pero también'.split(' '));
export function makeStudyGame(sources, topic = '', requestedCount) {
  const count = questionTarget(requestedCount);
  const candidates = [];
  for (const source of sources) {
    const cleaned = source.text.replace(/\r/g, '').replace(/\s+/g, ' ').trim();
    const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    for (const raw of sentences) {
      const evidence = raw.trim();
      if (evidence.length < 55 || evidence.length > 600 || evidence.split(/\s+/).length < 10) continue;
      const words = evidence.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{5,}/g) || [];
      const usable = words.filter(w => !STOP.has(normalize(w)));
      if (!usable.length) continue;
      const expected = [...usable].sort((a, b) => b.length - a.length)[0];
      const at = evidence.indexOf(expected);
      const prompt = evidence.slice(0, at) + '________' + evidence.slice(at + expected.length);
      candidates.push({ prompt, expected, evidence, source: source.name, rank: topic ? normalize(evidence).split(' ').filter(w => normalize(topic).split(' ').includes(w)).length : 0 });
    }
  }
  const unique = [...new Map(candidates.map(q => [normalize(q.evidence), q])).values()].sort((a, b) => b.rank - a.rank);
  if (unique.length < 2) throw new Error('Necesitamos al menos dos frases explicativas completas. Pega varios párrafos de tu clase; no basta con el título.');
  const questions = unique.slice(0, count).map(({ rank, ...q }) => q);
  let hash = 0;
  for (const c of questions.map(q => q.evidence).join('')) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return { id: `notes-${(hash >>> 0).toString(36)}`, title: topic.trim().slice(0, 100) || 'Mi aventura de estudio', icon: '📚', category: 'Tus apuntes · Completar palabras', requestedCount: count, questions };
}
export function checkStudyAnswer(answer, expected) { return normalize(answer) === normalize(expected); }
export async function readSources(files, { signal, onProgress } = {}) {
  if (files.length > MAX_FILES) throw new Error('Puedes subir un máximo de 5 archivos a la vez.');
  for (const f of files) {
    if (f.size > MAX_BYTES) throw new Error(`«${f.name}» supera el límite de 8 MB.`);
    if (!/\.(txt|md|markdown|pdf|docx|pptx)$/i.test(f.name)) throw new Error(`«${f.name}»: usa PDF, DOCX, PPTX, TXT o Markdown. Para otros formatos, copia el texto y pégalo debajo.`);
  }
  const sources = [];
  for (const file of files) {
    signal?.throwIfAborted(); onProgress?.({ file: file.name, stage: 'reading' });
    if (/\.(txt|md|markdown)$/i.test(file.name)) sources.push({ name: file.name, text: await file.text() });
    else {
      const { readDocument } = await import('./documents.js');
      sources.push(...await readDocument(file, { signal, onProgress }));
    }
  }
  return sources;
}
