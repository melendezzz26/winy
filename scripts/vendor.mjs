import { mkdir, copyFile, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const target = new URL('web/vendor/', root);
await mkdir(target, { recursive: true });
for (const [from, to] of [
  ['node_modules/pdfjs-dist/build/pdf.mjs', 'pdf.mjs'],
  ['node_modules/pdfjs-dist/build/pdf.worker.mjs', 'pdf.worker.mjs'],
  ['node_modules/pdfjs-dist/LICENSE', 'PDFJS-LICENSE'],
  ['node_modules/fflate/esm/browser.js', 'fflate.mjs'],
  ['node_modules/fflate/LICENSE', 'FFLATE-LICENSE'],
  ['node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2', 'nunito.woff2'],
  ['node_modules/@fontsource-variable/nunito/LICENSE', 'NUNITO-LICENSE']
]) await copyFile(new URL(from, root), new URL(to, target));
for (const name of ['cmaps', 'standard_fonts', 'wasm']) await cp(new URL(`node_modules/pdfjs-dist/${name}/`, root), new URL(`${name}/`, target), { recursive: true });
console.log('Lectores locales de PDF, DOCX y PPTX preparados.');
