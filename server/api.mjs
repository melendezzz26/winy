import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createAI } from './ai.mjs';
import { newRoom, advance, publicRoom, reveal, ROUND_MS } from './rooms.mjs';

class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, text) => { throw new ApiError(status, text); };
const hash = token => createHash('sha256').update(token).digest('hex');
export function createApi({ dbPath = process.env.WINY_DB || path.resolve('.local/winy.sqlite'), ai = createAI(), clock = Date.now, aiDailyLimit = Number(process.env.WINY_AI_DAILY_LIMIT || 20) } = {}) {
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, nickname TEXT NOT NULL); CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_calls (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, day TEXT NOT NULL); CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, state TEXT NOT NULL);');
  const buckets = new Map();
  function rate(key, max, period) {
    const now = clock(), old = buckets.get(key), bucket = old && old.until > now ? old : { until: now + period, count: 0 };
    if (++bucket.count > max) fail(429, 'Demasiadas solicitudes. Espera un momento.');
    buckets.set(key, bucket);
    if (buckets.size > 2000) for (const [k, b] of buckets) if (b.until <= now) buckets.delete(k);
  }
  const saveRoom = room => { room.version = (room.version || 0) + 1; db.prepare('INSERT OR REPLACE INTO rooms(code,state) VALUES (?,?)').run(room.code, JSON.stringify(room)); };
  function authenticate(req) {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    const player = token && db.prepare('SELECT id,nickname FROM players WHERE token_hash=?').get(hash(token));
    if (!player) fail(401, 'Tu sesión ha caducado. Vuelve a entrar a la sala.');
    return player;
  }
  async function body(req) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 512000) fail(413, 'El contenido es demasiado grande. Usa un fragmento de tu clase.'); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { fail(400, 'Datos de solicitud no válidos.'); }
  }
  async function handle(req, res) {
    const origin = req.headers.origin;
    const own = [`http://${req.headers.host}`, `https://${req.headers.host}`];
    const allowed = new Set(['https://appassets.androidplatform.net', ...own, ...(process.env.WINY_ALLOWED_ORIGINS || '').split(',').filter(Boolean)]);
    res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    if (origin && allowed.has(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    const reply = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    try {
      if (origin && !allowed.has(origin)) fail(403, 'Origen no permitido.');
      if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type'); res.writeHead(204); res.end(); return; }
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const ip = req.socket.remoteAddress || 'local';
      rate(`requests:${ip}`, 240, 60000);
      if (req.method === 'GET' && pathname === '/api/status') return reply(200, { online: true, ai: ai.enabled, provider: ai.provider || 'openai', model: ai.model });
      if (req.method === 'POST' && pathname === '/api/players') {
        rate(`players:${ip}`, 12, 3600000);
        const input = await body(req), nickname = typeof input.nickname === 'string' ? input.nickname.trim().slice(0, 28) : '';
        if (!nickname) fail(400, 'Escribe tu nombre para jugar.');
        const token = randomBytes(32).toString('base64url'), id = randomUUID();
        db.prepare('INSERT INTO players VALUES(?,?,?)').run(id, hash(token), nickname);
        return reply(201, { token, nickname });
      }
      const player = authenticate(req), now = clock();
      if (req.method === 'POST' && pathname === '/api/profile') {
        const input = await body(req), nickname = typeof input.nickname === 'string' ? input.nickname.trim().slice(0, 28) : '';
        if (!nickname) fail(400, 'Escribe tu nombre para jugar.');
        db.prepare('UPDATE players SET nickname=? WHERE id=?').run(nickname, player.id); return reply(200, { nickname });
      }
      if (req.method === 'POST' && pathname === '/api/study') {
        if (!ai.enabled) fail(503, 'El análisis con IA aún no está activado en el servidor.');
        const input = await body(req);
        if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 120) fail(400, 'Agrega el contenido de tu clase.');
        const sources = input.sources.map(s => ({ name: String(s.name || 'Apuntes').slice(0, 180), text: typeof s.text === 'string' ? s.text.trim() : '' })).filter(s => s.text);
        const length = sources.reduce((n, s) => n + s.text.length, 0);
        if (length < 200) fail(400, 'Agrega varios párrafos explicativos. El título solo no es suficiente.');
        if (length > 80000) fail(413, 'Analiza un fragmento de hasta 80.000 caracteres cada vez.');
        const day = new Date(now).toISOString().slice(0, 10);
        if (db.prepare('SELECT count(*) AS n FROM ai_calls WHERE day=?').get(day).n >= aiDailyLimit) fail(429, 'Se alcanzó el límite diario de análisis. Vuelve mañana.');
        if (db.prepare('SELECT count(*) AS n FROM ai_calls WHERE day=? AND player_id=?').get(day, player.id).n >= 5) fail(429, 'Ya usaste tus cinco análisis de hoy. Vuelve mañana.');
        db.prepare('INSERT INTO ai_calls VALUES(?,?,?)').run(randomUUID(), player.id, day);
        const game = await ai.generate(sources, typeof input.topic === 'string' ? input.topic.slice(0, 100) : '');
        db.prepare('INSERT INTO games VALUES(?,?,?)').run(game.id, player.id, JSON.stringify(game));
        return reply(201, game);
      }
      if (req.method === 'POST' && pathname === '/api/rooms') {
        rate(`rooms:${player.id}`, 10, 3600000);
        const input = await body(req); let room;
        try { room = newRoom(player, input.topic || 'peru', now); } catch { fail(400, 'Tema no disponible.'); }
        while (db.prepare('SELECT code FROM rooms WHERE code=?').get(room.code)) room = newRoom(player, input.topic || 'peru', now);
        saveRoom(room); return reply(201, publicRoom(room, player.id, now));
      }
      const roomInput = req.method === 'POST' ? await body(req) : {};
      const match = /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|start|answer))?$/.exec(pathname);
      if (!match) fail(404, 'Recurso no encontrado.');
      const row = db.prepare('SELECT state FROM rooms WHERE code=?').get(match[1]);
      if (!row) fail(404, 'No encontramos esa sala. Revisa el código.');
      const room = JSON.parse(row.state);
      if (room.expires <= now) { db.prepare('DELETE FROM rooms WHERE code=?').run(room.code); fail(410, 'La sala ha caducado. Crea otra partida.'); }
      advance(room, now);
      const member = room.players.some(p => p.id === player.id);
      if (match[2] === 'join' && req.method === 'POST') {
        if (!member) {
          if (room.players.length >= 2 || room.phase !== 'waiting') fail(409, 'La sala ya está completa o la partida empezó.');
          room.players.push({ id: player.id, name: player.nickname, score: 0 });
        }
      } else {
        if (!member) fail(403, 'Primero debes unirte a esta sala.');
        if (match[2] === 'start' && req.method === 'POST') {
          if (room.host !== player.id) fail(403, 'La persona que creó la sala debe iniciar la partida.');
          if (room.players.length !== 2) fail(409, 'Espera a que tu amigo entre con el código.');
          if (room.phase === 'waiting') { room.phase = 'asking'; room.deadline = now + ROUND_MS; }
        } else if (match[2] === 'answer' && req.method === 'POST') {
          const input = roomInput;
          if (input.round !== room.round) fail(409, 'La partida avanzó. Ya estamos en la siguiente pregunta.');
          if (!Object.hasOwn(room.answers, player.id)) {
            if (room.phase !== 'asking') fail(409, 'Esta pregunta ya terminó.');
            if (!Number.isInteger(input.answer) || input.answer < 0 || input.answer >= room.questions[room.round].options.length) fail(400, 'Respuesta no válida.');
            room.answers[player.id] = input.answer;
            if (room.players.every(p => Object.hasOwn(room.answers, p.id))) reveal(room, now);
          }
        } else if (match[2] || req.method !== 'GET') fail(405, 'Método no permitido.');
      }
      saveRoom(room); return reply(200, publicRoom(room, player.id, now));
    } catch (err) {
      const status = err.status || 502;
      reply(status, { error: err.status ? err.message : err.message?.startsWith('El ') || err.message?.startsWith('La ') || err.message?.startsWith('No ') ? err.message : 'No se pudo completar la solicitud. Inténtalo de nuevo.', ...(err.status && err.code ? { code: err.code } : {}) });
    }
  }
  return { handle, close: () => db.close() };
}
