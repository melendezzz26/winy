export class CitationError extends Error {}
const invalid = () => new CitationError('No pudimos verificar una cita del análisis. No se guardaron preguntas sin respaldo.');

export function sourcePassages(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const passages = [];
  for (const sentence of sentences) {
    let rest = sentence.trim();
    while (rest.length > 350) {
      const space = rest.lastIndexOf(' ', 340), end = space >= 150 ? space : 340;
      const part = rest.slice(0, end).trim(); if (part.length >= 15) passages.push(part);
      rest = rest.slice(end).trim();
    }
    if (rest.length >= 15) passages.push(rest);
  }
  return passages;
}
export function analysisSources(sources) {
  return sources.map((source, source_id) => ({ source_id, name: source.name, passages: sourcePassages(source.text).map((text, quote_id) => ({ quote_id, text })) }));
}

function comparable(text) {
  let value = ''; const starts = [], ends = [];
  for (let offset = 0; offset < text.length;) {
    // Numeric reference markers and invisible typesetting characters do not
    // change the words. Offsets still point back to the ORIGINAL source.
    const reference = /^\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/.exec(text.slice(offset, offset + 50));
    if (reference) { offset += reference[0].length; continue; }
    const from = offset, char = String.fromCodePoint(text.codePointAt(offset)); offset += char.length;
    const normalized = char.normalize('NFKC').replace(/[\u00ad\u200b\ufeff]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    for (const codepoint of normalized) {
      const part = /\s/.test(codepoint) ? ' ' : codepoint;
      if (part === ' ' && value.endsWith(' ')) { ends[ends.length - 1] = offset; continue; }
      value += part; for (let i = 0; i < part.length; i++) { starts.push(from); ends.push(offset); }
    }
  }
  return { value, starts, ends };
}
export function createCitationVerifier(sources) {
  const cache = new Map(), passages = new Map();
  function find(index, quote) {
    const source = sources[index]; if (!source || typeof source.text !== 'string') return null;
    if (!cache.has(index)) cache.set(index, comparable(source.text));
    const normalized = cache.get(index), at = normalized.value.indexOf(quote);
    if (at < 0) return null;
    const literal = source.text.slice(normalized.starts[at], normalized.ends[at + quote.length - 1]);
    return literal.length <= 1200 ? { evidence: literal, source: source.name } : null;
  }
  return item => {
    if (Number.isInteger(item.source_id) && item.source_id >= 0 && sources[item.source_id] && Number.isInteger(item.quote_id) && item.quote_id >= 0) {
      if (!passages.has(item.source_id)) passages.set(item.source_id, sourcePassages(sources[item.source_id].text));
      const literal = passages.get(item.source_id)[item.quote_id];
      if (literal) return { evidence: literal, source: sources[item.source_id].name };
    }
    if (!Number.isInteger(item.source_id) || item.source_id < 0 || typeof item.quote !== 'string' || item.quote.trim().length < 15 || item.quote.length > 1200) throw invalid();
    const quote = comparable(item.quote).value.trim(); if (quote.length < 15) throw invalid();
    const designated = find(item.source_id, quote); if (designated) return designated;
    const matches = sources.map((_, index) => find(index, quote)).filter(Boolean);
    // Repair a wrong source index only when the literal text identifies ONE
    // supplied source. Paraphrases and ambiguous references remain rejected.
    if (matches.length !== 1) throw invalid();
    return matches[0];
  };
}
