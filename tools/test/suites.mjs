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
      const missing = listed.filter(p => p !== './' && !fs.existsSync(path.join(root, p)));
      ok(!missing.length, 'sw.js lists files that do not exist', missing.join(', '));
      const assets = ['img', 'audio'].flatMap(d => fs.readdirSync(path.join(root, 'assets', d)).filter(f => /\.(webp|m4a)$/.test(f)).map(f => `assets/${d}/${f}`));
      const uncached = assets.filter(a => !listed.includes(a));
      ok(!uncached.length, 'assets missing from sw.js (they would not work offline)', uncached.join(', '));
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
      await g.tap('[data-act="options"]'); await g.tap('[data-act="news"]');
      eq(await g.run("$('#sheetTitle').textContent"), 'A Note from Guide Saffron', 'title');
      const dates = await g.page.$$eval('.note time', t => t.map(x => x.getAttribute('datetime')));
      ok(dates.length >= 1 && dates.every((d, i) => i === 0 || d <= dates[i - 1]), 'dated, newest first', dates);
      ok((await g.page.textContent('.note')).includes('On Dependence and Resolution'), 'first release present');
      await g.tap('[data-act="close"]');
      eq(await g.run('sheetKind'), null, 'closes');
    }),
    tst('in-game menu › What\'s New opens the same sheet and leaves the run untouched', {}, async g => {
      await g.start(2);
      await g.run("S.cash = 1234; S.zen = 77; render()");
      const before = await g.run('JSON.stringify(S)');
      await g.tap('[data-act="menu"]'); await g.tap('[data-act="news"]');
      eq(await g.run("$('#sheetTitle').textContent"), 'A Note from Guide Saffron', 'same sheet');
      await g.tap('[data-act="close"]');
      eq([await g.run('screen'), await g.run('sheetKind')], ['game', null], 'back in the run');
      eq(await g.run('JSON.stringify(S)'), before, 'run state unchanged');
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
    tst('successful escape ends it with nothing taken', {}, async g => {
      await g.start(2); await g.run(ENC);
      await g.rolls([0.01], 'encRun()');
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
    tst('sound and volume settings persist', {}, async g => {
      await g.run('setSound(false); musicNudge(-0.2)');
      await g.page.reload(); await g.page.waitForFunction(() => window.__U);
      eq(await g.run('[soundOn, M.vol]'), [false, 0.5], 'muted at volume 5 after reload');
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
    tst('mute silences everything; unmute brings the song back', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.tap('[data-act="menu"]'); await g.tap('[data-act="sound"]'); await g.wait(200);
      eq(await g.run(`[${AUDIBLE}, soundOn]`), [0, false], 'nothing playing when muted');
      await g.tap('[data-act="sound"]'); await g.wait(400);
      eq(await g.run('musicPlaying()'), true, 'song resumes on unmute');
    }),
    tst('muted: Saffron\'s theme stays silent', {}, async g => {
      await g.start(2); await g.run('setSound(false); ' + ENC); await g.wait(500);
      eq(await g.run(AUDIBLE), 0, 'silent check-in');
    }),
    tst('muting during Saffron\'s theme silences it too', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run(ENC); await g.wait(600);
      await g.run('setSound(false)'); await g.wait(300);
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
    tst('paying Dale off plays "you\'re square" alone, then the Dale-Fi picks up where it was', {}, async g => {
      await g.start(2); await startMusic(g);
      await g.run('M.audio.currentTime = 20'); await g.wait(200);
      await g.run("S.loc = VAN_IX; S.cash = 5000; render(); vanMode = 'pay'; vanSheet(); vanAmt = S.debt; vanGo(); closeSheet(true)"); await g.wait(900);
      eq(await g.run(`[E.id, !E.el.paused, musicPlaying(), screen, ${AUDIBLE}]`), ['square', true, false, 'game', 1], 'payoff song alone, game continues');
      await g.run('E.el.currentTime = E.el.duration - 0.3'); await g.wait(1500);
      const s = await g.run(`({ on: E.on, playing: musicPlaying(), t: M.audio.currentTime, audible: ${AUDIBLE} })`);
      ok(!s.on && s.playing && s.t >= 20 && s.t < 26 && s.audible === 1, 'Dale-Fi resumed at its position', s);
    }),
    tst('checkout plays the ending song for the takeaway, alone; leaving results brings back the Dale-Fi', {}, async g => {
      await g.start(2); await startMusic(g);
      for (const [net, want] of [[3e6, 'win-moment'], [1e5, 'win-thats'], [-500, 'checkout']]) {
        await g.run(`if (S.over) { closeSheet(true); startGame(MODES[2]); } S.cash = ${Math.max(0, net)}; S.debt = ${Math.max(0, -net)}; endGame('time')`); await g.wait(900);
        eq(await g.run(`[E.id, !E.el.paused, ${AUDIBLE}]`), [want, true, 1], `ending song for net worth ${net}`);
      }
      await g.tap('[data-act="welcome"]'); await g.wait(1200);
      eq(await g.run(`[E.on, musicPlaying(), ${AUDIBLE}]`), [false, true, 1], 'ending stopped, Dale-Fi back');
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
  await g.tap('[data-act="journey"]'); await check('map'); ok(await g.page.isVisible('.node'), 'map opens on tap'); await g.run('closeSheet(true)');
  await g.tap('[data-item="burner"]'); await check('trade sheet'); await g.run('closeSheet(true)');
  await g.run('S.loc = VAN_IX; render()'); await g.tap('[data-act="van"]'); await check('van sheet'); await g.run('closeSheet(true)');
  await g.run("for (let i = 0; i < 25; i++) log('A fairly long journal entry about trading natural wine at the hot springs ' + i + '.'); render()");
  await g.tap('[data-act="menu"]'); await g.tap('[data-act="journal"]'); await check('journal'); await g.run('closeSheet(true)');
  await g.run(ENC + "; enc.n = 5; enc.left = 5; enc.vols = ['vol1', 'vol2', 'vol3', 'vol4']; encSheet(); $('#toasts').innerHTML = ''");
  await g.rolls([0.99, 0.5, 0.5, 0.2, 0.2, 0.2, 0.2], 'encRun()', 0.2);
  await check('Saffron after a rough round');
  const hand = g.page.locator('[data-act="enchand"]');
  await hand.scrollIntoViewIfNeeded(); ok(await hand.isVisible(), 'Hand over reachable by scrolling');
  await hand.tap(); eq(await g.run('enc.done'), true, 'tap works on the check-in buttons');
  await g.tap('[data-act="encdone"]');
  await g.run("S.day = S.days; render()"); await g.tap('[data-act="checkout"]'); await g.tap('[data-act="checkoutgo"]');
  await check('results');
});
const layout = {
  name: 'layout', about: 'phone-sized screens with touch emulation', where: 'Chromium mobile emulation, not a real phone',
  tests: [layoutTest('tiny'), layoutTest('small'), layoutTest('phone'),
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

export default [staticSuite, smoke, trading, encounters, saves, audio, layout, offline];
