#!/usr/bin/env node
/* バランス検証シミュレータ
 *   node tools/sim.js [runsPerChar]
 * 貪欲方針の自動プレイヤーで各キャラの章別生存率・完全制覇率を推定する。
 */
'use strict';
require('../js/data.js');
require('../js/engine.js');
const BL = globalThis.BL;
const D = BL.DATA;

BL.setStorage({ get() { return null; }, set() {} });

/* 決定論的 RNG (xorshift) */
let seed = 20260924;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);

function bestPairStat(run) {
  const ch = BL.chapterByN(run.chapter);
  const opts = BL.computeOptions(run, ch.enemy.rate, { note: false, flow: false });
  let best = opts[0];
  for (const o of opts) if (o.ratio > best.ratio) best = o;
  // train the stat of the best pair with larger marginal gain
  const g = BL.previewGain(run, best.stats[0])[best.stats[0]];
  const g2 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g >= g2 ? best.stats[0] : best.stats[1];
}

function policyTrain(state) {
  const run = state.run;
  const ch = BL.chapterByN(run.chapter);
  // rest policy: keep HP >= 50 for full efficiency; never train below 30
  if (run.hp < 30) return BL.rest(state);
  if (run.hp < 50 && run.weeksLeft > 1) return BL.rest(state);
  // buy capsule if affordable and HP low
  if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], ch.n)) BL.buy(state, 'capsule');
  if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], ch.n) && run.hp >= 50) BL.buy(state, 'protein');
  if (run.weeksLeft === 1 && !run.note && run.cash >= BL.itemPrice(D.ITEMS[2], ch.n)) BL.buy(state, 'note');
  return BL.train(state, bestPairStat(run));
}

function playRun(charId, dupes) {
  const state = BL.newState();
  state.meta.roster[charId] = { dupes: dupes || 0 };
  BL.startRun(state, charId);
  const reached = { chapter: 0, cleared: false, reason: '' };
  let guard = 0;
  while (state.run && guard++ < 1000) {
    const run = state.run;
    if (run.phase === 'training') policyTrain(state);
    else if (run.phase === 'event') BL.resolveEvent(state, Math.floor(rnd() * 2));
    else if (run.phase === 'match') {
      if (run.match.showResult) { BL.dismissResult(state); continue; }
      const opts = run.match.current.options;
      let best = opts[0]; for (const o of opts) if (o.p > best.p) best = o;
      BL.chooseClimax(state, best.key);
    } else if (run.phase === 'evaluation') {
      if (run.match && run.match.showResult) { BL.dismissResult(state); continue; }
      const ev = run.evalResult;
      if (ev.survived) reached.chapter = ev.chapter;
      BL.advance(state);
    } else if (run.phase === 'gameover') { reached.reason = run.gameover.reason; reached.totalEnd = run.gameover.total; BL.closeRun(state); }
    else if (run.phase === 'clear') { reached.cleared = true; BL.closeRun(state); }
  }
  return reached;
}

const N = parseInt(process.argv[2] || '400', 10);
const only = process.argv[3];
console.log('runs/char =', N);
console.log('char'.padEnd(22), '★', 'ch1'.padStart(6), 'ch2'.padStart(6), 'ch3'.padStart(6), 'ch4'.padStart(6), 'ch5'.padStart(6), ' injury% cold% cutoff%');
for (const c of D.CHARACTERS) {
  if (only && c.id !== only) continue;
  const surv = [0, 0, 0, 0, 0];
  const reasons = { injury: 0, cold: 0, cutoff: 0 };
  for (let i = 0; i < N; i++) {
    const r = playRun(c.id, 0);
    for (let k = 0; k < 5; k++) if (r.chapter >= k + 1) surv[k]++;
    if (r.reason) reasons[r.reason]++;
  }
  const pct = surv.map(v => (100 * v / N).toFixed(1).padStart(6));
  console.log(c.name.padEnd(22 - (c.name.length)), c.rarity, ...pct, ' ', (100 * reasons.injury / N).toFixed(0).padStart(5), (100 * reasons.cold / N).toFixed(0).padStart(5), (100 * reasons.cutoff / N).toFixed(0).padStart(5));
}
