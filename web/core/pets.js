import { PETS } from './data.js';

// The original PNGs stay unchanged. Bounds describe the visible artwork,
// excluding almost transparent pixels in the supplied square canvases.
// Accessory anchors use coordinates in those same original images.
const ART = {
  cuy: {
    file: 'cuy.png', bounds: [226, 135, 779, 1008],
    head: [615, 150], side: [902, 344], neck: [615, 666], chest: [615, 804], scarfWidth: 520, scarfTilt: -4, badgeSize: 0.56
  },
  llama: {
    file: 'llama.png', bounds: [323, 29, 645, 1174],
    head: [581, 241], side: [762, 365], neck: [545, 641], chest: [536, 803], scarfWidth: 255, scarfTilt: 3, badgeSize: 0.46
  },
  gallito: {
    file: 'gallito-de-las-rocas.png', bounds: [240, 87, 780, 1087],
    head: [772, 111], side: [840, 310], neck: [750, 570], chest: [783, 755], scarfWidth: 300, scarfTilt: 9, badgeSize: 0.53
  },
  condor: {
    file: 'condor-andino.png', bounds: [153, 73, 931, 1143],
    head: [697, 110], side: [867, 321], neck: [710, 742], chest: [695, 870], scarfWidth: 395, scarfTilt: 6, badgeSize: 0.54
  }
};

function accessory(a, item) {
  if (item === 'natural') return '';
  const [x, y] = item === 'crown' ? a.head : item === 'flower' ? a.side : item === 'scarf' ? a.neck : a.chest;
  if (item === 'scarf') {
    const w = a.width, h = Math.max(8, Math.min(13, w * 0.14));
    return `<g transform="translate(${x} ${y}) rotate(${a.tilt})" stroke="#9e5547" stroke-width="1.2" stroke-linejoin="round"><path d="M${-w / 2} 0Q0 -10 ${w / 2} 0L${w / 2 - 5} ${h}Q0 ${h + 11} ${-w / 2 + 5} ${h}Z" fill="#d88471"/><path d="M${-w / 2 + 4} 2Q0 9 ${w / 2 - 4} 2" fill="none" stroke="#f4b39b" stroke-width="3"/><path d="M${w * .22} 8Q${w * .34} 11 ${w * .36} 19L${w * .31} 39L${w * .16} 32L${w * .12} 13Z" fill="#e49880"/><path d="M${w * .19} 12L${w * .22} 31" fill="none" stroke="#f5bea5"/><path d="M${w * .12} 6Q${w * .26} 0 ${w * .33} 9Q${w * .27} 18 ${w * .14} 14Z" fill="#c76b5b"/></g>`;
  }
  if (item === 'crown') return `<g transform="translate(${x - 32} ${y - 23})"><path d="m0 0 15 14L31-9l16 23L63 0l-7 36H7Z" fill="#f1c45a" stroke="#b28731" stroke-width="2"/><path d="M7 28h49" stroke="#e4a540" stroke-width="5"/><circle cx="31" cy="19" r="5" fill="#e17b67"/><circle cx="15" cy="22" r="3" fill="#8daec9"/><circle cx="47" cy="22" r="3" fill="#8daec9"/></g>`;
  if (item === 'flower') return `<g transform="translate(${x} ${y})" fill="#e8c9e3" stroke="#b08eb6" stroke-width="1.5">${[0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r})" cy="-13" rx="10" ry="13"/>`).join('')}<circle r="8" fill="#efc765" stroke="#d0a44a"/></g>`;
  if (item === 'star' || item === 'medal') return `<g transform="translate(${x} ${y}) scale(${a.badgeSize})"><ellipse cy="4" rx="20" ry="19" fill="#573d21" opacity=".10"/>${item === 'medal' ? '<path d="m-17-34 8 30h18l8-30-11 0-6 18-6-18Z" fill="#7a9ebf"/><path d="m-7-34 7 22 7-22" fill="#e68b98"/><circle r="21" fill="#edc26c" stroke="#b68b3e" stroke-width="2"/><circle r="16" fill="none" stroke="#f5dda1" stroke-width="1.5"/>' : '<path d="M-3-16V-23H3V-16" stroke="#b49a66" stroke-width="2"/>'}<path d="m0-20 6 13 15 2-11 11 3 15-13-7-13 7 3-15-11-11 15-2Z" fill="${item === 'medal' ? '#bd8734' : '#f1cf62'}" stroke="#ba9539" stroke-width="1.5" transform="scale(${item === 'medal' ? '.58' : '1'})"/></g>`;
  return '';
}

export function pet(petId = 'cuy', item = 'natural', cls = '') {
  const id = ART[petId] ? petId : 'cuy';
  const art = ART[id];
  const [bx, by, bw, bh] = art.bounds;
  const scale = Math.min(200 / bw, 236 / bh);
  const left = 120 - bw * scale / 2 - bx * scale;
  const top = 266 - bh * scale - by * scale;
  const point = ([x, y]) => [left + x * scale, top + y * scale];
  const anchors = Object.fromEntries(['head', 'side', 'neck', 'chest'].map(key => [key, point(art[key])]));
  anchors.width = art.scarfWidth * scale;
  anchors.tilt = art.scarfTilt;
  anchors.badgeSize = art.badgeSize;
  const name = PETS.find(p => p.id === id).name;
  return `<div class="pet pet-${id} ${cls}"><svg class="pet-art" viewBox="0 0 240 280" role="img" aria-label="${name}"><image href="assets/pets/${art.file}" x="${left}" y="${top}" width="${1254 * scale}" height="${1254 * scale}"/><g class="pet-accessory" aria-hidden="true">${accessory(anchors, item)}</g></svg></div>`;
}
