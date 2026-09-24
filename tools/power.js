#!/usr/bin/env node
/* 節（試合）ごとの「最良選択肢パワー」分布をレアリティ別に計測する（敵レートを 1 にして全員を最後まで通す）
 *   node tools/power.js [runsPerCard]
 * 出力：各試合の p20/median と現行レート(A)。レート設定の根拠に使う。
 */
'use strict';
require('../js/data.js'); require('../js/cards.js'); require('../js/story.js'); require('../js/engine.js');
const BL = globalThis.BL; const D = BL.DATA;
BL.setStorage({ get() { return null; }, set() {} });
let seed = 99;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);
const N = parseInt(process.argv[2] || '60', 10);

// 計測用：全試合のレートを保存してから 1 に潰し、足切りも無効化
const arcs = BL.STORY.arcs; const realRate = {}; const labels = [];
for (const a of arcs) { for (const s of a.segments) {
  const key = a.id + '/' + s.id; labels.push(key);
  if (s.match.rule === 'nel') { realRate[key] = { A: s.match.base, B: s.match.base, C: s.match.base, D: s.match.base }; s.match.base = 1; }
  else { realRate[key] = Object.assign({}, s.match.rate); s.match.rate = { A: 1, B: 1, C: 1, D: 1 }; }
  if (s.match.nominateInt) s.match.nominateInt = 0;
} a.cut = {}; }

function bestStat(run) {
  const key = BL.arcOf(run).id + '/' + BL.segOf(run).id;
  const mdef = Object.assign({}, BL.currentMatchDef(run), { rate: realRate[key] });
  const opts = BL.computeOptions(run, mdef, {});
  let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g0 = BL.previewGain(run, best.stats[0])[best.stats[0]]; const g1 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g0 >= g1 ? best.stats[0] : best.stats[1];
}
function pct(arr, q) { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0; }

const rec = {}; // rar -> key -> []
const seen = new Set();
const cards = BL.CARDS.filter(c => { const k = c.rar + ':' + c.char; if (seen.has(k)) return false; seen.add(k); return true; });
for (const c of cards) {
  const R = rec[c.rar] = rec[c.rar] || {};
  for (let i = 0; i < N; i++) {
    const state = BL.newState(); state.meta.roster[c.id] = { dupes: 0 }; BL.startRun(state, c.id, 'ego');
    let guard = 0;
    while (state.run && guard++ < 3000) {
      const run = state.run;
      switch (run.phase) {
        case 'arcIntro': BL.continueStory(state); break;
        case 'clubSelect': BL.chooseClub(state, 'de'); break;
        case 'training':
          if (run.hp < 30 || (run.hp < 50 && run.weeksLeft > 1)) { BL.rest(state); break; }
          if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run)) BL.buy(state, 'capsule');
          if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run)) BL.buy(state, 'protein');
          BL.train(state, bestStat(run)); break;
        case 'event': BL.resolveEvent(state, Math.floor(rnd() * 2)); break;
        case 'match': {
          if (run.match.showResult) { BL.dismissResult(state); break; }
          if (run.match.results.length === 0) {
            const key = BL.arcOf(run).id + '/' + BL.segOf(run).id;
            const mdef = Object.assign({}, BL.currentMatchDef(run), { rate: realRate[key] });
            const opts = BL.computeOptions(run, mdef, {});
            let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
            (R[key] = R[key] || []).push(best.power);
          }
          BL.chooseClimax(state, run.match.current.options[0].key); break; }
        case 'matchResult': if (run.match && run.match.showResult) { BL.dismissResult(state); break; } BL.nextAfterMatch(state); break;
        case 'evaluation': BL.advance(state); break;
        case 'gameover': BL.closeRun(state); break;
        case 'clear': BL.closeRun(state); break;
      }
    }
  }
}
const dump = {}; for (const key of labels) { dump[key] = {}; for (const r of D.RARITY_ORDER) dump[key][r] = pct(((rec[r] || {})[key] || []), 0.5); }
require('fs').writeFileSync(require('path').join(__dirname, '..', 'data', 'power_medians.json'), JSON.stringify(dump, null, 1));
console.log('match'.padEnd(22), ...D.RARITY_ORDER.map(r => ('★' + r).padStart(14)), '   rate(A)');
for (const key of labels) {
  const cols = D.RARITY_ORDER.map(r => { const arr = (rec[r] || {})[key] || []; return (pct(arr, 0.2) + '/' + pct(arr, 0.5)).padStart(14); });
  console.log(key.padEnd(22), ...cols, String(realRate[key].A).padStart(10));
}
