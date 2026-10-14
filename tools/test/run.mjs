#!/usr/bin/env node
// Regression tests for unplugged. Usage:
//   node tools/test/run.mjs                 every suite
//   node tools/test/run.mjs trading saves   only those suites
//   node tools/test/run.mjs --list          list suites and tests
//   node tools/test/run.mjs --root ../other-checkout   test another copy of the game
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, serve, Fail } from './lib.mjs';
import suites from './suites.mjs';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const rootArg = flag('--root');
const list = args.includes('--list'); if (list) args.splice(args.indexOf('--list'), 1);
const root = path.resolve(rootArg || path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));

const unknown = args.filter(a => !suites.some(s => s.name === a));
if (unknown.length) { console.error(`Unknown suite: ${unknown.join(', ')}. Suites: ${suites.map(s => s.name).join(', ')}`); process.exit(2); }
const chosen = args.length ? suites.filter(s => args.includes(s.name)) : suites;

if (list) {
  for (const s of suites) { console.log(`${s.name.padEnd(11)} ${s.about}`); for (const t of s.tests) console.log(`    - ${t.name}${t.expectFail ? '   [expected to fail: ' + t.expectFail + ']' : ''}`); }
  process.exit(0);
}

const needsBrowser = chosen.some(s => !s.static);
const env = { root };
const TIMEOUT = +(process.env.TEST_TIMEOUT || 60) * 1000;
let pw;
const launch = async () => { env.browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); };
if (needsBrowser) {
  pw = await loadPlaywright();
  await launch();
  const srv = await serve(root);
  Object.assign(env, { url: srv.url, closeServer: srv.close });
}

const counts = { pass: 0, fail: 0, xfail: 0, xpass: 0 };
const failures = [];
const t0 = Date.now();
console.log(`unplugged regression tests: ${root}`);
for (const s of chosen) {
  console.log(`\n${s.name}: ${s.about}${s.where ? `  [${s.where}]` : ''}`);
  for (const t of s.tests) {
    const started = Date.now();
    let err = null;
    let timer;
    try { await Promise.race([t.run(env), new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timed out after ${TIMEOUT / 1000}s`)), TIMEOUT); })]); }
    catch (e) { err = e; }
    clearTimeout(timer);
    // A test that timed out may have left a page spinning; start the next one in a fresh browser.
    if (err && /timed out|has been closed/.test(err.message) && env.browser) { await env.browser.close().catch(() => {}); await launch(); }
    const ms = `${((Date.now() - started) / 1000).toFixed(1)}s`;
    const msg = err ? (err instanceof Fail ? err.message : `${err.name}: ${err.message.split('\n')[0]}`) : '';
    if (t.expectFail) {
      if (err) { counts.xfail++; console.log(`  xfail ${t.name} (${ms})  known issue: ${t.expectFail}\n        (${msg})`); }
      else { counts.xpass++; console.log(`  XPASS ${t.name} (${ms})  now passes: remove its expectFail so it guards the fix`); }
    } else if (err) { counts.fail++; failures.push(`${s.name} › ${t.name}: ${msg}`); console.log(`  FAIL  ${t.name} (${ms})\n        ${msg}`); }
    else { counts.pass++; console.log(`  pass  ${t.name} (${ms})`); }
  }
}
if (env.browser) { await env.browser.close(); env.closeServer(); }

console.log(`\n${counts.pass} passed, ${counts.fail} failed, ${counts.xfail} known issues, ${counts.xpass} unexpectedly passing  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
if (failures.length) console.log(`\nFailures:\n${failures.map(f => `  - ${f}`).join('\n')}`);
console.log('\nAutomated runs use Chromium (desktop and mobile emulation). They do not verify iPhone Safari; see tools/test/README.md.');
process.exit(counts.fail ? 1 : 0);
