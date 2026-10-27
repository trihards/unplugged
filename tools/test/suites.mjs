// The regression suites. Each test checks behavior the game already has; none of them define new requirements.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { openGame, ok, eq, skip } from './lib.mjs';

/* Open a game, run the body, always close it, and fail on any script error the page logged. */
const play = (opts, body) => async env => {
  const g = await openGame(env, opts);
  try { await body(g, env); ok(!g.page.errors.length, 'page logged errors', g.page.errors.slice(0, 3).join(' | ')); }
  finally { await g.close(); }
};
const tst = (name, opts, body, extra = {}) => ({ name, run: play(opts, body), ...extra });

/* Audible = playing and routed at a gain above silence. Covers the Dale-Fi, Saffron's theme and any event-song player. */
const AUDIBLE = `[[M.audio, M.gain], [T.el, T.gain], typeof E !== 'undefined' ? [E.el, E.gain] : [null, null]]
  .filter(([el, g]) => el && !el.paused && (!g || g.gain.value > 0.02)).length`;

/* ======================= static: no browser ======================= */
const staticSuite = {
  name: 'static', static: true, about: 'script syntax, asset references and the offline cache list',
  tests: [
    { name: 'game scripts parse', run: async ({ root }) => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
      ok(scripts.length >= 2, 'expected inline scripts in index.html');
      for (const [i, s] of scripts.entries()) { try { new Function(s); } catch (e) { ok(false, `script ${i + 1} does not parse`, e.message); } }
      try { new Function(fs.readFileSync(path.join(root, 'sw.js'), 'utf8')); } catch (e) { ok(false, 'sw.js does not parse', e.message); }
    } },
    { name: 'every referenced image and song exists', run: async ({ root }) => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const img = JSON.parse(/window\.IMG = (\{[^;]*\});/.exec(html)[1]);
      const missing = Object.values(img).filter(p => !fs.existsSync(path.join(root, p)));
      ok(!missing.length, 'missing images', missing.join(', '));
      const songs = [...html.matchAll(/\{ id: '(\w+)', title:/g)].map(m => m[1]).concat('saffron');
      const gone = songs.filter(id => !fs.existsSync(path.join(root, `assets/audio/${id}.m4a`)));
      ok(!gone.length, 'missing songs', gone.join(', '));
    } },
    { name: 'offline cache lists every asset, and every listed file exists', run: async ({ root }) => {
      const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
      const listed = ['CORE', 'AUDIO'].flatMap(k => JSON.parse(new RegExp(`const ${k} = (\\[[^\\]]*\\]);`).exec(sw)[1]));
      const previewOnly = JSON.parse(/const PREVIEW_ONLY = (\[[^\]]*\]);/.exec(sw)[1]);
      const missing = listed.concat(previewOnly).filter(p => p !== './' && !fs.existsSync(path.join(root, p)));
      ok(!missing.length, 'sw.js lists files that do not exist', missing.join(', '));
      const assets = ['img', 'audio'].flatMap(d => fs.readdirSync(path.join(root, 'assets', d)).filter(f => /\.(webp|m4a)$/.test(f)).map(f => `assets/${d}/${f}`));
      const uncached = assets.filter(a => !listed.includes(a));
      ok(!uncached.length, 'assets missing from sw.js (they would not work offline)', uncached.join(', '));
    } },
    { name: "Beta's Inspection Notes are for the current version (each preview gets its own checklist)", run: async ({ root }) => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const v = /const GAME_VERSION = '([^']+)'/.exec(html)[1], iv = /const INSPECT = \{\s*version: '([^']+)'/.exec(html)?.[1];
      eq(iv, v, 'INSPECT.version matches GAME_VERSION: write the new release’s checklist when the version changes');
    } },
    { name: 'cache version changes when cached files change (vs. the base branch)', run: async ({ root }) => {
      const base = process.env.TEST_BASE || 'origin/main';
      const git = cmd => execSync(`git -C "${root}" ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      try { git(`rev-parse --verify ${base}`); } catch (e) { skip(`base ref "${base}" not found (shallow clone, no remote, or a typo in TEST_BASE)`); }
      const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
      const cached = ['CORE', 'AUDIO'].flatMap(k => JSON.parse(new RegExp(`const ${k} = (\\[[^\\]]*\\]);`).exec(sw)[1])).filter(p => p !== './');
      const changed = git(`diff --name-only ${base} -- ${cached.map(p => `"${p}"`).join(' ')}`).trim();
      if (!changed) return;
      const v = s => /const VERSION = '([^']+)'/.exec(s)?.[1];
      ok(v(sw) !== v(git(`show ${base}:sw.js`)), `cached files changed (${changed.split('\n').join(', ')}) but VERSION in sw.js still matches ${base}; returning players would keep the old copy`);
    } },
  ],
};

/* ======================= smoke: core progression ======================= */
const smoke = {
  name: 'smoke', about: 'the game boots, a retreat starts, time passes, and checkout ends it', where: 'desktop Chromium',
  tests: [
    tst('welcome screen boots without errors', {}, async g => {
      ok(await g.page.isVisible('[data-act="begin"]'), 'Begin Retreat button visible');
      ok(!(await g.page.isVisible('[data-act="continue"]')), 'no Continue button without a save');
    }),
    tst('every retreat length starts with the standard opening', {}, async g => {
      for (let m = 0; m < 4; m++) {
        await g.run("closeSheet(true); screen = 'welcome'; render()");
        await g.start(m);
        const s = await g.run('({ days: S.days, day: S.day, hour: S.hour, cash: S.cash, debt: S.debt, cap: S.cap, zen: S.zen, loc: S.loc, mode: S.mode, modeId: MODES[' + m + '].id })');
        eq([s.day, s.hour, s.cash, s.debt, s.cap, s.zen, s.loc], [1, 7, 400, 1100, 100, 100, 0], `opening state for ${s.modeId}`);
        eq(s.mode, s.modeId, 'mode recorded');
      }
    }),
    tst('walking spends hours and Dale\'s meter compounds', {}, async g => {
      await g.start(2);
      const before = await g.run('({ hour: S.hour, debt: S.debt, rate: S.rate, h: HOURS[0][1] })');
      await g.run('walk(1); queue = []; closeSheet(true)');
      const after = await g.run('({ hour: S.hour, debt: S.debt, loc: S.loc })');
      eq(after.loc, 1, 'arrived at the Meditation Hall');
      eq(after.hour, before.hour + before.h, 'hours added');
      eq(after.debt, Math.ceil(before.debt * Math.pow(1 + before.rate, before.h)), 'debt compounded hourly');
      eq(await g.run('canReach(1)'), false, 'cannot walk to where you are');
    }),
    tst('you can\'t walk past quiet hours; resting starts the next day', {}, async g => {
      await g.start(2);
      await g.run('S.hour = 21; S.zen = 80; render()');
      ok(await g.run('PLACES.every((_, i) => !canReach(i) || S.hour + HOURS[S.loc][i] <= LIGHTS)'), 'no reachable walk ends after 10pm');
      await g.run('S.hour = 22; render()');
      eq(await g.run('PLACES.some((_, i) => canReach(i))'), false, 'nothing reachable at 10pm');
      await g.tap('[data-act="rest"]'); await g.tap('[data-act="restgo"]'); await g.wait(150);
      const s = await g.run('({ day: S.day, hour: S.hour, zen: S.zen })');
      eq([s.day, s.hour], [2, 7], 'woke on day 2 at 7am');
      ok(s.zen > 80 && s.zen <= 100, 'rest restores some zen', s.zen);
    }),
    tst('Options › What\'s New shows Guide Saffron\'s notes, newest first, without popping up on its own', {}, async g => {
      eq(await g.run('sheetKind'), null, 'nothing opens by itself on load');
      await g.tap('[data-act="options"]');
      const v = await g.run('GAME_VERSION');
      eq(await g.page.textContent('[data-act="news"] .ver'), 'v' + v, 'Options shows the version');
      await g.tap('[data-act="news"]');
      eq(await g.run("$('#sheetTitle').textContent"), 'A Note from Guide Saffron', 'title');
      const dates = await g.page.$$eval('.note time', t => t.map(x => x.getAttribute('datetime')));
      ok(dates.length >= 1 && dates.every((d, i) => i === 0 || d <= dates[i - 1]), 'dated, newest first', dates);
      const all = await g.page.textContent('.notes');
      ok(all.includes('On the Importance of Knowing Where You Are') && all.includes('On Dependence and Resolution') && all.includes('On the Nature of Abundance'), 'every release kept');
      eq(await g.page.textContent('.note h4'), 'On What We Choose to Hear', 'the 1.6 note is first');
      ok(all.includes('Those who achieved exceptional financial success are invited to experience the freedom of having no evidence of it.'), '1.5 note text unchanged');
      await g.tap('[data-act="close"]');
      eq(await g.run('sheetKind'), null, 'closes');
    }),
    tst('the live game shows no PREVIEW badge and keeps its usual storage keys', {}, async g => {
      await g.start(2);
      await g.run('inspectSheet()'); eq(await g.run('sheetKind'), null, "Beta's notes can't open");
      eq(await g.run("[PREVIEW, !!$('#preview'), !!$('.beta, .beta-ver, .beta-slot'), [...document.images].some(i => i.src.includes('/preview/'))]"), [false, false, false, false], 'no badge, no Beta');
      ok(await g.run("localStorage.getItem('unpw.save') !== null && !Object.keys(localStorage).some(k => k.startsWith('unpw-preview.'))"), 'saves under unpw.*');
    }),
    { name: 'the /preview/ build: Beta and BETA · version in the header, the PREVIEW tab wherever the header is covered, its own saves', run: async env => {
      const { browser, url, root } = env;
      for (const device of ['tiny', 'phone']) {
        const { label, ...vp } = (await import('./lib.mjs')).VIEWPORTS[device];
        const ctx = await browser.newContext({ ...vp, reducedMotion: device === 'tiny' ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
        const page = await ctx.newPage(); const errors = [];
        const version = /const GAME_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(root, 'index.html'), 'utf8'))[1];
        page.on('pageerror', e => errors.push(String(e)));
        await page.addInitScript(() => { localStorage.setItem('unpw.scores', '[{"i":"Live","s":1,"t":"x","at":1,"m":"week"}]'); localStorage.setItem('unpw.collected', '["s0","w1"]'); });
        await page.route('**/preview/**', route => {
          const rel = new URL(route.request().url()).pathname.replace(/^.*?\/preview\//, '') || 'index.html';
          const f = path.join(root, rel);
          if (rel === 'index.html') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(f, 'utf8').replace("'use strict';", "'use strict'; window.__U = { run: s => eval(s) };") });
          return fs.existsSync(f) && fs.statSync(f).isFile() ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' });
        });
        try {
          await page.goto(url + 'preview/');
          const badge = async where => {
            const b = await page.$('#preview'); ok(b, `badge on ${where}`);
            eq(await b.textContent(), 'Preview · ' + version, `badge reads the release version (${where})`);
            const box = await b.boundingBox(); const w = await page.evaluate(() => innerWidth);
            ok(box && box.y >= 0 && box.x >= 0 && box.x + box.width <= w && await b.isVisible(), `badge on screen (${where}, ${label})`);
            eq(await b.evaluate(e => getComputedStyle(e).pointerEvents), 'none', 'never takes a tap');
          };
          await page.click('[data-act="options"]'); await badge('options');
          await page.click('#sheet [data-act="close"]').catch(() => {});
          await page.click('[data-act="begin"]'); await page.click('[data-mode="2"]'); await page.waitForTimeout(400);
          await badge('the retreat, while its notifications cover the header');
          await page.evaluate(() => { document.querySelector('#toasts').innerHTML = ''; }); await page.waitForTimeout(100);
          eq(await page.textContent('.beta-ver'), 'Beta · ' + version, `header label reads the release version (${label})`);
          ok(await page.isVisible('.beta img.tank') && await page.evaluate(() => [...document.querySelectorAll('.beta img')].every(i => i.complete && i.naturalWidth > 0)), 'Beta and her tank load');
          ok(!(await page.isVisible('#preview')), 'with the header in view, no duplicate tab');
          const boxes = await page.evaluate(() => ['.beta', '.beta-mark', '[data-act="journal"]'].map(s => document.querySelector(s).getBoundingClientRect()).map(r => [r.left, r.right, r.top, r.bottom, r.width, r.height]));
          ok(boxes[0][1] <= boxes[1][0] && boxes[1][1] <= boxes[2][0], `tank, wordmark and icons don't overlap (${label})`, boxes);
          eq([boxes[2][4], boxes[2][5]], [40, 40], 'icon tap targets unchanged');
          eq(await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height), 44, 'header height unchanged');
          const run = s => page.evaluate(s => window.__U.run(s), s);
          const bowl = await page.evaluate(() => { const r = document.querySelector('button.beta').getBoundingClientRect(); return [r.width, r.height]; });
          ok(bowl[0] >= 40 && bowl[1] >= 44, "Beta's bowl is a full-size tap target", bowl);
          await page.click('button.beta');
          eq([await run('sheetKind'), await page.textContent('#sheetTitle')], ['inspect', 'Beta’s Inspection Notes'], 'tapping her bowl opens her notes');
          ok((await page.textContent('#sheet')).includes('Version ' + version), 'for this version');
          eq(await page.$$eval('.inspect li', l => l.length), await run('INSPECT.items.length'), 'every checklist item shown');
          const sheetFits = await page.evaluate(() => document.querySelector('#sheet').scrollWidth <= innerWidth);
          ok(sheetFits, `no sideways scroll (${label})`);
          await badge("Beta's notes");
          await page.click('#sheet .sheet-actions [data-act="close"]');
          eq(await run('sheetKind'), null, 'Close closes it');
          ok(await run('betaT !== null'), 'her next swim is scheduled');
          await run('betaSwim(); render()');
          if (device === 'tiny') eq(await run("betaEl.classList.contains('swim')"), false, 'reduced motion: she stays still');
          else {
            eq(await run("betaEl.classList.contains('swim') && betaEl.isConnected"), true, 'she swims, and a render mid-swim keeps her in the header');
            await page.waitForTimeout(1900);
            eq(await run("[betaEl.classList.contains('swim'), getComputedStyle(betaEl.querySelector('.f0')).opacity]"), [false, '1'], 'then back to rest');
          }
          await page.click('[data-act="journey"]'); await badge('the map');
          await page.click('#sheet [data-act="close"]');
          await page.click('[data-act="menu"]'); await badge('the menu');
          await page.click('#sheet [data-act="journal"]'); await badge('the journal');
          await page.click('#sheet [data-act="close"]');
          await page.click('.row:not(.na)'); await badge('a trade sheet');
          await page.click('#sheet [data-act="close"]');
          const keys = await page.evaluate(() => Object.keys(localStorage).sort());
          ok(keys.includes('unpw-preview.save') && keys.includes('unpw-preview.gbEra'), 'the preview saves under its own keys', keys);
          eq(await page.evaluate(() => [localStorage.getItem('unpw.scores'), localStorage.getItem('unpw.collected'), localStorage.getItem('unpw.save'), localStorage.getItem('unpw.gbEra')]),
            ['[{"i":"Live","s":1,"t":"x","at":1,"m":"week"}]', '["s0","w1"]', null, null], "the live game's guestbook, collection and save are untouched");
          ok(!errors.length, 'no page errors', errors.join(' | '));
        } finally { await ctx.close(); }
      }
    } },
    tst('in-game menu › What\'s New opens the same sheet and leaves the run untouched', {}, async g => {
      await g.start(2);
      await g.run("S.cash = 1234; S.zen = 77; render()");
      const before = await g.run('JSON.stringify(S)');
      await g.tap('[data-act="menu"]');
      eq(await g.page.textContent('[data-act="news"] .ver'), 'v' + await g.run('GAME_VERSION'), 'menu shows the same version');
      await g.tap('[data-act="news"]');
      eq(await g.run("$('#sheetTitle').textContent"), 'A Note from Guide Saffron', 'same sheet');
      await g.tap('[data-act="close"]');
      eq([await g.run('screen'), await g.run('sheetKind')], ['game', null], 'back in the run');
      eq(await g.run('JSON.stringify(S)'), before, 'run state unchanged');
    }),
    tst('header journal icon: one tap opens the journal, closing returns to the retreat; the menu entry stays', {}, async g => {
      await g.start(2);
      await g.run("for (let i = 0; i < 30; i++) log('Entry ' + i + '.'); render()");
      const before = await g.run('JSON.stringify(S)');
      await g.tap('.topbar [data-act="journal"]');
      eq(await g.run('sheetKind'), 'journal', 'one tap');
      eq(await g.page.$$eval('.journal p', ps => ps.map(p => p.textContent)), await g.run('S.log.slice(-20).reverse()'), 'same journal: last 20, newest first');
      await g.tap('.sheet-actions [data-act="close"]');
      eq(await g.run('[screen, sheetKind]'), ['game', null], 'back in the retreat');
      eq(await g.run('JSON.stringify(S)'), before, 'nothing changed');
      await g.tap('[data-act="menu"]');
      ok(await g.page.isVisible('#sheet [data-act="journal"]'), 'menu still has Your journal');
      eq(await g.page.getAttribute('.topbar [data-act="journal"]', 'aria-label'), 'Your journal', 'labelled for screen readers');
    }),
    tst('journey map: one tap walks, 44px targets, hours always and the arrival clock only late', {}, async g => {
      await g.start(3);
      await g.tap('[data-act="journey"]');
      const sizes = await g.page.$$eval('.node', ns => ns.map(n => { const r = n.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      ok(sizes.length === 6 && sizes.every(([w, h]) => w >= 44 && h >= 44), 'six 44px targets', sizes);
      const lbl = await g.page.textContent('.node:not(.here):not(:disabled) .lbl');
      ok(/· \dh$/.test(lbl), 'morning label shows hours only', lbl);
      ok((await g.page.getAttribute('.node:not(.here):not(:disabled)', 'aria-label')).includes('am'), 'screen readers still get the arrival time');
      const to = await g.page.getAttribute('.node:not(.here):not(:disabled)', 'data-go');
      await g.tap(`.node[data-go="${to}"]`);
      eq(await g.run('S.loc'), +to, 'one tap walks there');
      await g.run("queue = []; closeSheet(true); S.hour = 19; render()");
      await g.tap('[data-act="journey"]');
      const late = await g.page.$$eval('.node:not(.here):not(:disabled) .lbl', ls => ls.map(l => l.textContent));
      ok(late.length && late.every(t => /pm$/.test(t)), 'arriving 8pm or later shows the clock', late);
      ok(await g.page.isVisible('.node:disabled'), 'spots past quiet hours are disabled');
    }),
    tst('handbook marks only the sections the current release changed, and drops stale marks', {}, async g => {
      await g.run('handbookSheet()');
      const marks = await g.page.$$eval('.hb summary', ss => ss.map(s => [s.firstChild.textContent, s.querySelector('.hbmark')?.textContent || '']).filter(m => m[1]));
      const want = await g.run("HB_MARKS.updated.map(t => [t, 'Updated · v' + GAME_VERSION]).concat(HB_MARKS.added.map(t => [t, 'New · v' + GAME_VERSION]))");
      eq(marks.sort(), want.sort(), 'marks match HB_MARKS');
      await g.run("closeSheet(true); HB_MARKS.version = '0.9'; handbookSheet()");
      eq(await g.page.$$eval('.hbmark', m => m.length), 0, 'marks from an older release never show');
    }),
    tst('Dale-Fi cards: a fresh player owns only the retreat track, with its card and no reveal', {}, async g => {
      eq(await g.run('collected()'), ['s0'], 'fresh collection');
      await g.tap('[data-act="options"]'); await g.tap('#sheet [data-act="music"]');
      eq(await g.page.$$eval('.cardthumb', b => b.map(x => x.dataset.id)), ['s0'], 'one card on the welcome Dale-Fi');
      await g.tap('.cardthumb[data-id="s0"]');
      eq(await g.run('sheetKind'), 'card', 'card opens');
      ok((await g.page.textContent('#sheet')).includes('complete absence of musical surprises'), 'review shown');
      ok(!(await g.page.isVisible('.cardkick')), 'browsing, not a reveal');
      await g.tap('#sheet [data-act="music"]'); eq(await g.run('sheetKind'), 'music', 'Back returns to the Dale-Fi');
      await g.run('closeSheet(true)'); await g.start(2);
      eq(await g.run('sheetKind'), null, 'starting a retreat shows no reveal');
    }),
    tst('Dale-Fi credits: in-world artists only; TORiTiA stays in the Options credit', { storage: { 'unpw.collected': '["s0","w0","w1","w2"]' } }, async g => {
      await g.tap('[data-act="options"]');
      ok((await g.page.textContent('#sheet')).includes('Music by TORiTiA'), 'Options credit kept');
      await g.tap('#sheet [data-act="music"]'); await g.wait(200);
      eq(await g.page.$$eval('.trk .ta', t => t.map(x => x.textContent)), ['Uncredited', 'Uncredited', 'The Higher Frequencies', 'Unknown', 'Turns up somewhere on a retreat.', 'Turns up somewhere on a retreat.', 'Turns up somewhere on a retreat.', 'Not sold separately. Dale might know?', 'One of two exclusive bonus cuts.'], 'row credits (unfound songs show the welcome-screen line)');
      ok(!(await g.page.textContent('#sheet')).includes('TORiTiA'), 'no TORiTiA anywhere in the Dale-Fi, LCD included');
      await g.run('handbookSheet()');
      ok(!(await g.page.textContent('#sheet')).includes('TORiTiA'), 'nor in the handbook');
    }),
    tst('Dale-Fi cards: songs owned before the update already have their cards', { storage: { 'unpw.collected': '["s0","w1","w2"]' } }, async g => {
      await g.tap('[data-act="options"]'); await g.tap('#sheet [data-act="music"]');
      eq(await g.page.$$eval('.cardthumb', b => b.map(x => x.dataset.id)), ['s0', 'w1', 'w2'], 'cards for every owned song, no rediscovery');
    }),
    tst('Dale-Fi cards: the meditation hall find reveals its card after the walk, once ever', {}, async g => {
      await g.start(2);
      await g.rolls([0.1], "queue = []; S.loc = PLACES.findIndex(p => p.name === 'Meditation Hall'); songEvents(); runQueue()");
      eq(await g.run('sheetKind'), 'card', 'reveal shown');
      ok((await g.page.textContent('.cardkick')).includes('sound-bath guy'), 'says how you found it');
      ok((await g.page.textContent('#sheet')).includes('The Higher Frequencies'), 'right card');
      eq(await g.run('collected()'), ['s0', 'w1'], 'collected');
      await g.tap('#sheet [data-act="cardplay"]');
      eq(await g.run('[M.cur, M.want, sheetKind]'), ['w1', true, 'music'], 'Listen plays it in the Dale-Fi');
      await g.run("closeSheet(true); screen = 'welcome'; render()"); await g.start(1);
      await g.rolls([0.1], "queue = []; S.loc = PLACES.findIndex(p => p.name === 'Meditation Hall'); songEvents(); runQueue()");
      eq(await g.run('[sheetKind, S.songs.includes("w1")]'), [null, true], 'found again on a later retreat: back in this run, no second reveal');
    }),
    tst('Dale-Fi cards: the Kitchen Garden find reveals The Unprocessed Self, plays, stays for the run and offline', {}, async (g, env) => {
      await g.start(2);
      const GARDEN = "queue = []; S.loc = PLACES.findIndex(p => p.name === 'Kitchen Garden'); songEvents(); runQueue()";
      await g.rolls([0.46], GARDEN);
      eq(await g.run('[sheetKind, hasSong("w3")]'), [null, false], 'no find above 45%');
      await g.run("S.loc = PLACES.findIndex(p => p.name === 'Meditation Hall')"); await g.rolls([0.1], "queue = []; S.loc = PLACES.findIndex(p => p.name === 'Yurt Village'); songEvents(); runQueue()");
      eq(await g.run('hasSong("w3")'), false, 'nowhere else');
      await g.rolls([0.44], GARDEN);
      eq(await g.run('sheetKind'), 'card', 'reveal shown');
      eq(await g.page.textContent('.cardkick'), 'Someone has been using a 1977 funk record to keep the seed packets flat. New on your Dale-Fi.', 'discovery line, verbatim');
      const card = await g.run("({ t: $('.cardtt').textContent, by: $('.cardby').textContent, meta: $('.cardmeta').textContent, rev: $('.cardrev').textContent, art: $('.cardart').getAttribute('src') })");
      eq(card, { t: 'The Unprocessed Self', by: 'The Low Maintenance Orchestra', meta: '45 · Sunspill Records · 1977 · Funk',
        rev: 'A gloriously filthy slice of California funk from a band whose only documented live appearances were at the 1977 and 1978 Folsom County Fair, on the second stage. The bassline is practically geological. Their subsequent disappearance remains one of the great minor injustices of American music.',
        art: 'assets/img/card-w3.webp' }, 'companion card');
      ok(!(await g.page.textContent('#sheet')).includes('TORiTiA'), 'production credit not shown in-world');
      ok((await g.run('S.log.at(-1)')).endsWith('Someone has been using a 1977 funk record to keep the seed packets flat. New on your Dale-Fi: The Unprocessed Self.'), 'journal records the find and how', await g.run('S.log.at(-1)'));
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying(), sheetKind]'), ['w3', true, 'music'], 'plays in the Dale-Fi');
      ok((await g.run('M.audio.src')).endsWith('assets/audio/w3.m4a'), 'its own file');
      await g.run('setMusic(false)'); await g.wait(200);
      eq(await g.run(AUDIBLE), 0, 'Music off silences it');
      await g.run('setMusic(true); closeSheet(true)');
      await g.run("for (let i = 0; i < 3; i++) walk(PLACES.findIndex((p, k) => k !== S.loc && canReach(k))); queue = []; closeSheet(true)");
      eq(await g.run('[S.songs.includes("w3"), collected().includes("w3")]'), [true, true], 'stays for the run and in the collection');
      await g.rolls([0.1], GARDEN);
      eq(await g.run('S.songs.filter(id => id === "w3").length'), 1, 'found once per run');
      const sw = fs.readFileSync(path.join(env.root, 'sw.js'), 'utf8');
      ok(sw.includes('"assets/audio/w3.m4a"') && sw.includes('"assets/img/card-w3.webp"'), 'in the offline cache list');
    }),
    tst('Radical Acceptance: found on the fourth or fifth Labyrinth visit of a retreat, once, with its card, and offline', {}, async (g, env) => {
      await g.start(2);
      eq(await g.run('[4, 5].includes(S.lab)'), true, 'the visit is chosen when the retreat starts');
      const LAB = await g.run("PLACES.findIndex(p => p.name === 'The Labyrinth')"), OUT = await g.run("PLACES.findIndex(p => p.name === 'Yurt Village')");
      // empty pockets: no Saffron, no offers, no theft
      // every good on offer, no gossip, no walk event: the walk's only event is the song
      const quiet = [...Array(9).fill(0.1), ...Array(9).fill(0.5), 0.9, 0.9];
      const visit = `S.cash = 0; S.hour = 8; S.loc = ${OUT}; queue = []; closeSheet(true); walk(${LAB})`;
      await g.run('S.lab = 5; ST().visits[' + LAB + '] = 2');
      await g.rolls(quiet, visit, 0.9); await g.wait(200);
      eq(await g.run('[ST().visits[' + LAB + '], hasSong("w4"), sheetKind]'), [3, false, null], 'third visit: nothing');
      ok(!(await g.run("$('#sheet') && $('#sheet').textContent.includes('Labyrinth')")), 'no breadcrumb');
      await g.rolls(quiet, visit, 0.9); await g.wait(200);
      eq(await g.run('[ST().visits[' + LAB + '], hasSong("w4")]'), [4, false], 'fourth visit: not this retreat');
      await g.rolls(quiet, visit, 0.9); await g.wait(300);
      eq(await g.run('[ST().visits[' + LAB + '], hasSong("w4"), sheetKind]'), [5, true, 'card'], 'fifth visit: found, card revealed');
      eq(await g.page.textContent('.cardkick'), 'For no particular reason, you walk the labyrinth counterclockwise this time. Halfway through, you notice something tucked beneath a stone. New on your Dale-Fi.', 'discovery line, verbatim');
      const card = await g.run("({ t: $('.cardtt').textContent, by: $('.cardby').textContent, meta: $('.cardmeta').textContent, rev: $('.cardrev').textContent, art: $('.cardart').getAttribute('src') })");
      eq(card, { t: 'Radical Acceptance', by: 'VANTAGE', meta: '12″ · Horizon Beat Records · 1985 · Synth-Pop',
        rev: 'A gleaming instrumental built on insistent drum machines, sweeping synthesizers, and an almost heroic sense of emotional urgency. VANTAGE approaches self-acceptance with the intensity of someone attempting to prevent a nuclear launch.',
        art: 'assets/img/card-w4.webp' }, 'companion card');
      eq(await g.run('S.log.at(-1)'), `9am, The Labyrinth. For no particular reason, you walk the labyrinth counterclockwise this time. Halfway through, you notice something tucked beneath a stone. New on your Dale-Fi: Radical Acceptance.`, 'journal: where, how and what');
      eq(await g.run('collected().includes("w4")'), true, 'in the collection');
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w4', true], 'plays in the Dale-Fi');
      ok((await g.run('M.audio.src')).endsWith('assets/audio/w4.m4a'), 'its own file');
      await g.rolls(quiet, visit, 0.9); await g.wait(200);
      eq(await g.run('[S.songs.filter(id => id === "w4").length, sheetKind]'), [1, null], 'sixth visit: no second find');
      await g.run("closeSheet(true); screen = 'welcome'; render()"); await g.start(2);
      await g.run('S.lab = 4; ST().visits[' + LAB + '] = 3');
      await g.rolls(quiet, visit, 0.9); await g.wait(300);
      eq(await g.run('[hasSong("w4"), sheetKind]'), [true, null], 'a later retreat (fourth visit this time): back in the run, a notification, no second card');
      const sw = fs.readFileSync(path.join(env.root, 'sw.js'), 'utf8');
      ok(sw.includes('"assets/audio/w4.m4a"') && sw.includes('"assets/img/card-w4.webp"'), 'in the offline cache list');
    }),
    tst('Radical Acceptance: the Dale-Fi gives no hint of where it is', {}, async g => {
      await g.start(2); await g.tap('[data-act="music"]'); await g.wait(200);
      const rows = await g.page.$$eval('.trk.locked .ta', t => t.map(x => x.textContent));
      ok(rows.includes('Turns up somewhere on a retreat.') && !rows.some(r => /labyrinth|stone|visit/i.test(r)), 'generic line only', rows);
    }),
    tst('Dale-Fi cards: a real walk to the Meditation Hall reveals the card on the first find ever; a repeat find is a notification', {}, async g => {
      const WALK = `(() => { const r = Math.random; Math.random = () => (new Error().stack.includes('songEvents') ? 0.1 : r());
        try { S.loc = 0; walk(PLACES.findIndex(p => p.name === 'Meditation Hall')); } finally { Math.random = r; } })()`;
      const settle = async () => { await g.wait(600); for (let i = 0; i < 3 && ['offer', 'enc'].includes(await g.run('sheetKind')); i++) { await g.run("if (enc) { enc = null; } closeSheet()"); await g.wait(300); } };
      await g.start(2); await g.run('ITEMS.forEach(i => { S.inv[i.id] = 0; })');
      await g.run(WALK); await settle();
      eq(await g.run('[sheetKind, hasSong("w1")]'), ['card', true], 'first find ever: card opens by itself after the walk');
      ok((await g.page.textContent('.cardkick')).includes('sound-bath guy'), 'reveal line');
      await g.run("closeSheet(true); screen = 'welcome'; render()"); await g.start(2); await g.run('ITEMS.forEach(i => { S.inv[i.id] = 0; })');
      await g.run(WALK); await settle();
      eq(await g.run('[sheetKind, hasSong("w1")]'), [null, true], 'already in the collection: no second reveal (by design)');
      ok((await g.page.textContent('#toasts')).includes('New on your Dale-Fi'), 'a notification instead');
    }),
    tst('Dale-Fi cards: the staff USB card waits until the check-in is over', {}, async g => {
      await g.start(2);
      await g.run("S.inv.burner = 5; S.paid.burner = 5000; S.prices = { burner: 2000 }; queue = []; startEncounter()");
      await g.rolls([0.01, 0.5, 0.1], 'encRun()'); // escape, its line, the staff USB
      eq([await g.run('sheetKind'), await g.run('enc.done')], ['enc', true], 'still on the check-in');
      ok(await g.run("collected().includes('w0')"), 'collected during the escape');
      await g.tap('[data-act="encdone"]');
      eq(await g.run('sheetKind'), 'card', 'card after carrying on');
      ok((await g.page.textContent('#sheet')).includes('Staff USB'), 'right card');
      await g.tap('[data-act="close"]'); eq(await g.run('sheetKind'), null, 'Later dismisses');
    }),
    tst('Dale-Fi cards: buying the CD reveals it on the spot; the collection survives reloads and new retreats', {}, async g => {
      await g.start(2);
      await g.run('S.loc = VAN_IX; S.cash = 1000; render()');
      await g.tap('[data-act="van"]'); await g.tap('.cdoffer [data-act="buycd"]');
      eq(await g.run('[sheetKind, S.cash]'), ['card', 850], 'card right away, $150 paid');
      ok((await g.page.textContent('#sheet')).includes('Drunken Unk'), 'right card');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('collected()'), ['s0', 'w2'], 'kept after reload');
      await g.start(0);
      eq(await g.run('[collected(), S.songs]'), [['s0', 'w2'], ['s0']], 'kept into a new retreat, which starts with the retreat track as before');
    }),
    tst('last day: checkout ends the retreat with the right score', {}, async g => {
      await g.start(0);
      await g.run('S.day = S.days; S.cash = 9000; S.van = 1000; S.debt = 2500; render()');
      ok(await g.page.isVisible('[data-act="checkout"]'), 'Check out replaces Rest on the last day');
      await g.tap('[data-act="checkout"]'); await g.tap('[data-act="checkoutgo"]');
      const s = await g.run("({ screen, over: S.over, reason: S.reason, net: netWorth(), save: localStorage.getItem('unpw.save') })");
      eq([s.screen, s.over, s.reason, s.net], ['over', true, 'time', 7500], 'results screen and score (cash + glovebox - debt)');
      eq(s.save, null, 'finished run no longer offered as Continue');
      ok((await g.page.textContent('.over')).includes('$7,500'), 'score shown');
    }),
  ],
};

/* ======================= trading ======================= */
const trading = {
  name: 'trading', about: 'buying and selling, prices, Dale\'s van and upgrades', where: 'desktop Chromium',
  tests: [
    tst('receive: limited by cash and by cushion space', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { wine: 50 }; S.cash = 1000; render()");
      eq(await g.run("canBuy('wine')"), 20, 'cash-limited');
      await g.run("S.cap = 15; render()");
      eq(await g.run("canBuy('wine')"), 15, 'space-limited');
      await g.tap('[data-item="wine"]'); await g.tap('[data-tset="max"]'); await g.tap('#tgo');
      const s = await g.run("({ cash: S.cash, inv: S.inv.wine, paid: S.paid.wine, free: free() })");
      eq(s, { cash: 250, inv: 15, paid: 750, free: 0 }, 'after receiving 15');
      ok((await g.run('S.log.at(-1)')).startsWith('Received 15'), 'journal records the purchase');
    }),
    tst('let go: cash, cost basis and profit', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { charger: 400 }; S.inv.charger = 10; S.paid.charger = 3000; S.cash = 0; render()");
      await g.tap('[data-item="charger"]');
      eq(await g.run('trade.mode'), 'sell', 'sheet opens on Let go when the price beats what you paid');
      await g.tap('[data-tset="half"]'); await g.tap('#tgo');
      const s = await g.run('({ cash: S.cash, inv: S.inv.charger, paid: S.paid.charger, profit: S.stats.profit })');
      eq(s, { cash: 2000, inv: 5, paid: 1500, profit: 500 }, 'sold 5 of 10 bought at $300');
      await g.run("trade = { id: 'charger', mode: 'sell', q: 5 }; doTrade()");
      eq(await g.run('[S.inv.charger, S.paid.charger]'), [0, 0], 'selling out clears the cost basis');
    }),
    tst('goods nobody trades here can\'t be bought or sold', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { wine: 50 }; S.inv.burner = 2; render()");
      ok(await g.page.isVisible('[data-item="burner"]'), 'held goods stay listed');
      await g.tap('[data-item="burner"]');
      ok((await g.page.textContent('#sheet')).includes('No one at'), 'explains nobody is trading them');
      eq(await g.run("canBuy('burner')"), 0, 'cannot buy');
    }),
    tst('markets: at least 4 goods, prices in range (gossip included)', {}, async g => {
      await g.start(2);
      const bad = await g.run(`(() => { const out = [];
        for (let loc = 0; loc < PLACES.length; loc++) { S.loc = loc;
          for (let i = 0; i < 300; i++) { genPrices(); const ids = Object.keys(S.prices); if (ids.length < 4) out.push('only ' + ids.length + ' goods');
            for (const id of ids) { const it = BYID[id], b = PLACES[loc].bias[id] || 1, p = S.prices[id];
              if (!Number.isInteger(p) || p < 1 || p < Math.floor(it.min * b / 4) - 1 || p > Math.ceil(it.max * b * 3.5) + 1) out.push(id + '=' + p); } } }
        return out.slice(0, 5); })()`);
      eq(bad, [], 'out-of-range prices');
    }),
    tst('Dale\'s van: pay, borrow cap, stash and take out', {}, async g => {
      await g.start(2);
      await g.run('S.loc = VAN_IX; S.cash = 3000; S.debt = 1100; render()');
      await g.tap('[data-act="van"]'); await g.tap('[data-vmode="pay"]'); await g.tap('[data-vset="max"]'); await g.tap('#vgo');
      eq(await g.run('[S.cash, S.debt, S.stats.paidDay]'), [1900, 0, 1], 'paid off');
      eq(await g.run('S.screen || screen'), 'game', 'paying Dale off does not end the game');
      await g.run("vanMode = 'borrow'; vanAmt = 99999; vanGo()");
      eq(await g.run('S.debt'), 0, 'borrowing more than the cap is refused');
      await g.run("vanMode = 'borrow'; vanAmt = vanMax('borrow'); vanGo()");
      eq(await g.run('[S.debt, S.cash]'), [5000, 6900], 'borrow up to $5,000 owed');
      await g.run("vanMode = 'stash'; vanAmt = 4000; vanGo(); vanMode = 'take'; vanAmt = 1000; vanGo()");
      eq(await g.run('[S.cash, S.van]'), [3900, 3000], 'glovebox moves');
      eq(await g.run('netWorth()'), 1900, 'net worth = cash + glovebox - debt');
    }),
    tst('market supply: buying draws down stock and the sheet tracks it', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { charger: 300 }; market().s.charger = 7; S.cash = 100000; render()");
      eq(await g.run("canBuy('charger')"), 7, 'buy max is the stock left');
      await g.tap('[data-item="charger"]');
      ok((await g.page.textContent('#sheet')).includes('7 for sale'), 'sheet shows stock left');
      await g.run("trade.q = 3; doTrade()");
      eq(await g.run("[S.inv.charger, market().s.charger, canBuy('charger')]"), [3, 4, 4], 'bought 3 of 7, 4 left');
      await g.run("trade = { id: 'charger', mode: 'buy', q: 5 }; doTrade()");
      eq(await g.run('S.inv.charger'), 3, 'buying past the stock is refused');
      await g.run("market().s.charger = 0; render()");
      ok((await g.page.textContent('[data-item="charger"]')).includes('3 held'), 'held count still shown');
      await g.run("S.inv.charger = 0; S.paid.charger = 0; render()");
      ok(/sold out/i.test(await g.page.textContent('[data-item="charger"]')), 'row says sold out');
      await g.tap('[data-item="charger"]');
      eq(await g.page.textContent('#tgo'), 'Sold out', 'button says sold out');
      ok(await g.page.isDisabled('#tgo'), 'and is disabled');
    }),
    tst('circulation: buy out a spot, let some go there, and they are for sale again; saved with the run', {}, async g => {
      await g.start(2);
      const here = await g.run('S.loc');
      await g.run("S.prices = { burner: 2000 }; market().s.burner = 10; S.cash = 100000; S.cap = 400; ITEMS.forEach(i => { S.inv[i.id] = 0; S.paid[i.id] = 0; }); render()");
      await g.tap('[data-item="burner"]'); await g.tap('[data-tset="max"]'); await g.tap('#tgo');
      eq(await g.run('[S.inv.burner, market().s.burner]'), [10, 0], 'bought all 10');
      ok(/sold out/i.test(await g.page.textContent('[data-item="burner"]')), 'row: held and sold out together');
      await g.tap('[data-item="burner"]');
      eq(await g.run('trade.mode'), 'sell', 'the sheet opens on Let go');
      ok(/sold out/i.test(await g.page.textContent('.item-head')), 'sold out still shows on Let go');
      ok(await g.page.isDisabled('[data-tmode="buy"]'), 'Receive is off');
      eq(await g.page.getAttribute('[data-tmode="buy"]', 'aria-label'), 'Receive: sold out', 'and says why');
      await g.run("trade.q = 6; doTrade()");
      eq(await g.run('[S.inv.burner, market().s.burner]'), [4, 6], 'let go of 6: 6 for sale here again');
      ok(!/sold out/i.test(await g.page.textContent('[data-item="burner"]')), 'sold out clears from the row');
      await g.tap('[data-item="burner"]'); await g.tap('[data-tmode="buy"]');
      ok((await g.page.textContent('#sheet')).includes('6 for sale'), 'the sheet shows them for sale');
      eq(await g.run("canBuy('burner')"), 6, 'and you can receive them back');
      await g.run('closeSheet(true)');
      const away = await g.run(`PLACES.findIndex((_, i) => i !== ${here} && HOURS[${here}][i] === 1)`);
      await g.run(`S.hour = 8; walk(${away}); queue = []; closeSheet(true)`);
      eq(await g.run(`S.mk[${away}].s.burner === S.mk[${away}].b.burner && S.mk[${here}].s.burner >= 6`), true, 'location-specific: nothing moved to the other spot');
      await g.run(`walk(${here}); queue = []; closeSheet(true)`);
      ok(await g.run('market().s.burner') >= 6, 'revisit the same day: still there');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U); await g.tap('[data-act="continue"]');
      ok(await g.run(`S.mk[${here}].s.burner`) >= 6, 'kept through a reload');
      await g.run(`S.mk[${here}].s.burner = 300; S.mk[${here}].g = 0`);
      await g.rolls([...Array(20).fill(0.1), 0.6], 'genPrices()', 0.1);
      eq(await g.run('market().s.burner'), 300, 'a crash never takes away stock that selling put there');
      await g.run(`S.mk[${here}].s.burner = 300; S.day += 1; market()`);
      eq(await g.run('market().s.burner'), 300, 'mornings never trim it either');
    }),
    tst('sold out is told apart from not enough cash and a full cushion', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { wine: 50 }; market().s.wine = 5; S.cash = 10; S.inv.wine = 2; S.paid.wine = 60; render()");
      await g.tap('[data-item="wine"]');
      eq(await g.run('trade.mode'), 'sell', 'opens on Let go');
      const t = await g.page.textContent('#sheet');
      ok(t.includes('5 for sale') && t.includes('Not enough cash for one.') && !/sold out/i.test(await g.page.textContent('.item-head')), 'in stock, but no cash: says so, not sold out', t);
      await g.run("closeSheet(true); S.cash = 1000; S.cap = 2; render()"); await g.tap('[data-item="wine"]');
      ok((await g.page.textContent('#sheet')).includes('Your cushion is full.'), 'full cushion: says so');
    }),
    tst('market supply: differs by spot, no refill by walking away and back the same day; refills overnight', {}, async g => {
      await g.start(3);
      const lot = await g.run('VAN_IX'), hall = await g.run("PLACES.findIndex(p => p.name === 'Meditation Hall')");
      // a crash in the opening gossip legitimately adds stock at the start spot, so only check stock is at least the usual amount
      eq(await g.run(`S.mk.every(m => ITEMS.every(it => Number.isInteger(m.s[it.id]) && m.s[it.id] >= 1 && m.s[it.id] >= m.b[it.id]))`), true, 'every spot starts stocked, whole numbers');
      eq(await g.run(`S.mk.filter((m, i) => i !== S.loc).every(m => ITEMS.every(it => m.s[it.id] === m.b[it.id]))`), true, 'everywhere else, exactly the usual amount');
      const avg = await g.run(`(() => { let a = 0, b = 0; for (let i = 0; i < 400; i++) { const mk = newMarkets(); a += mk[${lot}].b.burner; b += mk[${hall}].b.burner; } return [a / 400, b / 400]; })()`);
      ok(avg[0] > avg[1] * 1.3, 'the cheap spot for burners (the van) carries more than the pricey one', avg);
      const here = await g.run('S.loc');
      await g.run(`S.mk[${here}].s.wine = 0; S.mk[${here}].b.wine = 40; S.hour = 8; queue = []`);
      const away = await g.run(`PLACES.findIndex((_, i) => i !== ${here} && HOURS[${here}][i] === 1)`);
      await g.run(`walk(${away}); queue = []; closeSheet(true); walk(${here}); queue = []; closeSheet(true)`);
      eq(await g.run('[S.loc, S.day]'), [here, 1], 'back where we started, same day');
      // a wine crash in the gossip on the way back legitimately brings stock, so only check when there wasn't one
      if (!(await g.run('S.log.some(t => t.includes(BYID.wine.down))'))) eq(await g.run(`S.mk[${here}].s.wine`), 0, 'same day: still sold out');
      await g.run(`S.mk[${here}].s.wine = 0; S.day += 1`); await g.run(`market(${here})`);
      eq(await g.run(`S.mk[${here}].s.wine`), 20, 'next morning: half the usual amount back');
      await g.run('S.day += 3'); await g.run(`market(${here})`);
      eq(await g.run(`S.mk[${here}].s.wine`), 40, 'never past the usual amount');
    }),
    tst('selling has no limit: a big batch fetches the full board price, spikes included', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { charger: 400 }; S.inv.charger = 300; S.paid.charger = 30000; S.cash = 0; S.cap = 400; render()");
      await g.tap('[data-item="charger"]'); await g.tap('[data-tset="max"]');
      eq(await g.page.textContent('#tgo'), 'Let go of 300 for $120,000', 'button shows the full price for all of them');
      await g.tap('#tgo');
      eq(await g.run('[S.cash, S.inv.charger]'), [120000, 0], 'paid in full');
      await g.run("S.prices = { charger: 1300 }; S.inv.charger = 200; S.paid.charger = 20000; trade = { id: 'charger', mode: 'sell', q: 200 }; doTrade()");
      eq(await g.run('S.cash'), 120000 + 260000, 'the same spot again, at a spike: full price again');
      ok(!(await g.page.textContent('#sheet') || '').includes('filling up'), 'no saturation warning anywhere');
    }),
    tst('gossip: a crash brings stock once per spot per day; a spike moves no stock', {}, async g => {
      await g.start(3);
      // all goods on offer, gossip fires, it picks burners (first in the list), and the 21st roll makes it a crash (0.6) or a spike (0.2)
      const crash = [...Array(20).fill(0.1), 0.6], spike = [...Array(20).fill(0.1), 0.2];
      await g.run("const m = market(); m.b.burner = 4; m.s.burner = 0; m.g = 0");
      await g.rolls(spike, 'genPrices()', 0.1);
      eq(await g.run('[market().s.burner, market().g, S.prices.burner > BYID.burner.max]'), [0, 0, true], 'a spike: price up, no stock');
      await g.rolls(crash, 'genPrices()', 0.1);
      const first = await g.run('market().s.burner');
      ok(first >= 6 && first <= 8, 'a crash later that day still brings extra stock', first);
      await g.run('market().s.burner = 0');
      await g.rolls(crash, 'genPrices()', 0.1);
      eq(await g.run('market().s.burner'), 0, 'a second crash at the same spot the same day brings nothing');
      await g.run('S.day += 1; market().s.burner = 0');
      await g.rolls(crash, 'genPrices()', 0.1);
      ok(await g.run('market().s.burner') > 0, 'next day it works again');
      await g.run('const m = market(); m.s.burner = 9; m.g = 0');
      await g.rolls(crash, 'genPrices()', 0.1);
      eq(await g.run('market().s.burner'), 10, 'never more than two and a half times the usual amount');
    }),
    tst('market supply survives a reload, and older saves get a market', {}, async g => {
      await g.start(2);
      await g.run("S.prices = { wine: 40 }; market().s.wine = 5; render()");
      const loc = await g.run('S.loc');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      await g.tap('[data-act="continue"]');
      eq(await g.run(`S.mk[${loc}].s.wine`), 5, 'stock kept');
      await g.run("const r = JSON.parse(localStorage.getItem('unpw.save')); delete r.mk; localStorage.setItem('unpw.save', JSON.stringify(r))");
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      await g.tap('[data-act="continue"]');
      eq(await g.run('Array.isArray(S.mk) && S.mk.length === PLACES.length && S.mk.every(m => ITEMS.every(it => m.s[it.id] >= 1))'), true, 'old save loads with fresh markets');
    }),
    tst('cushion upgrade offer adds 40 spaces for its price', {}, async g => {
      await g.start(2);
      await g.run('S.cash = 5000; queue = []');
      const k = await g.run('S.k');
      await g.rolls([0.15 * k], 'rollEvents(); runQueue()');
      eq(await g.run("$('#sheetTitle')?.textContent"), 'A bigger cushion', 'offer shown');
      const price = +(await g.page.textContent('[data-act="offeryes"]')).replace(/\D/g, '');
      await g.tap('[data-act="offeryes"]');
      eq(await g.run('[S.cap, S.cash]'), [140, 5000 - price], 'cushion bought');
      ok((await g.run('S.log.at(-1)')).includes(`$${price.toLocaleString('en-US')}`), 'journal records the price paid', await g.run('S.log.at(-1)'));
    }),
  ],
};

/* ======================= encounters and decoys ======================= */
const ENC = "S.inv.burner = 20; S.paid.burner = 40000; S.prices = { burner: 2000 }; S.zen = 100; queue = []; startEncounter()";
const encounters = {
  name: 'encounters', about: 'Guide Saffron check-ins, every way out, and decoys', where: 'desktop Chromium',
  tests: [
    tst('she can\'t be dismissed and offers every option', {}, async g => {
      await g.start(2); await g.run(ENC);
      eq(await g.run('sheetKind'), 'enc', 'check-in open');
      ok(!(await g.page.isVisible('#sheet .xbtn')), 'no close button');
      for (const a of ['encrun', 'encdecoy', 'enchand', 'encdonate']) ok(await g.page.isVisible(`[data-act="${a}"]`), `${a} offered`);
    }),
    tst('failed escape: she takes from your most valuable goods and costs zen', {}, async g => {
      await g.start(2); await g.run(ENC + "; S.inv.wine = 30; S.prices.wine = 60");
      await g.rolls([0.99], 'encRun()');
      const s = await g.run('({ burner: S.inv.burner, wine: S.inv.wine, zen: S.zen, done: enc.done })');
      ok(s.burner < 20 && s.wine === 30, 'burners (most valuable) confiscated, wine untouched', s);
      ok(s.zen < 100 && !s.done, 'zen lost, still with her', s);
    }),
    tst('journal: a round with her records the goods and the zen; a getaway is recorded too', {}, async g => {
      await g.start(2); await g.run(ENC);
      await g.rolls([0.99], 'encRun()');
      const s = await g.run('({ last: S.log.at(-1), lost: 20 - S.inv.burner, zen: 100 - S.zen })');
      ok(s.last.endsWith(`Guide Saffron confiscated ${s.lost} burner phones, about $${(s.lost * 2000).toLocaleString('en-US')}. Zen -${s.zen}.`), 'one entry: what she took and the zen it cost', s);
      await g.rolls([0.01, 0.5, 0.99], 'encRun()');
      ok((await g.run('S.log.at(-1)')).startsWith('Slipped away from Guide Saffron ('), 'the getaway is recorded', await g.run('S.log.at(-1)'));
    }),
    tst('successful escape ends it with nothing taken', {}, async g => {
      await g.start(2); await g.run(ENC);
      await g.rolls([0.01, 0.5, 0.99], 'encRun()'); // escape, its line, and no staff USB this time
      eq(await g.run('[enc.done, S.inv.burner, S.zen]'), [true, 20, 100], 'got away clean');
      await g.tap('[data-act="encdone"]');
      eq(await g.run('[enc, sheetKind]'), [null, null], 'check-in closed');
    }),
    tst('hand over a third of the top item, or donate 15% of cash', {}, async g => {
      await g.start(2); await g.run(ENC + '; S.zen = 90');
      await g.tap('[data-act="enchand"]');
      eq(await g.run('[S.inv.burner, enc.done, S.zen]'), [13, true, 94], 'handed over 7 of 20, zen +4');
      await g.tap('[data-act="encdone"]');
      await g.run('S.cash = 1000; startEncounter()');
      await g.tap('[data-act="encdonate"]');
      eq(await g.run('[S.cash, enc.done]'), [850, true], 'donated $150');
    }),
    tst('an emptied cushion ends the check-in', {}, async g => {
      await g.start(2); await g.run("S.inv.wine = 1; S.prices = { wine: 50 }; queue = []; startEncounter()");
      await g.rolls([0.99], 'encRun()');
      eq(await g.run('[used(), enc.done]'), [0, true], 'she drifts away');
    }),
    tst('zen hitting zero snaps: DOS screen, then the results screen', {}, async g => {
      await g.start(2); await g.run(ENC + '; S.zen = 1');
      await g.rolls([0.99], 'encRun()');
      ok(await g.page.isVisible('#dos'), 'DOS screen shown');
      await g.page.click('#dos');
      eq(await g.run('[screen, S.reason]'), ['over', 'zen'], 'retreat ended by snapping');
      ok((await g.page.textContent('.over')).includes('Snapped'), 'Snapped takeaway');
    }),
    tst('decoys: pulled people stay gone; clearing everyone pays a fanny pack', {}, async g => {
      await g.start(2);
      const endurance = await g.run("typeof DECOY_SHARES !== 'undefined'");
      await g.run(ENC + `; ${endurance ? 'S.decoyShares = 2 * DECOY_SHARES; ' : ''}S.decoys = 2; enc.n = 3; enc.left = 3; enc.vols = ['vol1', 'vol2']; encSheet()`);
      ok(!(await g.page.isDisabled('[data-act="encdecoy"]')), 'decoy button enabled');
      await g.rolls([0.1, 0.9], 'encDecoy()');
      eq(await g.run('[enc.left, enc.gone.length, enc.done]'), [2, 1, false], 'one pulled away (a volunteer first), she takes her cut');
      const cash = await g.run('S.cash');
      await g.rolls([0.1, 0.1, 0.5], 'encDecoy()');
      const s = await g.run('({ left: enc.left, done: enc.done, wins: S.stats.decoyWins, cash: S.cash, decoys: S.decoys })');
      eq([s.left, s.done, s.wins], [0, true, 1], 'everyone pulled away on the second round');
      ok(s.cash >= cash + 300 && s.cash <= cash + 1200, 'fanny pack: $100-$400 per person', s.cash - cash);
      if (endurance) eq(await g.run('S.decoyShares'), 2 * (await g.run('DECOY_SHARES')) - 4, 'each attempt used a breakthrough');
      else eq(s.decoys, 2, 'decoys stay for the whole retreat');
    }),
    tst('decoy offers: price climbs with each hire, none past the maximum', {}, async g => {
      await g.start(2);
      const k = await g.run('S.k');
      await g.run('S.cash = 99999; queue = []');
      await g.rolls([0.21 * k], 'rollEvents(); runQueue()', 0.5);
      eq(await g.run("$('#sheetTitle')?.textContent"), 'A decoy for hire', 'offer shown');
      const p1 = +(await g.page.textContent('[data-act="offeryes"]')).replace(/\D/g, '');
      await g.tap('[data-act="offeryes"]');
      await g.rolls([0.21 * k], 'rollEvents(); runQueue()', 0.5);
      const p2 = +(await g.page.textContent('[data-act="offeryes"]')).replace(/\D/g, '');
      await g.tap('[data-act="offeryes"]');
      eq(await g.run('S.decoys'), 2, 'two hired');
      ok(p1 === 150 && p2 === 270, 'first ~$150, next ~80% more (at mid-range rolls)', [p1, p2]);
      await g.run("S.decoys = MAXDECOY; if (typeof DECOY_SHARES !== 'undefined') S.decoyShares = MAXDECOY * DECOY_SHARES");
      await g.rolls([0.21 * k], 'rollEvents(); runQueue()', 0.5);
      ok(await g.run("$('#sheetTitle')?.textContent") !== 'A decoy for hire', 'no offer at the maximum');
    }),
  ],
};

/* ======================= debt: Dale's tab, his notes, the journal after checkout ======================= */
/* Puts a run on its last day with this money, then checks out through the real buttons. */
const checkoutWith = async (g, { cash, van = 0, debt }) => {
  await g.run(`S.day = S.days; S.cash = ${cash}; S.van = ${van}; S.debt = ${debt}; queue = []; closeSheet(true); render()`);
  await g.tap('[data-act="checkout"]'); await g.tap('[data-act="checkoutgo"]');
  return g.run("({ screen, reason: S.reason, net: netWorth(), take: $('.over .take').textContent, head: $('.over h1').textContent, art: !!$('.over .tabart'), song: endingSong() })");
};
/* The note roll: nothing else happens on the walk (0.99), Dale's note fires (0), its zen cost is the middle of 5 to 12. */
const NOTE_ROLL = [0.99, 0, 0.5];
const debt = {
  name: 'debt', about: "Dale's tab at checkout, his collection notes, and the journal after checkout", where: 'desktop Chromium',
  tests: [
    tst('square with Dale: winning takeaways, songs and screen unchanged', {}, async g => {
      await g.start(0);
      const s = await checkoutWith(g, { cash: 500000, debt: 0 });
      eq([s.screen, s.reason, s.net, s.take, s.head, s.art, s.song], ['over', 'time', 500000, 'Opened your own retreat', 'Your retreat is complete.', false, 'win-moment'], 'top takeaway when square');
    }),
    tst("the reported run: $898,451 net worth with $959 owed is the Dale Fail", {}, async g => {
      await g.start(0);
      const s = await checkoutWith(g, { cash: 899000, van: 410, debt: 959 });
      eq([s.reason, s.net, s.take, s.head, s.art, s.song], ['time', 898451, 'Dale Fail: Owes Dale forever', "You didn't square up, man.", true, 'dale-tab'], 'Dale Fail');
      const txt = await g.page.textContent('.over');
      ok(txt.includes('You had the money. Dale had the tab.'), 'could-afford line');
      ok(txt.includes("Dale still gave you a ride to the airport. He didn't say a word the entire way."), 'airport line, in the ending');
      for (const v of ['$899,000', '$410', '-$959', '$898,451']) ok(txt.includes(v), `ledger shows ${v}`);
      ok(await g.page.isVisible('.over .tabart'), 'Dale is on screen');
      eq(await g.run('superlative()'), "Dale's favorite liability", 'superlative');
      await g.run("$('#signname').value = 'Tester'"); await g.tap('[data-act="sign"]');
      eq(await g.run("store.get('unpw.scores', []).map(e => [e.s, e.t])"), [[898451, 'Dale Fail: Owes Dale forever']], 'guestbook keeps the real net worth');
      eq(await g.run('grades()[4][1]'), { g: 'F', c: 'Still owes Dale $959.' }, 'report card: Financial Wellness');
    }),
    tst('any debt at all is the Dale Fail, at every length; with none, the original takeaways', {}, async g => {
      const CASES = [ // [label, cash, debt, could afford it]
        ['wealthy', 5e6, 2000, true], ['modestly profitable', 30000, 2000, true], ['broke', 1500, 1200, true],
        ['negative net worth', 300, 4000, false], ['owing exactly $1', 2e6, 1, true]];
      for (let m = 0; m < 4; m++) {
        for (const [label, cash, debt, afford] of CASES) {
          await g.run(`closeSheet(true); startGame(MODES[${m}])`);
          const s = await checkoutWith(g, { cash, debt });
          eq([s.net, s.take, s.head, s.art, s.song], [cash - debt, 'Dale Fail: Owes Dale forever', "You didn't square up, man.", true, 'dale-tab'], `mode ${m}, ${label}`);
          eq(await g.page.textContent('.over .lede'), afford ? 'You had the money. Dale had the tab.' : "You couldn't pay. Dale still had the tab.", `mode ${m}, ${label}: lede`);
        }
        const mins = await g.run(`MODES[${m}].ranks`);
        for (let i = 0; i < mins.length; i++) {
          await g.run(`closeSheet(true); startGame(MODES[${m}])`);
          const s = await checkoutWith(g, { cash: mins[i], debt: 0 });
          const want = await g.run(`[RANKS[${i + 1}][1], ${i + 1} >= 4 ? 'win-moment' : ${i + 1} >= WIN_RANK ? 'win-thats' : 'checkout']`);
          eq([s.take, s.song, s.head, s.art], [...want, 'Your retreat is complete.', false], `mode ${m}, square, takeaway ${i + 1}`);
        }
      }
    }),
    tst('snapping is still snapping, debt or not', {}, async g => {
      await g.start(0);
      await g.run("S.cash = 900000; S.debt = 959; endGame('zen')");
      eq(await g.run("[rankFor(netWorth(), S.reason), $('.over h1').textContent, !!$('.over .tabart'), endingSong()]"), ['Snapped. Started a podcast', 'You snapped.', false, 'checkout'], 'snap ending');
    }),
    tst('paid off once, then borrowed again: still the Dale Fail and an F', {}, async g => {
      await g.start(0);
      await g.run("S.stats.paidDay = 1; S.stats.borrowed = 2000");
      const s = await checkoutWith(g, { cash: 600000, debt: 2000 });
      eq([s.take, s.song], ['Dale Fail: Owes Dale forever', 'dale-tab'], 'ending');
      eq(await g.run('grades()[4][1].g'), 'F', 'Financial Wellness');
    }),
    tst('checkout and the last morning say what you owe; nothing when square', {}, async g => {
      await g.start(0);
      await g.run('S.day = S.days; S.debt = 1234; render()'); await g.tap('[data-act="checkout"]');
      const due = await g.page.textContent('#sheet .dueline');
      ok(due.includes('$1,234') && !/winner|win\b|takeaway/.test(due), 'checkout sheet shows the balance, without announcing the ending', due);
      eq(await g.run("[...document.querySelectorAll('#sheet button')].map(b => b.dataset.act)"), ['close', 'checkoutgo', 'close'], 'no new payment option');
      await g.run('closeSheet(true); S.debt = 0; render()'); await g.tap('[data-act="checkout"]');
      eq(await g.run("!!$('#sheet .dueline')"), false, 'no line when square');
      await g.run("closeSheet(true); S.day = S.days - 1; S.debt = 500; $('#toasts').innerHTML = ''; rest()"); await g.wait(300);
      ok((await g.page.textContent('#toasts')).includes(`you still owe him $${(await g.run('S.debt')).toLocaleString('en-US')}`), 'last-morning toast names the current balance');
      await g.run("S.day = S.days - 1; S.debt = 0; $('#toasts').innerHTML = ''; rest()"); await g.wait(300);
      ok(!(await g.page.textContent('#toasts')).includes('still owe him'), 'no debt line when square');
    }),
    tst("Dale's notes: show the real balance, cost zen, go in the journal, and stop once you pay", {}, async g => {
      await g.start(2);
      await g.run("S.day = 2; S.debt = 3000; S.zen = 90; $('#toasts').innerHTML = ''");
      await g.rolls(NOTE_ROLL, 'rollEvents()');
      const want = `Dale left a note on your yurt. It's just a number: $3,000. Zen -`;
      ok((await g.run('S.log.at(-1)')).includes(want), 'journal records the note', await g.run('S.log.at(-1)'));
      ok((await g.run('S.zen')) < 90, 'costs zen');
      await g.wait(600);
      ok((await g.page.textContent('#toasts')).includes('$3,000'), 'shown as a notification');
      await g.tap('[data-act="menu"]'); await g.tap('#sheet [data-act="journal"]');
      ok((await g.page.textContent('.journal')).includes(want), 'visible in the journal');
      await g.run('closeSheet(true)');
      const n = await g.run('S.log.length');
      await g.run("S.debt = 0; $('#toasts').innerHTML = ''"); await g.rolls(NOTE_ROLL, 'rollEvents()'); await g.wait(600);
      eq(await g.run('S.log.length'), n, 'no note once square');
      await g.run('S.debt = 2200'); await g.rolls(NOTE_ROLL, 'rollEvents()');
      eq(await g.run('S.log.length'), n, `none at or under $2,200 (the handbook's rule)`);
      await g.run('S.debt = 5000; S.day = 1'); await g.rolls(NOTE_ROLL, 'rollEvents()');
      eq(await g.run('S.log.length'), n, 'none in the first fifth of the retreat');
    }),
    tst("Dale checks in every morning you owe him: once a day, varied, balance shown, no zen cost", {}, async g => {
      await g.start(3);
      const said = [];
      for (let d = 0; d < 9; d++) {
        await g.run("S.debt = 3000; S.zen = 50; S.hour = 22; $('#toasts').innerHTML = ''; rest()"); await g.wait(200);
        const s = await g.run("({ day: S.day, zen: S.zen, last: S.log.filter(t => t.startsWith('Dale: ')).at(-1) || S.log.at(-1), n: S.log.filter(t => t.startsWith('Dale: ')).length, toast: $('#toasts').textContent, dun: S.dunDay })");
        ok(s.last.startsWith('Dale: “') && s.last.endsWith(`You owe him $${(await g.run('S.debt')).toLocaleString('en-US')}.`), 'journaled with the real balance', s.last);
        ok(s.toast.includes(s.last), 'in the morning notification', s.toast);
        eq(s.zen, 65, 'rest zen only; the check-in costs nothing');
        eq(s.n, d + 1, 'exactly one per day');
        said.push(s.last.slice(0, 40));
      }
      ok(said.every((t, i) => i === 0 || t !== said[i - 1]), 'never the same line two mornings running', said);
      ok(new Set(said).size >= 5, 'varied', said);
      eq(await g.run('daleCheckIn()'), null, 'no second check-in the same day');
      ok(!said.some(t => t.includes('six grand')), 'the six-grand line waits for a balance near $6,000');
      await g.run("S.debt = 6000; S.dunSaid = [0,1,2,3,4,6]; S.dunDay = 0");
      ok((await g.run('daleCheckIn()')).includes('six grand'), 'and shows up when the balance fits');
    }),
    tst('no morning check-in when square; the old overnight line stays', {}, async g => {
      await g.start(2);
      await g.run("S.debt = 0; S.hour = 22; $('#toasts').innerHTML = ''; rest()"); await g.wait(200);
      eq(await g.run("S.log.filter(t => t.startsWith('Dale: ')).length"), 0, 'none');
      ok((await g.page.textContent('#toasts')).includes("Dale's meter ran all night: you owe $0."), 'unchanged morning line');
    }),
    tst('older saves without the check-in fields load and get a check-in next morning', {}, async g => {
      await g.start(2);
      await g.run("delete S.dunDay; delete S.dunSaid; saveRun(); closeSheet(true); screen = 'welcome'; render(); continueRun()");
      eq(await g.run('[S.dunDay, S.dunSaid]'), [0, []], 'defaults filled');
      await g.run("S.debt = 2000; S.hour = 22; rest()"); await g.wait(200);
      ok(await g.run("S.log.some(t => t.startsWith('Dale: '))"), 'check-in works');
    }),
    tst('calm moments on walks name no time of day', {}, async g => {
      const bad = await g.run("CALM.filter(t => /dawn|dusk|sunrise|sunset|morning|afternoon|evening|night|noon|burns off|\\d\\s?(am|pm)/i.test(t))");
      eq(bad, [], 'time-specific calm moments');
    }),
    tst("the airport line breaks between its sentences at phone widths", {}, async g => {
      await g.start(0); await g.run("S.cash = 900000; S.debt = 959; endGame('time')");
      const LINES = `(() => { const t = $('.over .ride').firstChild, r = document.createRange(), out = []; let cur = '', top = null;
        for (let i = 0; i < t.length; i++) { r.setStart(t, i); r.setEnd(t, i + 1); const y = Math.round(r.getClientRects()[0]?.top ?? top);
          if (top !== null && y > top + 2) { out.push(cur.trim()); cur = ''; } top = y; cur += t.data[i]; } out.push(cur.trim()); return out; })()`;
      for (const w of [320, 360, 375, 390, 414, 430]) {
        await g.page.setViewportSize({ width: w, height: 800 }); await g.wait(80);
        eq(await g.run(LINES), ['Dale still gave you a ride to the airport.', "He didn't say a word the entire way."], `${w}px`);
      }
    }),
    tst('after checkout: Review your journal shows the finished run, changes nothing, and returns to the results', {}, async g => {
      await g.start(0);
      await g.run("for (let i = 0; i < 400; i++) log('Entry ' + i + '.')");
      ok((await g.run('S.log.length')) > 400, 'nothing dropped from a long run');
      await g.tap('[data-act="menu"]'); await g.tap('#sheet [data-act="journal"]');
      eq(await g.page.$$eval('.journal p', ps => ps.length), 20, 'during the retreat: the last 20, as before');
      await g.run('closeSheet(true)');
      await checkoutWith(g, { cash: 899000, debt: 959 });
      await g.run("$('.over').scrollTop = 200");
      const top = await g.run("$('.over').scrollTop");
      const before = await g.run('JSON.stringify(S)');
      await g.tap('[data-act="journal"]');
      eq(await g.run('sheetKind'), 'journal', 'journal opens');
      eq(await g.page.$$eval('.journal p', ps => ps.map(p => p.textContent)), await g.run('S.log.slice().reverse()'), 'the whole retreat, newest first');
      ok(await g.run("$('.journal p:last-child').textContent.startsWith('Day 1, 7am.')"), 'back to the first entry');
      eq(await g.run("[...document.querySelectorAll('#sheet button')].map(b => b.dataset.act)"), ['close', 'close'], 'nothing to do but close');
      await g.tap('.sheet-actions [data-act="close"]');
      eq(await g.run("[screen, sheetKind, !!$('.over .tabart')]"), ['over', null, true], 'back on the results screen');
      eq(await g.run("$('.over').scrollTop"), top, 'where you left it');
      eq(await g.run('JSON.stringify(S)'), before, 'run unchanged');
      await g.tap('[data-act="journal"]'); await g.page.click('#scrim', { position: { x: 5, y: 5 } });
      eq(await g.run('[screen, sheetKind]'), ['over', null], 'tapping outside also returns');
      await g.tap('[data-act="report"]'); await g.run('closeSheet()');
      eq(await g.run("!!$('.over [data-act=\"journal\"]')"), true, 'still there after the report card');
    }),
    tst('journal: arrivals alone leave no entry; the first thing that happens says when and where', {}, async g => {
      await g.start(2);
      const springs = await g.run("PLACES.findIndex(p => p.name === 'Hot Springs')");
      const n = await g.run('S.log.length');
      // every good on offer, no gossip, no walk event, no song
      await g.rolls([...Array(9).fill(0.1), ...Array(9).fill(0.5), 0.9, 0.9], `S.cash = 1000; S.hour = 8; walk(${springs}); queue = []; closeSheet(true)`, 0.9);
      eq(await g.run('S.log.length'), n, 'a quiet walk writes nothing');
      eq(await g.run('S.flavor'), await g.run(`PLACES[${springs}].via`), 'the arrival line still shows on screen');
      await g.run("S.prices.choc = 5; trade = { id: 'choc', mode: 'buy', q: 2 }; doTrade(); trade = { id: 'choc', mode: 'buy', q: 1 }; doTrade()");
      eq(await g.run('S.log.slice(-2)'), ['10am, Hot Springs. Received 2 chocolate bars for $10.', 'Received 1 chocolate bars for $5.'], 'time and place once, then just what happened');
    }),
    tst('journal: gossip records the good, the place and the price', {}, async g => {
      await g.start(2);
      const springs = await g.run("PLACES.findIndex(p => p.name === 'Hot Springs')");
      // every good on offer, gossip hits burners as a spike, no walk event
      await g.rolls([...Array(9).fill(0.1), ...Array(9).fill(0.5), 0.1, 0.0, 0.2, 0.5, 0.9], `S.cash = 0; S.hour = 8; walk(${springs}); queue = []; closeSheet(true)`, 0.9);
      const p = await g.run('S.prices.burner');
      eq(await g.run('S.log.at(-1)'), `10am, Hot Springs. ${await g.run('BYID.burner.up')} (Burner phones, $${p.toLocaleString('en-US')})`, 'what, where, and the price it hit');
    }),
    tst('journal: offers you were shown are recorded, taken or not', {}, async g => {
      await g.start(2);
      const k = await g.run('S.k');
      await g.run('S.cash = 100000; queue = []; closeSheet(true)');
      await g.rolls([0.15 * k], 'rollEvents(); runQueue()');
      const price = +(await g.page.textContent('[data-act="offeryes"]')).replace(/\D/g, '');
      ok((await g.run('S.log.at(-1)')).endsWith(`A guest offered you a bigger cushion for $${price.toLocaleString('en-US')}.`), 'the offer, with its price', await g.run('S.log.at(-1)'));
      const n = await g.run('S.log.length');
      await g.tap('#sheet [data-act="close"]');
      eq(await g.run('[S.cap, S.log.length]'), [100, n], 'turned down: the offer entry stands alone');
      await g.rolls([0.2 * k], 'rollEvents(); runQueue()');
      const dp = +(await g.page.textContent('[data-act="offeryes"]')).replace(/\D/g, '');
      await g.tap('[data-act="offeryes"]');
      const two = await g.run('S.log.slice(-2)');
      ok(two[0].endsWith(`A guest from Marin offered to be your decoy for $${dp.toLocaleString('en-US')}.`) && two[1].startsWith(`Hired a decoy for $${dp.toLocaleString('en-US')}.`), 'taken: the offer, then the hire', two);
      await g.run('S.cash = 0; queue = []');
      const m = await g.run('S.log.length');
      await g.rolls([0.15 * k], 'rollEvents(); runQueue()');
      eq(await g.run('[sheetKind, S.log.length]'), [null, m], "an offer you can't afford never appears, and isn't recorded");
    }),
    tst('journal: songs say where and how; the CD is one entry', {}, async g => {
      await g.start(2);
      await g.run("S.loc = VAN_IX; S.cash = 1000; buyCD()");
      eq(await g.run("S.log.filter(t => t.includes('CD')).length"), 1, 'one entry');
      ok((await g.run('S.log.at(-1)')).endsWith(`Parking Lot. Dale hands over a burned CD for $150. New on your Dale-Fi: Late Night Record Shop.`), 'place, how, what', await g.run('S.log.at(-1)'));
    }),
    tst('journal: the ending is recorded, and Review your journal opens on it', {}, async g => {
      await g.start(2);
      await g.run("S.cash = 70000; S.van = 0; S.debt = 0; ITEMS.forEach(i => { S.inv[i.id] = 0; }); endGame('time')");
      eq(await g.run('S.log.at(-1)'), `Checked out. Square with Dale. Net worth $70,000. ${await g.run("rankFor(70000, 'time')")}.`, 'square (same hour and place as the morning entry, so no prefix)');
      await g.tap('[data-act="journal"]');
      eq(await g.page.textContent('.journal p:first-child'), await g.run('S.log.at(-1)'), 'newest first: the ending');
      await g.run("closeSheet(true); screen = 'welcome'; render()"); await g.start(2);
      await g.run("S.cash = 900000; S.debt = 50; S.inv.wine = 3; endGame('time')");
      ok((await g.run('S.log.at(-1)')).endsWith('Checked out. You still owed Dale $50. The front desk confiscated what was left in your cushion. Net worth $899,950. Dale Fail: Owes Dale forever.'), 'the Dale Fail, even when rich', await g.run('S.log.at(-1)'));
      await g.run("closeSheet(true); screen = 'welcome'; render()"); await g.start(2);
      await g.run("S.day = 3; S.cash = 500; endGame('zen')");
      ok((await g.run('S.log.at(-1)')).endsWith('On day 3 you broke Noble Silence, screamed at a volunteer, and left to start a podcast about it. Net worth -$600. Snapped. Started a podcast.'), 'a snap', await g.run('S.log.at(-1)'));
    }),
    tst("a new retreat starts with a fresh journal and Dale's standard opening balance", {}, async g => {
      await g.start(0);
      await g.run("log('Old run entry.')");
      await checkoutWith(g, { cash: 899000, debt: 959 });
      await g.tap('[data-act="begin"]'); await g.tap('[data-mode="1"]'); await g.wait(350);
      const s = await g.run("({ debt: S.debt, over: S.over, reason: S.reason, old: S.log.some(t => t === 'Old run entry.'), n: S.log.length })");
      eq([s.debt, s.over, s.reason, s.old], [1100, false, '', false], 'fresh run');
      await g.tap('[data-act="menu"]'); await g.tap('#sheet [data-act="journal"]');
      ok(!(await g.page.textContent('.journal')).includes('Old run entry.'), "journal doesn't carry over");
    }),
  ],
};

/* ======================= saves and settings ======================= */
const saves = {
  name: 'saves', about: 'saved runs, older saves, guestbook and settings survive reloads', where: 'desktop Chromium',
  tests: [
    tst('a run in progress survives a reload and continues exactly', {}, async g => {
      await g.start(1);
      await g.run("S.cash = 1234; S.inv.wine = 7; S.paid.wine = 350; S.day = 3; S.hour = 15; S.loc = 2; log('test entry'); render()");
      const before = await g.run('({ cash: S.cash, inv: S.inv, day: S.day, hour: S.hour, loc: S.loc, log: S.log, mode: S.mode })');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      ok((await g.page.textContent('[data-act="continue"]')).includes('Continue day 3'), 'Continue offered');
      await g.tap('[data-act="continue"]');
      eq(await g.run('({ cash: S.cash, inv: S.inv, day: S.day, hour: S.hour, loc: S.loc, log: S.log, mode: S.mode })'), before, 'state after continue');
      eq(await g.run('Number.isFinite(used()) && Number.isFinite(cushionValue())'), true, 'derived totals are numbers');
    }),
    tst('Save and leave, then continue', {}, async g => {
      await g.start(2); await g.run('S.cash = 777; render()');
      await g.tap('[data-act="menu"]'); await g.tap('[data-act="welcome"]');
      await g.tap('[data-act="continue"]');
      eq(await g.run('[screen, S.cash]'), ['game', 777], 'back in the run');
    }),
    tst('an older save without stats or songs still loads and plays', {
      storage: { 'unpw.save': JSON.stringify({ mode: 'week', modeName: 'The full week', days: 7, rate: 0.0175, k: 0.85, day: 2, hour: 9, cash: 600, van: 0, debt: 1500, cap: 100, decoys: 1, zen: 90, loc: 0,
        prices: { wine: 60, choc: 5, coke: 9, espresso: 2 }, inv: { burner: 0, charger: 0, wifi: 0, wine: 4, doritos: 0, coke: 0, choc: 0, espresso: 0 },
        paid: { burner: 0, charger: 0, wifi: 0, wine: 200, doritos: 0, coke: 0, choc: 0, espresso: 0 }, log: ['An old entry.'], over: false, reason: '', saved: false, flavor: 'x' }) },
    }, async g => {
      await g.tap('[data-act="continue"]');
      ok(await g.run('Number.isFinite(used()) && used() === 4'), 'cushion count intact');
      eq(await g.run('[Array.isArray(S.songs), !!S.stats, S.log[0]]'), [true, true, 'An old entry.'], 'missing fields filled, journal kept');
      eq(await g.run('[S.mk.length === PLACES.length, [4, 5].includes(S.lab), S.jc]'), [true, true, ''], '1.5 fields get defaults');
      await g.run('walk(1); queue = []; closeSheet(true)');
      eq(await g.run('S.loc'), 1, 'can keep playing');
    }),
    tst('a corrupt save doesn\'t break the welcome screen', { storage: { 'unpw.save': '{not json' } }, async g => {
      ok(await g.page.isVisible('[data-act="begin"]'), 'welcome renders');
      ok(!(await g.page.isVisible('[data-act="continue"]')), 'no Continue for an unreadable save');
    }),
    tst('starting a new retreat replaces the saved one', {}, async g => {
      await g.start(2); await g.run('S.cash = 999; render()');
      await g.run("closeSheet(true); screen = 'welcome'; render()");
      await g.start(0);
      eq(await g.run("JSON.parse(localStorage.getItem('unpw.save')).mode"), 'weekend', 'save is the new run');
    }),
    tst('guestbook keeps the top ten per retreat length', {}, async g => {
      for (let i = 0; i < 12; i++) {
        await g.run(`closeSheet(true); screen = 'welcome'; render()`); await g.start(0);
        await g.run(`S.cash = ${(i + 1) * 1000}; S.debt = 0; endGame('time')`);
        await g.page.fill('#signname', `G${i}`); await g.tap('[data-act="sign"]');
      }
      const list = await g.run("store.get('unpw.scores', []).filter(e => e.m === 'weekend').map(e => e.s)");
      eq(list, [12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000], 'top ten, best first');
    }),
    tst('1.5 starts the guestbook over once, and nothing else', { storage: {
      'unpw.scores': JSON.stringify([{ i: 'Old', s: 3000000, t: 'Side hustle sage', at: 1, m: 'intensive' }]),
      'unpw.collected': '["s0","w1"]', 'unpw.sound': 'false', 'unpw.vol': '0.4', 'unpw.mode': '"five"', 'unpw.cur': '"w1"', 'someone.else': 'keep me',
      'unpw.save': JSON.stringify({ mode: 'week', modeName: 'The full week', days: 7, rate: 0.0175, k: 0.85, day: 2, hour: 9, cash: 600, van: 0, debt: 1500, cap: 100, decoys: 0, zen: 90, loc: 0,
        prices: { wine: 60 }, inv: { burner: 0, charger: 0, wifi: 0, petagotchi: 0, wine: 4, doritos: 0, coke: 0, choc: 0, espresso: 0 },
        paid: { burner: 0, charger: 0, wifi: 0, petagotchi: 0, wine: 200, doritos: 0, coke: 0, choc: 0, espresso: 0 }, log: ['An old entry.'], over: false, reason: '', saved: false, flavor: 'x' }) } }, async g => {
      eq(await g.run("localStorage.getItem('unpw.scores')"), null, 'old guestbook released');
      eq(await g.run("['unpw.collected', 'unpw.sound', 'unpw.vol', 'unpw.mode', 'unpw.cur', 'someone.else'].map(k => localStorage.getItem(k))"), ['["s0","w1"]', 'false', '0.4', '"five"', '"w1"', 'keep me'], 'collection, settings and everything else untouched');
      ok(await g.run('!!savedRun()'), 'the saved retreat is still there');
      await g.tap('[data-act="continue"]');
      eq(await g.run('[S.day, S.log[0]]'), [2, 'An old entry.'], 'and continues');
      await g.run(`S.cash = 4321; S.debt = 0; endGame('time')`);
      await g.page.fill('#signname', 'New'); await g.tap('[data-act="sign"]');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run("store.get('unpw.scores', []).map(e => e.i)"), ['New'], 'a new score survives the next load: the reset happens once');
    }),
    tst('Music, Sounds and volume settings persist', {}, async g => {
      await g.run('setMusic(false); setSfx(true); musicNudge(-0.2)');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('[musicOn, sfxOn, M.vol]'), [false, true, 0.5], 'Music off, Sounds on, volume 5 after reload');
      await g.run('setMusic(true); setSfx(false)');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('[musicOn, sfxOn]'), [true, false], 'and the other way round');
    }),
    tst('a player who muted everything before 1.6 starts with Music and Sounds both off', { storage: { 'unpw.sound': 'false' } }, async g => {
      eq(await g.run('[musicOn, sfxOn]'), [false, false], 'old mute kept for both');
      await g.run('setSfx(true)');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('[musicOn, sfxOn]'), [false, true], 'turning one back on leaves the other off');
    }),
    tst('a player with sound on before 1.6 starts with both on', { storage: { 'unpw.sound': 'true' } }, async g => {
      eq(await g.run('[musicOn, sfxOn]'), [true, true], 'both on');
    }),
  ],
};

/* ======================= audio ======================= */
const startMusic = async g => { await g.tap('[data-act="music"]'); await g.tap('[data-act="mplay"]'); await g.wait(400); await g.tap('#sheet [data-act="close"]'); };
const audio = {
  name: 'audio', about: 'Dale-Fi, mute, Guide Saffron\'s theme, leaving the app (songs stubbed; Chromium, not Safari)', where: 'desktop Chromium + iOS-rule emulation',
  tests: [
    tst('Dale-Fi plays and remembers the chosen track', {}, async g => {
      await g.start(2); await startMusic(g);
      eq(await g.run('[musicPlaying(), M.cur]'), [true, 's0'], 'spa track playing');
      await g.run("unlockSong('w2', 'test'); musicPick('w2')"); await g.wait(300);
      eq(await g.run("[musicPlaying(), M.cur, localStorage.getItem('unpw.cur')]"), [true, 'w2', '"w2"'], 'picked track playing and saved');
    }),
    tst('Listen on a newly found song\'s card picks it like the playlist does: what follows, Next and Previous go by the playlist', {}, async g => {
      await g.start(2); await g.run("S.songs.push('w3')"); await startMusic(g);
      await g.run("unlockSong('w1', 'Test find.', true)"); await g.wait(300);
      eq(await g.run('sheetKind'), 'card', 'the new song\'s card is up');
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying(), sheetKind]'), ['w1', true, 'music'], 'Listen plays it now and shows the player');
      eq(await g.page.textContent('#lcdNo'), '02/03', 'and it is the current place in the playlist');
      await g.run('M.audio.currentTime = M.audio.duration - 0.3'); await g.wait(1300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w3', true], 'when it ends, the song after it in the playlist plays (found order no longer matters)');
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'w1', 'Previous goes back to it');
      await g.tap('[data-act="mnext"]'); await g.wait(300); await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('M.cur'), 's0', 'Next goes on from there and wraps around');
      await g.run("cardSheet('w1')"); await g.tap('#sheet [data-act="cardplay"]'); await g.wait(300);
      const viaCard = await g.run('[M.cur, avail().indexOf(M.cur)]');
      await g.tap('#sheet [data-track="s0"]'); await g.wait(200); await g.tap('#sheet [data-track="w1"]'); await g.wait(300);
      eq(await g.run('[M.cur, avail().indexOf(M.cur)]'), viaCard, 'the same as picking it in the playlist');
    }),
    tst('mute silences everything; unmute brings the song back', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.tap('[data-act="menu"]'); await g.tap('[data-act="musictog"]'); await g.wait(200);
      eq(await g.run(`[${AUDIBLE}, musicOn]`), [0, false], 'nothing playing with Music off');
      eq(await g.page.getAttribute('[data-act="musictog"]', 'aria-checked'), 'false', 'the switch shows it');
      await g.tap('[data-act="musictog"]'); await g.wait(400);
      eq(await g.run('musicPlaying()'), true, 'song resumes on unmute');
    }),
    tst('Music and Sounds: all four combinations, switched from the menu, kept through a reload', {}, async g => {
      await g.page.evaluate(() => { const p = BaseAudioContext.prototype, o = p.createOscillator; window.__osc = 0; p.createOscillator = function () { window.__osc++; return o.call(this); }; });
      await g.start(2); await startMusic(g);
      const probe = async () => { await g.page.evaluate(() => { window.__osc = 0; }); await g.run('SND.tap()'); await g.wait(200); return g.run(`[${AUDIBLE} > 0, window.__osc > 0]`); };
      for (const [music, sfx] of [[true, true], [true, false], [false, true], [false, false]]) {
        await g.tap('[data-act="menu"]');
        if ((await g.run('musicOn')) !== music) await g.tap('[data-act="musictog"]');
        if ((await g.run('sfxOn')) !== sfx) await g.tap('[data-act="sfxtog"]');
        eq([await g.page.getAttribute('[data-act="musictog"]', 'aria-checked'), await g.page.getAttribute('[data-act="sfxtog"]', 'aria-checked')], [String(music), String(sfx)], 'switches show the state');
        await g.tap('#sheet [data-act="close"]'); await g.wait(500);
        eq(await probe(), [music, sfx], `Music ${music ? 'on' : 'off'}, Sounds ${sfx ? 'on' : 'off'}: song and chime as set`);
        if (!music) { await g.run(ENC); await g.wait(600); eq(await g.run(AUDIBLE), 0, 'Saffron\'s theme stays silent with Music off'); await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]'); }
      }
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run("[musicOn, sfxOn, localStorage.getItem('unpw.music'), localStorage.getItem('unpw.sfx')]"), [false, false, 'false', 'false'], 'kept after reload');
      await g.tap('[data-act="options"]');
      eq(await g.page.$$eval('#sheet [role="switch"]', b => b.map(x => [x.dataset.act, x.getAttribute('aria-checked')])), [['musictog', 'false'], ['sfxtog', 'false']], 'Options has the same two switches');
      await g.tap('[data-act="musictog"]');
      eq(await g.run('[musicOn, sfxOn, sheetKind]'), [true, false, 'options'], 'and they work there');
    }),
    tst('muted: Saffron\'s theme stays silent', {}, async g => {
      await g.start(2); await g.run('setMusic(false); ' + ENC); await g.wait(500);
      eq(await g.run(AUDIBLE), 0, 'silent check-in');
    }),
    tst('muting during Saffron\'s theme silences it too', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(600);
      await g.run('setMusic(false)'); await g.wait(300);
      eq(await g.run(AUDIBLE), 0, 'nothing audible after muting mid-theme');
    }),
    tst('Saffron: her theme replaces the Dale-Fi, which returns at full volume after', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(900);
      eq(await g.run(`[!T.el.paused, ${AUDIBLE}]`), [true, 1], 'only her theme audible');
      await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]'); await g.wait(900);
      eq(await g.run(`[musicPlaying(), M.duck, ${AUDIBLE}]`), [true, 1, 1], 'Dale-Fi back, full volume, alone');
    }),
    tst('a deliberate pause survives Saffron and later taps', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.tap('[data-act="music"]'); await g.tap('[data-act="mplay"]'); await g.tap('#sheet [data-act="close"]');
      await g.run(ENC); await g.wait(400); await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]');
      await g.page.click('.stats'); await g.wait(400);
      eq(await g.run('musicPlaying()'), false, 'still paused');
    }),
    tst('leaving the app pauses the music; coming back resumes it', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.hidden(true); await g.wait(200);
      eq(await g.run(AUDIBLE), 0, 'silent while away');
      await g.hidden(false); await g.wait(600);
      eq(await g.run('musicPlaying()'), true, 'back on return');
    }),
    tst('paying Dale off plays no song: the Dale-Fi carries on where it was', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run('M.audio.currentTime = 20'); await g.wait(200);
      await g.run("S.loc = VAN_IX; S.cash = 5000; render(); vanMode = 'pay'; vanSheet(); vanAmt = S.debt; vanGo()"); await g.wait(900);
      const s = await g.run(`({ ev: E.on, playing: musicPlaying(), cur: M.cur, t: M.audio.currentTime, audible: ${AUDIBLE}, sheet: sheetKind })`);
      ok(!s.ev && s.playing && s.cur === 's0' && s.t >= 20 && s.t < 23 && s.audible === 1 && s.sheet === 'van', 'no event song; the same song plays on, uninterrupted', s);
      eq(await g.run("'square' in EVENT_SONGS"), false, 'You’re Square is no longer an event song');
    }),
    tst('checkout plays the ending song for the takeaway, alone; leaving results brings back the Dale-Fi', {}, async g => {
      await g.start(2); await startMusic(g);
      for (const [net, want] of [[3e6, 'win-moment'], [1e5, 'win-thats'], [100, 'checkout'], [-500, 'dale-tab']]) {
        await g.run(`if (S.over) { closeSheet(true); startGame(MODES[2]); } S.cash = ${Math.max(0, net)}; S.debt = ${Math.max(0, -net)}; endGame('time')`); await g.wait(900);
        eq(await g.run(`[E.id, !E.el.paused, ${AUDIBLE}]`), [want, true, 1], `ending song for net worth ${net}`);
      }
      await g.tap('[data-act="welcome"]'); await g.wait(1200);
      eq(await g.run(`[E.on, musicPlaying(), ${AUDIBLE}]`), [false, true, 1], 'ending stopped, Dale-Fi back');
    }),
    tst("Dale's ending plays its own short cue once, alone, never looped; muted stays silent", {}, async g => {
      await g.start(0); await startMusic(g);
      await g.run("S.cash = 900000; S.debt = 959; endGame('time')"); await g.wait(900);
      eq(await g.run(`[E.id, !E.el.paused, E.el.loop, musicPlaying(), ${AUDIBLE}]`), ['dale-tab', true, false, false, 1], 'cue alone, not looped');
      ok((await g.run('E.el.src')).endsWith('assets/audio/dale-tab.m4a'), 'the supplied cue');
      await g.run('E.el.currentTime = E.el.duration - 0.3'); await g.wait(1500);
      eq(await g.run(`[E.on, E.el.paused, ${AUDIBLE}]`), [false, true, 1], 'ends once; the Dale-Fi you had playing comes back, as after the other endings');
      await g.run("closeSheet(true); startGame(MODES[0]); setMusic(false); S.cash = 900000; S.debt = 959; endGame('time')"); await g.wait(900);
      eq(await g.run(AUDIBLE), 0, 'muted: silent');
    }),
    tst('leaving the app mid check-in: her theme picks up where it was, not from the start', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(700);
      await g.run('T.el.currentTime = 6'); await g.wait(200);
      await g.hidden(true); await g.wait(200);
      eq(await g.run(AUDIBLE), 0, 'silent while away');
      await g.hidden(false); await g.wait(600);
      const s = await g.run(`({ t: T.el.currentTime, audible: ${AUDIBLE}, th: !T.el.paused })`);
      ok(s.th && s.audible === 1 && s.t >= 6, 'theme playing again from about where it was', s);
    }),
    tst('iOS one-player rule: Dale-Fi comes back after Saffron', {}, async g => {
      await g.page.evaluate(() => { window.__ios = { onePlayer: true }; });
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(600); await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]');
      await g.page.click('.stats'); await g.wait(800);
      eq(await g.run('musicPlaying()'), true, 'Dale-Fi playing again');
    }),
    tst('iOS refused play() on return mid check-in: recovers on the next tap', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(400);
      await g.hidden(true); await g.page.evaluate(() => { window.__ios = { denyPlay: true }; }); await g.hidden(false); await g.wait(300);
      await g.page.evaluate(() => { window.__ios = {}; });
      await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]'); await g.page.click('.stats'); await g.wait(800);
      eq(await g.run('musicPlaying()'), true, 'Dale-Fi playing again');
    }),
  ],
};

/* ======================= dinglezoons: the upgraded player ======================= */
const OWN = "store.set('unpw.dz', true)";
const SONGS = ids => `${JSON.stringify(ids)}.forEach(id => { if (!S.songs.includes(id)) S.songs.push(id); })`;
const atVan = (cash, day = 3) => `S.loc = VAN_IX; S.day = ${day}; S.cash = ${cash}; render(); $('#toasts').innerHTML = ''`;
/* Let the playing song reach its real end (the test songs are 60 seconds). */
const finish = async g => { await g.run('M.audio.currentTime = M.audio.duration - 0.3'); await g.wait(1300); };
const dzPlay = async (g, id = 's0') => { await g.run(`musicSheet(); musicPick('${id}')`); await g.wait(400); };
const dinglezoons = {
  name: 'dinglezoons', about: 'buying the Dinglezoons from Dale, AUTO switches, repeat, the pixelated cover', where: 'desktop Chromium, songs stubbed',
  tests: [
    tst('buying from Dale: $300 off once, journaled, the offer gone; nothing else changes', {}, async g => {
      await g.start(2); await g.run(atVan(1000));
      const before = await g.run('({ debt: S.debt, van: S.van, songs: S.songs.slice(), cap: S.cap })');
      await g.tap('[data-act="van"]');
      ok(await g.page.isVisible('#sheet [data-act="buydz"]'), 'offer at the van');
      ok((await g.page.textContent('.dzoffer')).includes('Top of the line, man. Comes with two tracks from Gary’s ’98 tape. Don’t ask me how he recorded ’em.'), "Dale's pitch");
      eq(await g.page.textContent('[data-act="buydz"]'), 'Buy $300', 'price on the button');
      await g.tap('[data-act="buydz"]');
      eq(await g.run("[S.cash, dzOwned(), localStorage.getItem('unpw.dz'), 'dz' in S, sheetKind]"), [700, true, 'true', false, 'van'], 'paid, owned (kept outside the saved retreat), still at the van');
      eq(await g.page.locator('#sheet [data-act="buydz"]').count(), 0, 'offer gone');
      ok(await g.run("S.log.some(e => /Dinglezoons for \\$300/.test(e.t || e))"), 'journaled');
      eq(await g.run('({ debt: S.debt, van: S.van, songs: S.songs.slice(), cap: S.cap })'), before, 'debt, glovebox, songs and cushion untouched');
    }),
    tst('not before day 3: no offer and no sale on days 1 and 2; offered from day 3 to the last day', {}, async g => {
      await g.start(2);
      for (const day of [1, 2]) {
        await g.run(atVan(5000, day) + '; vanSheet()');
        eq(await g.page.locator('[data-act="buydz"]').count(), 0, `no offer on day ${day}`);
        eq(await g.run('[buyDZ(), S.cash, dzOwned()]'), [false, 5000, false], `no sale on day ${day}`);
        await g.run('closeSheet(true)');
      }
      for (const day of [3, 7]) {
        await g.run(atVan(5000, day) + '; vanSheet()');
        ok(await g.page.isVisible('[data-act="buydz"]'), `offered on day ${day}`);
        await g.run('closeSheet(true)');
      }
      await g.run('closeSheet(true); startGame(MODES[0]); ' + atVan(5000, 3) + '; vanSheet()');
      ok(await g.page.isVisible('[data-act="buydz"]'), 'on a weekend retreat, day 3 is the last day, and it is offered');
    }),
    tst('not enough cash: the button is off and nothing changes', {}, async g => {
      await g.start(2); await g.run(atVan(299)); await g.tap('[data-act="van"]');
      ok(await g.page.isDisabled('[data-act="buydz"]'), 'Buy is off at $299');
      eq(await g.run('[buyDZ(), S.cash, dzOwned()]'), [false, 299, false], 'no sale');
      await g.run('closeSheet(true); S.loc = 0; S.cash = 5000; render()');
      eq(await g.run('[buyDZ(), S.cash, dzOwned()]'), [false, 5000, false], 'only sold at the van');
    }),
    tst("can't buy twice on one retreat; a new retreat needs a new one, and keeps the songs", { storage: { 'unpw.collected': '["s0","w1","w3"]' } }, async g => {
      await g.start(2); await g.run(SONGS(['w1']) + '; ' + atVan(1000) + '; buyDZ()');
      await g.run('vanSheet()');
      eq(await g.page.locator('[data-act="buydz"]').count(), 0, 'no offer once owned');
      eq(await g.run('[buyDZ(), S.cash]'), [false, 700], 'a second purchase does nothing');
      await g.run('closeSheet(true); startGame(MODES[2]); ' + atVan(1000) + '; vanSheet()');
      eq(await g.run("[dzOwned(), localStorage.getItem('unpw.dz'), S.cash, avail()]"), [false, null, 1000, ['s0']], 'the next retreat starts without it, or Gary’s songs');
      ok(await g.page.isVisible('#sheet [data-act="buydz"]'), 'Dale offers it again');
      eq(await g.run('collected()'), ['s0', 'w1', 'w3'], 'the collection is untouched');
      await g.run('closeSheet(true); musicSheet()');
      ok(await g.page.isVisible('#sheet .dalefi'), 'the plain Dale-Fi is back');
      await g.run('closeSheet(true); buyDZ()');
      eq(await g.run('[dzOwned(), S.cash]'), [true, 700], 'and it can be bought again');
    }),
    tst('ownership lasts until the next retreat: through a reload, checkout, the results and the welcome screen, and a reload after checkout', { storage: { 'unpw.collected': '["s0","w1","square"]' } }, async g => {
      await g.start(2); await g.run(SONGS(['w1']) + '; ' + atVan(1000) + '; buyDZ(); saveRun()');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('[dzOwned(), avail()]'), [true, ['s0', 'w1', 'square', 'shoe', 'clam']], 'mid-retreat, on the welcome screen: owned, with the collection and Gary’s songs');
      await g.tap('[data-act="continue"]');
      eq(await g.run('[dzOwned(), S.cash]'), [true, 700], 'the continued retreat still has it');
      await g.run("S.day = S.days; S.debt = 0; endGame('time')"); await g.wait(300);
      eq(await g.run('[screen, dzOwned(), avail()]'), ['over', true, ['s0', 'w1', 'square', 'shoe', 'clam']], 'results screen: still owned');
      await g.run('musicSheet()');
      ok(await g.page.isVisible('#sheet .dz'), 'the Dinglezoons opens on the results screen');
      await g.run('closeSheet(true)'); await g.tap('[data-act="welcome"]'); await g.wait(300);
      await g.run('musicSheet()');
      ok(await g.page.isVisible('#sheet .dz') && await g.page.isVisible('#sheet [data-track="clam"]'), 'and on the welcome screen, with Clam’s End');
      eq(await g.page.textContent('#sheet .muted'), 'Your collection: 3 of 7 songs.', 'the count is still only songs found');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run("[savedRun(), dzOwned(), avail()]"), [null, true, ['s0', 'w1', 'square', 'shoe', 'clam']], 'reopened after checkout, no retreat saved: still owned');
      await g.run("musicSheet(); musicPick('shoe')"); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying()]'), ['shoe', true], 'Gary’s songs play there');
      await g.run('closeSheet(true)'); await g.start(2); await g.wait(400);
      eq(await g.run("[dzOwned(), localStorage.getItem('unpw.dz'), avail(), collected()]"), [false, null, ['s0'], ['s0', 'w1', 'square']], 'a new retreat: plain Dale-Fi, no Gary, the collection (You’re Square too) untouched');
      eq(await g.run('[M.loaded !== "shoe", musicPlaying()]'), [true, true], 'the Gary song that was playing gave way to one you keep');
      await g.run("musicSheet()");
      ok(await g.page.isVisible('#sheet .dalefi'), 'the plain Dale-Fi');
      await g.run('closeSheet(true); ' + atVan(1000, 2) + '; vanSheet()');
      eq(await g.page.locator('[data-act="buydz"]').count(), 0, 'not for sale again before day 3');
      await g.run('closeSheet(true); ' + atVan(1000, 3) + '; vanSheet()');
      ok(await g.page.isVisible('[data-act="buydz"]'), 'and for sale again from day 3');
    }),
    tst('buying keeps the collection and the retreat\'s songs exactly', { storage: { 'unpw.collected': '["s0","w1","w3"]' } }, async g => {
      await g.start(2); await g.run("S.songs = ['s0', 'w1']; " + atVan(1000));
      await g.run('buyDZ(); musicSheet()');
      eq(await g.run('[collected(), S.songs]'), [['s0', 'w1', 'w3'], ['s0', 'w1']], 'collection and retreat songs unchanged');
      eq(await g.page.$$eval('#sheet [data-track]', r => r.map(e => e.dataset.track)), ['s0', 'w1', 'shoe', 'clam'], 'the same songs, in order, plus Gary’s two');
      eq(await g.page.locator('#sheet .trk.locked').count(), 5, 'unfound songs still show as not found');
      eq(await g.run('[collected(), S.songs]'), [['s0', 'w1', 'w3'], ['s0', 'w1']], 'Gary’s songs are never found or collected');
    }),
    tst('before buying: the Dale-Fi is unchanged, and stored settings do nothing', { storage: { 'unpw.rep': 'true', 'unpw.skip': '["w1"]' } }, async g => {
      await g.start(2); await g.run(SONGS(['w1', 'w2'])); await dzPlay(g);
      ok(await g.page.isVisible('#sheet .dalefi'), 'the original player');
      eq(await g.page.locator('#sheet .dz, #sheet [data-auto], #mrep').count(), 0, 'no Dinglezoons controls');
      await finish(g);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'autoplay moves on to the next song, as before');
      await g.run('dzRepeat(); dzAuto("w2")');
      eq(await g.run("[DZ.rep, DZ.skip]"), [true, ['w1']], 'the switches do nothing until owned');
    }),
    tst('AUTO off: autoplay, Next and Previous pass the song over; tapping it still plays it', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1', 'w2'])); await dzPlay(g);
      eq(await g.page.getAttribute('[data-auto="w1"]', 'aria-checked'), 'true', 'AUTO starts lit');
      await g.tap('[data-auto="w1"]');
      eq(await g.run("[DZ.skip, localStorage.getItem('unpw.skip')]"), [['w1'], '["w1"]'], 'switched off and saved');
      eq(await g.page.getAttribute('[data-auto="w1"]', 'aria-checked'), 'false', 'shown off');
      await finish(g);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w2', true], 'autoplay went past it');
      await g.tap('#sheet [data-track="w1"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'a tap plays it');
      await finish(g);
      eq(await g.run('M.cur'), 'w2', 'when it ends, autoplay carries on to the next lit song');
      await g.run("musicPick('s0')"); await g.wait(200); await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w2', true], 'Next passes over it');
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['s0', true], 'so does Previous');
      await g.tap('#sheet [data-track="w1"]'); await g.wait(300); await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'w2', 'Next from a song with AUTO off goes to the next lit one');
      await g.tap('#sheet [data-track="w1"]'); await g.wait(300); await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('M.cur'), 's0', 'and Previous to the one before');
      await g.tap('[data-auto="w1"]');
      eq(await g.run('DZ.skip'), [], 'and it switches back on');
    }),
    tst('the last lit song can\'t be switched off; if every song is off anyway, autoplay, Next and Previous pass none over', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1'])); await dzPlay(g);
      for (const id of ['shoe', 'clam', 'w1']) await g.tap(`[data-auto="${id}"]`);
      ok(await g.page.isDisabled('[data-auto="s0"]'), 'the last lit song is locked on');
      await g.run("dzAuto('s0')");
      eq(await g.run('DZ.skip'), ['shoe', 'clam', 'w1'], 'and stays on');
      await g.run("DZ.skip = ['s0', 'w1', 'w3', 'shoe', 'clam']; musicUI()"); // e.g. set on an earlier retreat that had more songs
      ok(!(await g.page.isDisabled('[data-auto="s0"]')), 'a song that is off can always be switched back on');
      await finish(g);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'with nothing lit, autoplay plays the next song');
      await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['shoe', true], 'Next moves on as usual');
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'and so does Previous');
    }),
    tst('repeat: the song plays again; picking another repeats that one; turning it off moves on', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1', 'w2'])); await dzPlay(g);
      await g.tap('#mrep');
      eq(await g.run("[DZ.rep, localStorage.getItem('unpw.rep')]"), [true, 'true'], 'on and saved');
      eq(await g.page.getAttribute('#mrep', 'aria-pressed'), 'true', 'shown on');
      await finish(g);
      let s = await g.run('({ cur: M.cur, playing: musicPlaying(), t: M.audio.currentTime })');
      ok(s.cur === 's0' && s.playing && s.t < 5, 'same song, from the top', s);
      await g.tap('#sheet [data-track="w2"]'); await g.wait(300); await finish(g);
      s = await g.run('({ cur: M.cur, playing: musicPlaying(), t: M.audio.currentTime })');
      ok(s.cur === 'w2' && s.playing && s.t < 5, 'the picked song repeats', s);
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying(), DZ.rep]'), ['w1', true, true], 'Previous still moves, repeat stays on');
      await g.tap('#mrep'); await finish(g);
      eq(await g.run('[M.cur, musicPlaying(), DZ.rep]'), ['w2', true, false], 'off: autoplay moves on');
    }),
    tst('Gary’s tape: both songs come with it, with the approved cards; AUTO, Next, Previous and repeat work on them', {}, async g => {
      await g.start(2); await g.run(SONGS(['w1']) + '; musicSheet()');
      const locked = await g.page.$$eval('#sheet .trk.locked', r => r.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      ok(locked.some(t => t.includes('Not found yet') && t.includes('Not sold separately. Dale might know?')) && locked.some(t => t.includes('One of two exclusive bonus cuts.')), 'before buying: not found, with their hints', locked);
      eq(await g.page.locator('#sheet [data-act="card"][data-id="shoe"], #sheet [data-act="card"][data-id="clam"]').count(), 0, 'no card before buying');
      await g.run("musicPick('shoe')"); await g.wait(300);
      ok(await g.run("M.cur !== 'shoe'"), 'the basic Dale-Fi can\'t play them');
      await g.run('closeSheet(true); ' + atVan(1000) + '; buyDZ(); musicSheet()');
      eq(await g.run("[avail(), S.songs, collected().includes('shoe')]"), [['s0', 'w1', 'shoe', 'clam'], ['s0', 'w1'], false], 'both playable at once, not added to the finds');
      await g.tap('[data-act="card"][data-id="shoe"]'); await g.page.waitForFunction(() => document.querySelector('.cardart')?.naturalWidth > 0);
      eq(await g.run("({ t: $('.cardtt').textContent, by: !!$('.cardby'), m: $('.cardmeta').textContent, r: $('.cardrev').textContent, src: $('.cardart').getAttribute('src'), cut: $('.cardart').classList.contains('cut') })"),
        { t: 'What’s on Your Shoe', by: false, m: 'Cream of the Crop ’98 · Side A', r: 'Gary discovered this cassette beneath the passenger seat of Dale’s van in 1998 and immediately declared it the greatest recording ever to grace his ears. Dale has no recollection of how it got there.', src: 'assets/img/card-cotc98.webp', cut: true }, 'Side A card');
      await g.run("cardSheet('clam')");
      eq(await g.run("[$('.cardtt').textContent, $('.cardmeta').textContent, $('.cardrev').textContent]"), ['Clam’s End', 'Cream of the Crop ’98 · Side B', 'Gary listened to the second side six times that evening, eventually announcing that he had experienced something beyond music. Dale asked for his tape back.'], 'Side B card');
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying()]'), ['clam', true], 'Listen plays it');
      ok((await g.run('M.audio.src')).endsWith('assets/audio/clam.m4a'), 'its own file');
      await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('M.cur'), 's0', 'Next wraps from the last bonus cut to the first song');
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'clam', 'Previous goes back to it');
      await g.tap('[data-auto="clam"]'); await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'shoe', 'Previous from Clam’s End lands on Side A');
      await finish(g);
      eq(await g.run('M.cur'), 's0', 'autoplay passes over Clam’s End with AUTO off');
      await g.tap('#sheet [data-track="shoe"]'); await g.wait(300); await g.tap('#mrep'); await finish(g);
      const r = await g.run('({ cur: M.cur, playing: musicPlaying(), t: M.audio.currentTime })');
      ok(r.cur === 'shoe' && r.playing && r.t < 5, 'repeat works on it', r);
    }),
    tst('Gary’s songs play on through checkout and stop being playable when a new retreat starts, even mid-song', {}, async g => {
      await g.start(2); await g.run(atVan(1000) + '; buyDZ()'); await dzPlay(g, 'shoe');
      await g.run("closeSheet(true); S.day = S.days; endGame('time')"); await g.wait(400);
      await g.tap('[data-act="welcome"]'); await g.wait(1300);
      eq(await g.run('[M.cur, musicPlaying(), avail().includes("shoe")]'), ['shoe', true, true], 'after the checkout song, Side A is back on the welcome screen');
      await g.start(2); await g.wait(300);
      const s = await g.run('({ loaded: M.loaded, playing: musicPlaying(), avail: avail() })');
      ok(s.loaded !== 'shoe' && s.playing && !s.avail.includes('shoe'), 'a new retreat: the Dale-Fi moved on to a song you keep', s);
      await g.run('musicSheet()');
      eq(await g.page.locator('#sheet [data-track="shoe"]').count(), 0, 'Side A not playable there');
    }),
    tst('You’re Square: paying Dale off in full adds it for good, with the approved card; partial payments don’t', { storage: { 'unpw.collected': '["s0","w2"]' } }, async g => {
      await g.start(2); await g.run("S.loc = VAN_IX; S.cash = 5000; render(); vanMode = 'pay'; vanSheet(); vanAmt = 100; vanGo()");
      eq(await g.run("[hasSong('square'), collected().includes('square')]"), [false, false], 'nothing for a partial payment');
      await g.run('vanAmt = S.debt; vanGo()');
      eq(await g.run("[S.debt, hasSong('square'), collected()]"), [0, true, ['s0', 'w2', 'square']], 'paid in full: found and collected');
      eq(await g.run('sheetKind'), 'van', 'the van sheet stays up');
      await g.tap('#sheet [data-act="close"]'); await g.wait(300);
      eq(await g.run("[sheetKind, $('.cardtt').textContent]"), ['card', 'You’re Square'], 'its card follows the van');
      eq(await g.run("({ by: $('.cardby').textContent, m: $('.cardmeta').textContent, r: $('.cardrev').textContent, src: $('.cardart').getAttribute('src'), cut: $('.cardart').classList.contains('cut') })"),
        { by: 'Dale', m: 'Late 1970s California country rock', r: 'Recorded during Dale’s brief but deeply cherished studio years, this four-track demo remains his proudest musical accomplishment. He has kept the original master in his possession ever since and maintains that the fourth take was the one where everything came together.', src: 'assets/img/card-square.webp', cut: true }, 'card copy and art');
      eq(await g.run('[E.on, musicPlaying()]'), [false, false], 'no song started by itself');
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying()]'), ['square', true], 'plays from the Dale-Fi');
      ok((await g.run('M.audio.src')).endsWith('assets/audio/square.m4a'), 'the existing recording');
      await g.run("closeSheet(true); S.day = S.days; endGame('time')"); await g.wait(300);
      await g.run("closeSheet(true); startGame(MODES[2])");
      eq(await g.run("[collected().includes('square'), hasSong('square')]"), [true, false], 'kept in the collection on the next retreat; found again, like any song, by paying Dale off');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U); await g.run('musicSheet()');
      ok(await g.page.isVisible('#sheet [data-track="square"]'), 'playable from the welcome-screen collection after a reload');
    }),
    tst('You’re Square: before it is found, the hint; the song never plays as an event', {}, async g => {
      await g.start(2); await g.run('musicSheet()');
      ok((await g.page.textContent('#sheet .tracks')).includes('Dale appreciates a settled tab.'), 'its hint');
      await g.run("closeSheet(true); eventSong('square')"); await g.wait(300);
      eq(await g.run('E.on'), false, 'no event song by that name any more');
    }),
    tst('Listen on a card with the Dinglezoons: AUTO and repeat apply from the picked song; a song with AUTO off still plays', {}, async g => {
      await g.start(2); await g.run(OWN + "; S.songs.push('w3', 'w4'); DZ.skip = ['w3']"); await dzPlay(g);
      await g.run("unlockSong('w1', 'Test find.', true)"); await g.wait(300);
      await g.tap('#sheet [data-act="cardplay"]'); await g.wait(400);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'Listen plays it');
      await finish(g);
      eq(await g.run('M.cur'), 'w4', 'autoplay continues after it, passing over w3 (AUTO off)');
      await g.tap('[data-act="mprev"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'w1', 'Previous goes back to it, passing over w3');
      await g.run('M.audio.currentTime = 20'); await g.run("cardSheet('w1')"); await g.tap('#sheet [data-act="cardplay"]'); await g.wait(300);
      const same = await g.run('({ cur: M.cur, playing: musicPlaying(), t: M.audio.currentTime })');
      ok(same.cur === 'w1' && same.playing && same.t >= 20, 'Listen on the song already playing keeps it playing, where it was', same);
      await g.run("dzAuto('w1'); musicPick('w4'); cardSheet('w1')"); await g.tap('#sheet [data-act="cardplay"]'); await g.wait(300);
      eq(await g.run('[M.cur, musicPlaying(), DZ.skip.includes("w1")]'), ['w1', true, true], 'a song with AUTO off still plays from Listen');
      await g.tap('[data-act="mnext"]'); await g.wait(300);
      eq(await g.run('M.cur'), 'w4', 'Next from it goes to the next lit song');
      await g.run("dzRepeat(); cardSheet('w1')"); await g.tap('#sheet [data-act="cardplay"]'); await g.wait(300); await finish(g);
      const r = await g.run('({ cur: M.cur, playing: musicPlaying(), t: M.audio.currentTime })');
      ok(r.cur === 'w1' && r.playing && r.t < 5, 'with repeat on, the song picked by Listen repeats', r);
    }),
    tst('repeat beats AUTO off on the song you chose', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1'])); await dzPlay(g, 'w1');
      await g.run("dzAuto('w1'); dzRepeat()"); await finish(g);
      eq(await g.run('[M.cur, musicPlaying()]'), ['w1', true], 'repeats the song you picked even with AUTO off');
    }),
    tst('with repeat on: Saffron, an event song, mute and leaving the app behave as before', {}, async g => {
      await g.start(2); await g.run(OWN + '; DZ.rep = true; ' + SONGS(['w1'])); await dzPlay(g, 'w1'); await g.run('closeSheet(true)');
      await g.run(ENC); await g.wait(900);
      eq(await g.run(`[!T.el.paused, ${AUDIBLE}]`), [true, 1], 'only her theme audible');
      await g.tap('[data-act="enchand"]'); await g.tap('[data-act="encdone"]'); await g.wait(900);
      eq(await g.run(`[musicPlaying(), M.cur, M.duck, ${AUDIBLE}]`), [true, 'w1', 1, 1], 'back on the same song, full volume, alone');
      await g.run("S.loc = VAN_IX; S.cash = 5000; render(); vanMode = 'pay'; vanSheet(); vanAmt = S.debt; vanGo(); closeSheet(true); queue = []"); await g.wait(900);
      eq(await g.run(`[E.on, musicPlaying(), M.cur, ${AUDIBLE}]`), [false, true, 'w1', 1], 'paying Dale off leaves the same song playing');
      await g.run('setMusic(false)'); await g.wait(300);
      eq(await g.run(AUDIBLE), 0, 'Music off silences it');
      await g.run('M.audio.dispatchEvent(new Event("ended"))'); await g.wait(300);
      eq(await g.run(AUDIBLE), 0, 'a repeat with Music off stays silent');
      await g.run('setMusic(true)'); await g.wait(400);
      eq(await g.run('[musicPlaying(), M.cur]'), [true, 'w1'], 'unmute brings it back');
      await g.hidden(true); await g.wait(200);
      eq(await g.run(AUDIBLE), 0, 'silent while away');
      await g.hidden(false); await g.wait(600);
      eq(await g.run('[musicPlaying(), M.cur]'), [true, 'w1'], 'back on return');
    }),
    tst('settings and ownership survive a reload and Continue; older saves load', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1']) + "; dzAuto('w1'); dzRepeat(); saveRun()");
      await g.page.reload(); await g.page.waitForFunction(() => window.__U); await g.tap('[data-act="continue"]');
      eq(await g.run('[dzOwned(), DZ.skip, DZ.rep, S.songs, avail()]'), [true, ['w1'], true, ['s0', 'w1'], ['s0', 'w1', 'shoe', 'clam']], 'all kept, Gary’s songs too');
      await g.run("closeSheet(true); startGame(MODES[2]); " + atVan(1000) + '; buyDZ()');
      eq(await g.run('[DZ.skip, DZ.rep]'), [['w1'], true], 'the switches and repeat are still set on the next Dinglezoons');
      await g.run("store.del('unpw.dz'); const old = JSON.parse(JSON.stringify(S)); old.dz = true; store.set('unpw.save', old)");
      await g.page.reload(); await g.page.waitForFunction(() => window.__U); await g.tap('[data-act="continue"]');
      eq(await g.run("[dzOwned(), 'dz' in S, screen]"), [true, false, 'game'], 'a retreat saved by an earlier 1.6 preview with one bought keeps it');
      await g.run("store.del('unpw.dz'); saveRun()");
      await g.page.reload(); await g.page.waitForFunction(() => window.__U); await g.tap('[data-act="continue"]');
      eq(await g.run('[dzOwned(), screen]'), [false, 'game'], 'an older save without one loads without a Dinglezoons');
    }),
    tst('pixelated cover: drawn from the card art, small and crisp; companion cards keep the full-size art', {}, async g => {
      await g.start(2); await g.run(OWN + '; ' + SONGS(['w1'])); await g.run('musicSheet()'); await g.wait(600);
      const px = await g.page.evaluate(() => {
        const c = document.getElementById('dzArt'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, cols = new Set();
        let drawn = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3]) drawn++; cols.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); }
        const r = c.getBoundingClientRect();
        return { w: c.width, css: Math.round(r.width), drawn, cols: cols.size, render: getComputedStyle(c).imageRendering, id: c.dataset.id };
      });
      ok(px.w === 24 && px.css === 72 && px.drawn === 24 * 24 && px.cols > 8 && px.cols <= 512 && px.render === 'pixelated' && px.id === 's0', 'a 24x24 cover shown at 72px, crisp', px);
      await g.run("musicPick('w1')"); await g.wait(500);
      eq(await g.run("$('#dzArt').dataset.id"), 'w1', 'follows the song');
      eq(await g.page.getAttribute('[data-act="card"][data-id="w1"] img', 'src'), 'assets/img/card-w1.webp', 'list thumbnail is the original art');
      await g.tap('[data-act="card"][data-id="w1"]'); await g.wait(400);
      const art = await g.page.$eval('.cardart', i => [i.getAttribute('src'), i.naturalWidth]);
      eq(art, ['assets/img/card-w1.webp', 480], 'the companion card shows the full-size art');
      await g.tap('#sheet [data-act="music"]');
      ok(await g.page.isVisible('#sheet .dz'), 'Back returns to the Dinglezoons');
    }),
  ],
};

/* ======================= layout: mobile emulation ======================= */
/* Compare content width with the visible width. In mobile emulation innerWidth grows to fit wide content,
   so it can't reveal overflow; clientWidth and the visual viewport stay at the device width. */
const OVERFLOW = 'document.documentElement.scrollWidth - Math.min(document.documentElement.clientWidth, visualViewport ? Math.round(visualViewport.width) : innerWidth)';
const layoutTest = device => tst(`screens fit without sideways scrolling, buttons reachable (${device})`, { device }, async g => {
  const check = async what => eq(await g.page.evaluate(OVERFLOW), 0, `horizontal overflow on ${what}`);
  await check('welcome');
  await g.start(1);
  await g.run("ITEMS.forEach(i => { S.prices[i.id] = i.max; S.inv[i.id] = 9; }); S.decoys = 2; render(); $('#toasts').innerHTML = ''");
  await check('game screen');
  for (const sel of ['[data-act="journey"]', '[data-act="rest"]']) {
    const b = await g.page.locator(sel).boundingBox(); const vh = g.page.viewportSize().height;
    ok(b && b.y + b.height <= vh && b.height >= 40, `${sel} on screen and at least 40px tall`, b);
  }
  const icons = await g.page.$$eval('.topbar .iconbtn', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [b.dataset.act, Math.round(r.width), Math.round(r.height), Math.round(r.right)]; }));
  ok(icons.length === 3 && icons.every(([, w, h, right]) => w >= 40 && h >= 40 && right <= g.page.viewportSize().width), 'header: journal, Dale-Fi and menu, 40px and on screen', icons);
  await g.tap('.topbar [data-act="journal"]'); eq(await g.run('sheetKind'), 'journal', 'header journal opens on tap'); await check('journal from the header'); await g.run('closeSheet(true)');
  await g.tap('[data-act="journey"]'); await check('map'); ok(await g.page.isVisible('.node'), 'map opens on tap'); await g.run('closeSheet(true)');
  await g.tap('[data-item="burner"]'); await check('trade sheet'); await g.run('closeSheet(true)');
  await g.run('S.loc = VAN_IX; render()'); await g.tap('[data-act="van"]'); await check('van sheet'); await g.run('closeSheet(true)');
  await g.run("for (let i = 0; i < 25; i++) log('A fairly long journal entry about trading natural wine at the hot springs ' + i + '.'); render()");
  await g.tap('[data-act="menu"]'); await g.tap('#sheet [data-act="journal"]'); await check('journal'); await g.run('closeSheet(true)');
  await g.run(ENC + "; enc.n = 5; enc.left = 5; enc.vols = ['vol1', 'vol2', 'vol3', 'vol4']; encSheet(); $('#toasts').innerHTML = ''");
  await g.rolls([0.99, 0.5, 0.5, 0.2, 0.2, 0.2, 0.2], 'encRun()', 0.2);
  await check('Saffron after a rough round');
  const hand = g.page.locator('[data-act="enchand"]');
  await hand.scrollIntoViewIfNeeded(); ok(await hand.isVisible(), 'Hand over reachable by scrolling');
  await hand.tap(); eq(await g.run('enc.done'), true, 'tap works on the check-in buttons');
  await g.tap('[data-act="encdone"]');
  await g.run("S.day = S.days; render()"); await g.tap('[data-act="checkout"]'); await g.tap('[data-act="checkoutgo"]');
  await check('results');
  await g.run("S.cash = 900000; S.debt = 959; render()");
  await check("Dale's ending");
  const vw = g.page.viewportSize().width, art = await g.page.locator('.over .tabart').boundingBox();
  ok(art && art.width >= 150 && art.width <= vw - 40 && art.height <= g.page.viewportSize().height * 0.55, "Dale's picture prominent but fits", art);
  const jb = g.page.locator('.over [data-act="journal"]');
  await jb.scrollIntoViewIfNeeded(); const b = await jb.boundingBox();
  ok(b && b.height >= 40, 'Review your journal at least 40px tall', b);
  await jb.tap(); await check('journal after checkout');
  const close = g.page.locator('#sheet .sheet-actions [data-act="close"]');
  await close.scrollIntoViewIfNeeded(); await close.tap();
  eq(await g.run('[screen, sheetKind]'), ['over', null], 'back to the results by tap');
});
const dzLayout = device => tst(`the Dinglezoons, Dale's offer and a companion card fit (${device})`, { device }, async g => {
  await g.start(2); await g.run(atVan(1000)); await g.tap('[data-act="van"]');
  eq(await g.page.evaluate(OVERFLOW), 0, "horizontal overflow on Dale's offer");
  const buy = await g.page.locator('[data-act="buydz"]').boundingBox();
  ok(buy && buy.height >= 36 && buy.x + buy.width <= g.page.viewportSize().width, 'Buy on screen', buy);
  await g.tap('[data-act="buydz"]'); await g.run("closeSheet(true); " + SONGS(['w0', 'w1', 'w2', 'w3', 'w4'])); await g.tap('.topbar [data-act="music"]');
  eq(await g.page.evaluate(OVERFLOW), 0, 'horizontal overflow on the Dinglezoons');
  const vw = g.page.viewportSize().width;
  const keys = await g.page.$$eval('#sheet .dzk, #sheet .dzauto', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [b.dataset.act || b.dataset.auto, Math.round(r.width), Math.round(r.height), Math.round(r.right)]; }));
  ok(keys.length === 14 && keys.every(([, w, h, right]) => w >= 44 && h >= 44 && right <= vw), 'every key and AUTO switch at least 44px and on screen', keys);
  const lbl = await g.page.$$eval('#sheet .dzpl .tt', ts => ts.map(t => Math.round(parseFloat(getComputedStyle(t).fontSize))));
  ok(lbl.every(f => f >= 15), 'playlist text stays readable', lbl);
  await g.tap('#sheet [data-auto="w1"]'); eq(await g.run('DZ.skip'), ['w1'], 'AUTO switch works by tap');
  await g.tap('#mrep'); eq(await g.run('DZ.rep'), true, 'repeat works by tap');
  await g.tap('[data-act="card"][data-id="w4"]'); await g.page.waitForFunction(() => document.querySelector('.cardart')?.naturalWidth > 0);
  eq(await g.page.evaluate(OVERFLOW), 0, 'horizontal overflow on the companion card');
  const art = await g.page.locator('.cardart').boundingBox();
  ok(art && art.width <= vw - 40 && art.width >= 150, 'card art full size and fits', art);
  for (const id of ['shoe', 'square']) {
    await g.run(`S.songs.push('square'); cardSheet('${id}')`); await g.page.waitForFunction(() => document.querySelector('.cardart')?.naturalWidth > 0);
    const hit = await g.page.evaluate(() => { const r = document.querySelector('.xbtn').getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.xbtn'); });
    ok(hit, `the close button stays on top of the ${id} card's art`);
  }
  await g.tap('.xbtn'); eq(await g.run('sheetKind'), null, 'and closes it by tap');
});
const layout = {
  name: 'layout', about: 'phone-sized screens with touch emulation', where: 'Chromium mobile emulation, not a real phone',
  tests: [layoutTest('tiny'), layoutTest('small'), layoutTest('phone'), dzLayout('tiny'), dzLayout('small'),
    tst('desktop: the game sits in a centered column', { device: 'desktop' }, async g => {
      const w = await g.page.evaluate(() => document.getElementById('app').getBoundingClientRect().width);
      ok(w <= 560, 'column at most 560px wide', w);
    })],
};

/* ======================= offline ======================= */
const offline = {
  name: 'offline', about: 'the service worker caches the game and it reloads with no network', where: 'desktop Chromium, service worker on',
  tests: [{ name: 'installs, caches every listed file, and reloads offline', run: async env => {
    const ctx = await env.browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await ctx.newPage();
      await page.goto(env.url.replace('127.0.0.1', 'localhost'));
      await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: 30000 });
      await page.waitForFunction(async () => { const k = (await caches.keys()).find(x => x !== 'unplugged-fonts'); if (!k) return false; return (await (await caches.open(k)).keys()).length > 20; }, null, { timeout: 60000, polling: 500 });
      const sw = fs.readFileSync(path.join(env.root, 'sw.js'), 'utf8');
      const listed = ['CORE', 'AUDIO'].flatMap(k => JSON.parse(new RegExp(`const ${k} = (\\[[^\\]]*\\]);`).exec(sw)[1])).filter(p => p !== './');
      await page.waitForTimeout(1500);
      const cached = await page.evaluate(async () => { const k = (await caches.keys()).find(x => x !== 'unplugged-fonts'); return (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname.replace(/^\//, '')); });
      const missing = listed.filter(p => !cached.includes(p));
      ok(!missing.length, 'files not cached', missing.join(', '));
      await ctx.setOffline(true);
      await page.reload();
      ok(await page.isVisible('[data-act="begin"]'), 'game loads offline');
    } finally { await ctx.close(); }
  } }],
};

export default [staticSuite, smoke, trading, encounters, debt, saves, audio, dinglezoons, layout, offline];
