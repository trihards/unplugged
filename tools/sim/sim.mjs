// Balance simulator: plays many runs of the real game logic in headless Chromium through the test harness hook,
// with a simple "expert" or "casual" bot, and prints net-worth percentiles, snaps and zen per retreat length.
// It is a calibration aid, not a model of real players: the bots walk at random and a good human beats them.
// usage: node tools/sim/sim.mjs <repo root> <modeIx 0-3|all> <runs> [expert|casual]
//   CFG='{"zen":{...},"rest":20}' overrides ZEN tuning and rest (zen branches only)
//   TAG=name also writes raw results to out-<TAG>-<bot>-<mode>.json in the current directory
import path from 'node:path';
const [, , rootArg, modeArg = 'all', runsArg = '200', botArg = 'expert'] = process.argv;
const root = path.resolve(rootArg);
const lib = await import(path.join(root, 'tools/test/lib.mjs'));
const pw = await lib.loadPlaywright();
const browser = await pw.chromium.launch();
const srv = await lib.serve(root);
const g = await lib.openGame({ browser, url: srv.url, root });
const BOT = `(async (modeIx, runs, bot) => {
  const noop = () => {};
  for (const f of ['render','toast','whisper','openSheet','closeSheet','showDos','themeStart','themeStop','musicDuck','musicResume','eventSong']) { try { eval(f + ' = noop'); } catch (e) {} }
  soundOn = false;
  const realTimeout = window.setTimeout;
  const mean = id => (BYID[id].min + BYID[id].max) / 2;
  const sale = (id, q) => (typeof saleTotal === 'function' ? saleTotal(id, q) : S.prices[id] * q);
  const results = [];
  const CFG = ${'$'}{CFG};
  if (CFG.zen && typeof ZEN === 'object') Object.assign(ZEN, CFG.zen);
  if (CFG.rest) MODES.forEach(md => { md.rest = CFG.rest; });
  for (let r = 0; r < runs; r++) {
    startGame(MODES[modeIx]); queue = [];
    let saleZ = 0, saleV = 0, guard = 0, peakZen = 100, lowZen = 100, zenSum = 0, zenN = 0, soldOut = 0, buys = 0;
    while (!S.over && guard++ < 5000) {
      const last = S.day >= S.days;
      // resolve encounter / offers in the queue
      const settle = () => {
        let n = 0;
        while (n++ < 50) {
          if (S.zen <= 0) return;
          if (enc) {
            let k = 0;
            while (enc && !enc.done && k++ < 40) {
              if (S.zen <= 0) break;
              if (bot === 'casual') { encRun(); continue; }
              const top = topItem(); const handV = top ? shareOf(S.inv[top.id], HAND_FRAC) * itemValue(top) : 0;
              const don = donation();
              if (S.decoys > 0) encDecoy();
              else if (runOdds() >= 0.5 && S.zen > 30) encRun();
              else if (S.cash >= don && don < handV) encDonate();
              else if (top) encHand();
              else encRun();
            }
            enc = null; continue;
          }
          offerYes = null;
          const f = queue.shift(); if (!f) return;
          f();
          if (offerYes) { const cash0 = S.cash; offerYes(); if (bot === 'casual' || S.cash < cash0 * 0.7) { /* too pricey: undo */ } offerYes = null; }
        }
      };
      settle();
      if (S.zen <= 0) break;
      zenSum += S.zen; zenN++; lowZen = Math.min(lowZen, S.zen);
      // sell
      for (const it of ITEMS) {
        const have = S.inv[it.id], p = S.prices[it.id]; if (!have || !p) continue;
        const avg = S.paid[it.id] / have;
        let q = 0;
        const floor = last ? 0 : Math.max(mean(it.id) * (bot === 'casual' ? 1.0 : 1.05), avg * 1.1);
        while (q < have && sale(it.id, q + 1) - sale(it.id, q) >= floor) q++;
        if (q) { const v = sale(it.id, q); saleZ += S.zen * v; saleV += v; trade = { id: it.id, mode: 'sell', q }; doTrade(); }
      }
      // van
      if (PLACES[S.loc].van) {
        if (S.debt && S.cash >= S.debt * (bot === 'casual' ? 1.2 : 1.5)) { vanMode = 'pay'; vanAmt = S.debt; vanGo(); }
        if (bot === 'expert') {
          const keep = Math.max(5000, S.cap * 5000);
          if (S.cash > keep * 1.5) { vanMode = 'stash'; vanAmt = Math.floor(S.cash - keep); vanGo(); }
          else if (S.cash < keep && S.van) { vanMode = 'take'; vanAmt = Math.min(S.van, keep - S.cash); vanGo(); }
        }
        if (last && S.debt && S.cash) { vanMode = 'pay'; vanAmt = Math.min(S.cash, S.debt); vanGo(); }
      }
      // buy (not on last day)
      if (!last) {
        const cands = ITEMS.filter(it => S.prices[it.id] && S.prices[it.id] <= mean(it.id) * (bot === 'casual' ? 0.9 : 0.95))
          .sort((a, b) => (mean(b.id) - S.prices[b.id]) - (mean(a.id) - S.prices[a.id]));
        for (const it of cands) {
          const q = canBuy(it.id); if (q > 0) { trade = { id: it.id, mode: 'buy', q }; doTrade(); buys++; }
          else if (typeof stockLeft === 'function' && stockLeft(it.id) === 0) soldOut++;
        }
      }
      // move
      const opts = PLACES.map((_, i) => i).filter(i => canReach(i));
      let dest = null;
      if (opts.length) {
        if (S.debt && S.cash >= S.debt * 1.5 && opts.includes(VAN_IX)) dest = VAN_IX;
        else dest = opts[Math.floor(Math.random() * opts.length)];
      }
      if (dest != null) { walk(dest); }
      else if (last) { endGame('time'); break; }
      else { rest(); await new Promise(res => realTimeout(res, 0)); await new Promise(res => realTimeout(res, 0)); }
    }
    results.push({ saleZen: saleV ? saleZ / saleV : 0, nw: netWorth(), snapped: S.zen <= 0, zenAvg: zenN ? zenSum / zenN : 0, zenMin: lowZen, soldOut, buys, checkins: S.stats.checkins });
  }
  return results;
})(${'$'}{0}, ${'$'}{1}, '${'$'}{2}')`;
const modes = modeArg === 'all' ? [0, 1, 2, 3] : [+modeArg];
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))]; };
const fmt = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const ranks = await g.run('MODES.map(m => m.ranks)');
for (const m of modes) {
  const t0 = Date.now();
  const src = BOT.replace('${CFG}', process.env.CFG || '{}').replace('${0}', m).replace('${1}', runsArg).replace('${2}', botArg);
  const res = await g.page.evaluate(s => window.__U.run(s), src);
  if (process.env.TAG) (await import('node:fs')).writeFileSync(`out-${process.env.TAG || 'x'}-${botArg}-${m}.json`, JSON.stringify(res));
  const nw = res.map(r => r.nw);
  const rk = ranks[m]; const dist = rk.map((min, i) => res.filter(r => !r.snapped && r.nw >= min && (i === rk.length - 1 || r.nw < rk[i + 1])).length);
  const avg = k => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  console.log(`mode ${m} ${botArg} n=${res.length} ${((Date.now() - t0) / 1000).toFixed(0)}s | p10 ${fmt(q(nw, .1))} p25 ${fmt(q(nw, .25))} med ${fmt(q(nw, .5))} p75 ${fmt(q(nw, .75))} p90 ${fmt(q(nw, .9))} max ${fmt(Math.max(...nw))} | snapped ${res.filter(r => r.snapped).length} | zenAvg ${avg('zenAvg')} zenMin ${avg('zenMin')} | saleZen ${avg('saleZen')} checkins ${avg('checkins')} soldOut ${avg('soldOut')} | rank buckets ${dist.join('/')}`);
}
await g.close(); await browser.close(); srv.close();
