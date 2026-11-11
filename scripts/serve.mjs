#!/usr/bin/env node
// Zero-dependency static server for local preview: `npm start`.
// Listens on localhost only. Options: --port 8080, --prefix /talentscout/
// (the prefix imitates GitHub Pages project hosting under a sub-path).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(arg('--port', process.env.PORT ?? 8080));
let prefix = arg('--prefix', '/');
if (!prefix.startsWith('/')) prefix = `/${prefix}`;
if (!prefix.endsWith('/')) prefix += '/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.bcmap': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
};

createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === prefix.slice(0, -1)) {
      res.writeHead(302, { Location: prefix });
      return res.end();
    }
    if (!path.startsWith(prefix)) return send(res, 404, 'Not found');
    const rel = path.slice(prefix.length);
    // No dot-files, no dependencies folder, no escaping the project root.
    if (rel.split('/').some((part) => part.startsWith('.') || part === 'node_modules')) return send(res, 404, 'Not found');
    let file = resolve(root, rel);
    if (file !== root && !file.startsWith(root + sep)) return send(res, 404, 'Not found');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? '' : body, TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`TalentScout 2.0 is running at http://localhost:${port}${prefix}`);
  console.log('Press Ctrl+C to stop.');
});
