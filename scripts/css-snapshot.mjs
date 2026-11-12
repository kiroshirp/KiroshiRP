// Guarda los estilos calculados de todas las páginas de dist/ en dos tamaños de pantalla.
// Uso: node scripts/css-snapshot.mjs <carpeta-salida> [dist]
//      node scripts/css-snapshot.mjs --compare <carpeta-a> <carpeta-b>
// Sirve para comprobar que un refactor de CSS no cambia el aspecto del portal.
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const sizes = { escritorio: { width: 1440, height: 900 }, movil: { width: 390, height: 844 } };

async function pages(dist) {
  const out = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const f = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'pagefind' && e.name !== '_astro') await walk(f);
      } else if (e.name.endsWith('.html'))
        out.push(f.slice(dist.length).replace(/index\.html$/, ''));
    }
  };
  await walk(dist);
  return out.sort();
}

async function snapshot(outDir, dist) {
  const { chromium } = require('playwright');
  dist = resolve(dist);
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    try {
      const data = await readFile(join(dist, p));
      res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404).end('no encontrado');
    }
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();
  await mkdir(outDir, { recursive: true });
  const list = await pages(dist);
  for (const [name, size] of Object.entries(sizes)) {
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const path of list) {
      await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({
        content: '*,*::before,*::after{animation:none!important;transition:none!important}',
      });
      await page.evaluate(() => document.fonts.ready);
      const dump = await page.evaluate(() => {
        const rows = [];
        const read = (el, pseudo) => {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return null;
          const o = {};
          for (const prop of cs) o[prop] = cs.getPropertyValue(prop);
          return o;
        };
        const label = (el) => {
          const parts = [];
          for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
            const i = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0;
            parts.unshift(n.tagName.toLowerCase() + '[' + i + ']');
          }
          return parts.join('>');
        };
        for (const el of document.querySelectorAll('body, body *')) {
          if (['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
          const r = el.getBoundingClientRect();
          for (const pseudo of [null, '::before', '::after']) {
            const style = read(el, pseudo);
            if (style)
              rows.push({
                k: label(el) + (pseudo || ''),
                box: pseudo ? null : [r.x, r.y, r.width, r.height].map(Math.round),
                style,
              });
          }
        }
        return rows;
      });
      const file = join(outDir, name + '__' + (path.replace(/\W+/g, '_') || 'inicio') + '.json.gz');
      await writeFile(file, gzipSync(JSON.stringify(dump)));
    }
    await context.close();
  }
  await browser.close();
  server.close();
  console.log(
    `${list.length} páginas × ${Object.keys(sizes).length} tamaños guardadas en ${outDir}`,
  );
}

async function compare(a, b) {
  const files = (await readdir(a)).sort();
  let bad = 0;
  for (const f of files) {
    const x = JSON.parse(gunzipSync(await readFile(join(a, f))));
    let y;
    try {
      y = JSON.parse(gunzipSync(await readFile(join(b, f))));
    } catch {
      console.log('falta', f);
      bad++;
      continue;
    }
    const diffs = [];
    const fixPort = (v) => (typeof v === 'string' ? v.replace(/127\.0\.0\.1:\d+/g, 'HOST') : v);
    if (x.length !== y.length) diffs.push(`elementos: ${x.length} → ${y.length}`);
    const ym = new Map(y.map((r) => [r.k, r]));
    for (const r of x) {
      const o = ym.get(r.k);
      if (!o) continue;
      if (JSON.stringify(r.box) !== JSON.stringify(o.box))
        diffs.push(`${r.k} caja ${r.box} → ${o.box}`);
      for (const p of Object.keys(r.style))
        if (fixPort(r.style[p]) !== fixPort(o.style[p]))
          diffs.push(`${r.k} ${p}: ${r.style[p]} → ${o.style[p]}`);
    }
    if (diffs.length) {
      bad++;
      console.log(`DIFERENCIAS en ${f} (${diffs.length}):`);
      diffs.slice(0, 8).forEach((d) => console.log('  ' + d.slice(0, 220)));
    }
  }
  console.log(bad ? `${bad} archivos con diferencias` : `Idéntico: ${files.length} archivos`);
  process.exitCode = bad ? 1 : 0;
}

const args = process.argv.slice(2);
if (args[0] === '--compare') await compare(args[1], args[2]);
else await snapshot(args[0], args[1] || 'dist');
