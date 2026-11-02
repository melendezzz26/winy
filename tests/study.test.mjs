import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStudyGame, checkStudyAnswer, readSources } from '../web/core/study.js';
const text = 'La fotosíntesis permite a las plantas producir azúcares usando la energía de la luz solar. Las raíces absorben el agua y los nutrientes que se encuentran en el suelo de los bosques.';
test('los retos se basan en frases de la fuente y conservan su evidencia', () => {
  const game = makeStudyGame([{ name: 'clase.txt', text }], 'Las plantas');
  assert.equal(game.questions.length, 2); assert.equal(game.title, 'Las plantas');
  for (const q of game.questions) { assert.equal(q.source, 'clase.txt'); assert.ok(text.includes(q.evidence)); assert.equal(q.prompt.replace('________', q.expected), q.evidence); }
});
test('el nombre del archivo o del tema no inventa preguntas y no se duplican frases', () => {
  assert.throws(() => makeStudyGame([{ name: 'fotosintesis.txt', text: 'Fotosíntesis' }], 'biología'), /dos frases/);
  const one = text.split('. ')[0] + '.';
  assert.throws(() => makeStudyGame([{ name: 'a', text: one + ' ' + one }]), /dos frases/);
});
test('las respuestas aceptan mayúsculas y tildes pero no otra palabra', () => {
  assert.equal(checkStudyAnswer(' FOTOSINTESIS ', 'fotosíntesis'), true);
  assert.equal(checkStudyAnswer('raíz', 'raíces'), false);
});
test('la lectura de archivos valida cantidad, tamaño y formato antes de procesar', async () => {
  const file = { name: 'clase.md', size: 250, text: async () => text };
  assert.equal((await readSources([file]))[0].text, text);
  await assert.rejects(readSources(Array(6).fill(file)), /máximo de 5/);
  await assert.rejects(readSources([{ ...file, size: 9 * 1024 * 1024 }]), /8 MB/);
  await assert.rejects(readSources([{ ...file, name: 'clase.exe' }]), /copia el texto/);
});
