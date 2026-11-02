// Groq's free token limits can be smaller. Use distributed, contiguous source
// excerpts and report coverage; never silently call excerpts the full document.
export function groqMaterial(sources, limit = 10000) {
  const total = sources.reduce((n, s) => n + s.text.length, 0);
  if (total <= limit) return { sources, coverage: { total, selected: total, sampled: false } };
  const chunks = [];
  for (const source of sources) for (let offset = 0; offset < source.text.length; offset += 500) {
    const text = source.text.slice(offset, offset + 500);
    if (text.trim().length >= 30) chunks.push({ name: source.name, text });
  }
  const count = Math.min(chunks.length, Math.floor(limit / 500));
  const selected = Array.from({ length: count }, (_, i) => chunks[count === 1 ? 0 : Math.round(i * (chunks.length - 1) / (count - 1))]);
  return { sources: selected, coverage: { total, selected: selected.reduce((n, s) => n + s.text.length, 0), sampled: true } };
}
