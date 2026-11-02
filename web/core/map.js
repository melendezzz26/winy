import { PERU_BORDER } from './peru-border.js';
import { DESTINATIONS } from './data.js';

const WIDTH = 450, HEIGHT = 520;
const mercator = ([longitude, latitude]) => [longitude * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))];
const coordinates = PERU_BORDER.flat().map(mercator);
const xs = coordinates.map(p => p[0]), ys = coordinates.map(p => p[1]);
const bounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
const scale = Math.min((WIDTH - 116) / (bounds[2] - bounds[0]), (HEIGHT - 70) / (bounds[3] - bounds[1]));
export function project(point) {
  const [x, y] = mercator(point);
  return [WIDTH / 2 + (x - (bounds[0] + bounds[2]) / 2) * scale, HEIGHT / 2 + (y - (bounds[1] + bounds[3]) / 2) * scale];
}
export const COUNTRY_PATH = PERU_BORDER.map(ring => ring.map((point, i) => `${i ? 'L' : 'M'}${project(point).map(n => n.toFixed(2)).join(',')}`).join('') + 'Z').join('');

export function peruMap(selected) {
  return `<div class="map-wrap"><span class="map-key">PERÚ · 6 DESTINOS</span>${selected ? '<button class="map-reset pill" data-action="reset-map">Ver todos</button>' : ''}<svg class="peru-map" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="group" aria-label="Mapa del Perú con destinos en sus ubicaciones geográficas"><defs><linearGradient id="map-green" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#d5dba6"/><stop offset="1" stop-color="#91b48b"/></linearGradient><clipPath id="country"><path d="${COUNTRY_PATH}"/></clipPath></defs><path class="map-country-outline" d="${COUNTRY_PATH}" fill="url(#map-green)" stroke="#789875" stroke-width="1.4" stroke-linejoin="round"/><text x="44" y="337" class="ocean">OCÉANO<tspan x="44" dy="16">PACÍFICO</tspan></text>${DESTINATIONS.map(d => {
    const [x, y] = project(d.coordinates);
    const right = x > 300;
    return `<g class="map-marker ${selected?.id === d.id ? 'active' : ''}" data-action="destination" data-destination="${d.id}" tabindex="0" role="button" aria-label="Explorar ${d.name}" aria-pressed="${selected?.id === d.id}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><circle class="map-hit" r="20"/><circle class="map-pin" r="7.5"/><circle r="2.5" class="dot"/><text x="${right ? -14 : 14}" y="4" text-anchor="${right ? 'end' : 'start'}">${d.name}</text></g>`;
  }).join('')}</svg></div>`;
}
