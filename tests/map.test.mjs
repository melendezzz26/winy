import test from 'node:test';
import assert from 'node:assert/strict';
import { PERU_BORDER } from '../web/core/peru-border.js';
import { DESTINATIONS } from '../web/core/data.js';
import { project, peruMap } from '../web/core/map.js';

function inside([x, y], ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
test('los seis destinos se ubican dentro del contorno geográfico de Perú', () => {
  for (const d of DESTINATIONS) assert.ok(inside(d.coordinates, PERU_BORDER[0]), d.name);
});
test('el país completo y los destinos permanecen visibles al seleccionar cualquiera', () => {
  for (const ring of PERU_BORDER) for (const point of ring) { const [x, y] = project(point); assert.ok(x >= 30 && x <= 420 && y >= 30 && y <= 490); }
  for (const d of DESTINATIONS) {
    const markup = peruMap(d);
    assert.ok(markup.includes('viewBox="0 0 450 520"'));
    assert.equal((markup.match(/class="map-hit"/g) || []).length, 6);
    assert.ok(!markup.includes('zoom-'));
  }
});
