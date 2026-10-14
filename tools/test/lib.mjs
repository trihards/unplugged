// Shared plumbing for the regression tests: a static server, Playwright, and a page with the game's internals exposed.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/* ---------- Playwright: a local install if there is one, otherwise the global one ---------- */
export async function loadPlaywright() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright'];
  try { tries.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) { /* no npm */ }
  for (const t of tries.filter(Boolean)) {
    try { const p = req.resolve(t, { paths: [process.cwd()] }); return (await import(pathToFileURL(p).href)).default || (await import(pathToFileURL(p).href)); } catch (e) { /* next */ }
  }
  throw new Error('Playwright not found. Install it with `npm i -D playwright && npx playwright install chromium`, or set PLAYWRIGHT_MODULE.');
}

/* ---------- Test audio ----------
   Headless Chromium can't decode AAC, which every .m4a here is. Each song request gets a quiet
   generated WAV instead, long enough to seek through (Saffron's sting stays short, like the real one). */
function wav(seconds) {
  const rate = 8000, n = rate * seconds, b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(20 * Math.sin(i / 9));
  return b;
}
const WAVS = { short: wav(14), long: wav(60) };
const songFor = name => (name.startsWith('saffron') ? WAVS.short : WAVS.long);

/* ---------- Static server with byte ranges (Safari-style audio requests need them) ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.m4a': 'audio/mp4' };
export function serve(root) {
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    const buf = fs.readFileSync(file), total = buf.length;
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    const head = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (!m) { res.writeHead(200, { ...head, 'Content-Length': total }); return res.end(buf); }
    const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], total - 1) : total - 1;
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1 });
    res.end(buf.subarray(start, end + 1));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() })));
}

/* ---------- In-page shims ----------
   Pretend AAC is playable (the real songs are swapped for WAVs), keep track of every media element,
   and offer switches that mimic iOS Safari rules Chromium doesn't have. They are approximations of
   iOS behavior for regression purposes, not a substitute for testing on an iPhone. */
const SHIM = `(() => {
  const proto = HTMLMediaElement.prototype, play = proto.play;
  window.__media = new Set();
  proto.canPlayType = function (t) { return /mp4a|audio\\/mp4/.test(t) ? 'probably' : ''; };
  proto.play = function () {
    window.__media.add(this);
    if (window.__ios && window.__ios.denyPlay) return Promise.reject(new DOMException('denied', 'NotAllowedError'));
    if (window.__ios && window.__ios.onePlayer) for (const el of window.__media) if (el !== this && !el.paused) el.pause();
    return play.call(this);
  };
  const AC = window.AudioContext;
  if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ac = this; } };
})();`;

/* The hook: one line inserted just before the game script's closing "})();", so tests can read and set its variables. */
const HOOK = "window.__U = { run: s => eval(s), set: (k, v) => { window.__v = v; eval(k + ' = window.__v'); } };\n";
function injectHook(html) {
  const start = html.indexOf("'use strict';");
  const end = html.indexOf('</script>', start);
  const close = html.lastIndexOf('})();', end);
  if (start < 0 || close < 0) throw new Error('Could not find the game script to hook. Has the script structure changed?');
  return html.slice(0, close) + HOOK + html.slice(close);
}

export const VIEWPORTS = {
  desktop: { label: 'desktop Chromium 1280x800', viewport: { width: 1280, height: 800 } },
  phone: { label: 'mobile emulation 390x844', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  small: { label: 'mobile emulation 375x667', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tiny: { label: 'mobile emulation 320x568', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

/* A fresh browser context and page with the game loaded and hooked. */
export async function openGame(env, opts = {}) {
  const { label, ...vp } = VIEWPORTS[opts.device || 'desktop'];
  const ctx = await env.browser.newContext({ ...vp, reducedMotion: 'reduce', serviceWorkers: opts.sw ? 'allow' : 'block' });
  ctx.setDefaultTimeout(10000); // a missing or off-screen button fails in seconds, not half a minute
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  await page.addInitScript(SHIM);
  if (opts.storage) await page.addInitScript(s => { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, opts.storage);
  await page.route(/\.m4a(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (!fs.existsSync(path.join(env.root, 'assets/audio', name))) return route.fulfill({ status: 404, body: '' });
    const buf = songFor(name), total = buf.length;
    const m = /bytes=(\d*)-(\d*)/.exec(route.request().headers().range || '');
    if (!m) return route.fulfill({ status: 200, headers: { 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'content-length': String(total) }, body: buf });
    const s = m[1] ? +m[1] : 0, e = m[2] ? Math.min(+m[2], total - 1) : total - 1;
    return route.fulfill({ status: 206, headers: { 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'content-range': `bytes ${s}-${e}/${total}`, 'content-length': String(e - s + 1) }, body: buf.subarray(s, e + 1) });
  });
  await page.route(u => /\/(index\.html)?$/.test(new URL(u).pathname), async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    route.fulfill({ response: res, body: injectHook(await res.text()), headers: { ...res.headers(), 'content-type': 'text/html' } });
  });
  try { await page.goto(env.url); await page.waitForFunction(() => window.__U); }
  catch (e) { await ctx.close(); throw e; }
  return new Game(page, ctx, label, !!vp.hasTouch);
}

export class Game {
  constructor(page, ctx, label, touch) { this.page = page; this.ctx = ctx; this.label = label; this.touch = touch; }
  /* Run an expression inside the game's closure and return its (JSON-able) value. */
  run(expr) { return this.page.evaluate(s => { const v = window.__U.run(s); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }, expr); }
  /* Run code with Math.random returning the given values first, then `rest`, so a roll comes out a known way. */
  rolls(values, code, rest = 0.5) { return this.page.evaluate(([q, c, rest]) => { const r = Math.random; let i = 0; Math.random = () => (i < q.length ? q[i++] : rest); try { return window.__U.run(c) ?? null; } finally { Math.random = r; } }, [values, code, rest]); }
  tap(sel) { return this.touch ? this.page.tap(sel) : this.page.click(sel); }
  /* Start a retreat. The opening toasts arrive a moment later and can cover the header buttons, so clear them once they're in. */
  async start(modeIx = 2) { await this.tap('[data-act="begin"]'); await this.tap(`[data-mode="${modeIx}"]`); await this.wait(350); await this.run("$('#toasts').innerHTML = ''"); }
  wait(ms) { return this.page.waitForTimeout(ms); }
  close() { return this.ctx.close(); }
  async hidden(on) { await this.page.evaluate(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, on); }
}

/* ---------- Assertions ---------- */
export class Fail extends Error {}
/* A check that can't run here (missing git history, for example). Reported as a skip, never as a pass. */
export class Skip extends Error {}
export function skip(why) { throw new Skip(why); }
export function ok(cond, msg, detail) { if (!cond) throw new Fail(detail === undefined ? msg : `${msg} (${typeof detail === 'string' ? detail : JSON.stringify(detail)})`); }
export function eq(actual, expected, msg) { ok(Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected), `${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
