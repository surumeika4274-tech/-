#!/usr/bin/env node
/* 章ごとの「最良選択肢パワー」分布を計測する（敵レートを一時的に無視して全員を全章へ通す）
 *   node tools/power.js [runsPerChar]
 */
'use strict';
require('../js/data.js');
require('../js/engine.js');
const BL = globalThis.BL;
const D = BL.DATA;
BL.setStorage({ get() { return null; }, set() {} });
let seed = 99;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);

const N = parseInt(process.argv[2] || '200', 10);
const realRates = D.CHAPTERS.map(c => Object.assign({}, c.enemy.rate));
// 計測モード: レートを極小にして必ず生存させる（スキルは全成功で最大化されるので上振れ寄り）
const GOD = process.env.GOD !== '0';
if (GOD) for (const c of D.CHAPTERS) { c.enemy.rate = { A: 1, B: 1, C: 1, D: 1 }; c.statReq = 0; c.bidReq = 0; }

function bestStat(run) {
  const opts = BL.computeOptions(run, realRates[run.chapter - 1], {});
  let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g = BL.previewGain(run, best.stats[0])[best.stats[0]];
  const g2 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g >= g2 ? best.stats[0] : best.stats[1];
}
function pct(arr, q) { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; }

const byRarity = {};
const totals = {};
for (const c of D.CHARACTERS) {
  const rec = byRarity[c.rarity] = byRarity[c.rarity] || [[], [], [], [], []];
  const tot = totals[c.rarity] = totals[c.rarity] || [[], [], [], [], []];
  for (let i = 0; i < N; i++) {
    const state = BL.newState(); state.meta.roster[c.id] = { dupes: 0 }; BL.startRun(state, c.id);
    let guard = 0;
    while (state.run && guard++ < 500) {
      const run = state.run;
      if (run.phase === 'training') {
        if (run.hp < 30 || (run.hp < 50 && run.weeksLeft > 1)) { BL.rest(state); continue; }
        if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run.chapter)) BL.buy(state, 'capsule');
        if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run.chapter)) BL.buy(state, 'protein');
        BL.train(state, bestStat(run));
      } else if (run.phase === 'event') BL.resolveEvent(state, Math.floor(rnd() * 2));
      else if (run.phase === 'match') {
        if (run.match.showResult) { BL.dismissResult(state); continue; }
        if (run.match.results.length === 0) {
          const opts = BL.computeOptions(run, realRates[run.chapter - 1], {});
          let best = opts[0]; for (const o of opts) if (o.power / realRates[run.chapter - 1][o.key] > best.power / realRates[run.chapter - 1][best.key]) best = o;
          rec[run.chapter - 1].push(best.power);
          tot[run.chapter - 1].push(Math.round(BL.sumStats(run.stats)));
        }
        BL.chooseClimax(state, run.match.current.options[0].key);
      } else if (run.phase === 'evaluation') { if (run.match && run.match.showResult) { BL.dismissResult(state); continue; } BL.advance(state); }
      else if (run.phase === 'gameover') BL.closeRun(state);
      else if (run.phase === 'clear') BL.closeRun(state);
    }
  }
}
console.log('rarity  chapter: p20 / median / p80 of best-option power   (現行レート A)');
for (const r of [8, 7, 6, 5, 4, 3, 2, 1]) {
  const rows = byRarity[r];
  const line = rows.map((arr, i) => `${String(pct(arr, 0.2)).padStart(6)}/${String(pct(arr, 0.5)).padStart(6)}/${String(pct(arr, 0.8)).padStart(6)} (r${realRates[i].A})`);
  console.log('★' + r, line.join(' | '));
}
console.log('\nrarity  chapter: p20 / median of TOTAL stats at match start (statReq)');
for (const r of [8, 7, 6, 5, 4, 3, 2, 1]) {
  const rows = totals[r];
  console.log('★' + r, rows.map((arr, i) => `${String(pct(arr, 0.2)).padStart(6)}/${String(pct(arr, 0.5)).padStart(6)} (req${D.CHAPTERS[i].statReq})`).join(' | '));
}
