#!/usr/bin/env node
/* バランス検証シミュレータ v2
 *   node tools/sim.js [runsPerCard] [rarityFilter e.g. 5,4F,4,3,2,1] [cardIdOrChar]
 * 貪欲方針の自動プレイヤーで、章別（0〜5）の生存率と完全制覇率をカード別に推定する。
 */
'use strict';
require('../js/data.js'); require('../js/cards.js'); require('../js/story.js'); require('../js/engine.js');
const BL = globalThis.BL; const D = BL.DATA;
BL.setStorage({ get() { return null; }, set() {} });
let seed = 20260924;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);

function bestTrainStat(run) {
  const opts = BL.previewOptions(run);
  if (!opts.length) return 'SHT';
  let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g0 = BL.previewGain(run, best.stats[0])[best.stats[0]];
  const g1 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g0 >= g1 ? best.stats[0] : best.stats[1];
}
function policyTrain(state) {
  const run = state.run;
  if (run.hp < 30) return BL.rest(state);
  if (run.hp < 50 && run.weeksLeft > 1) return BL.rest(state);
  if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run)) BL.buy(state, 'capsule');
  if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run) && run.hp >= 50) BL.buy(state, 'protein');
  if (run.weeksLeft === 1 && !run.note && run.cash >= BL.itemPrice(D.ITEMS[2], run)) BL.buy(state, 'note');
  return BL.train(state, bestTrainStat(run));
}
function bestOption(opts) { let b = opts[0]; for (const o of opts) if (o.p > b.p) b = o; return b; }

function playRun(cardId, dupes, advisor) {
  const state = BL.newState(); state.meta.roster[cardId] = { dupes: dupes || 0 };
  BL.startRun(state, cardId, advisor || 'ego');
  const out = { arcReached: 0, cleared: false, reason: '' };
  let guard = 0;
  while (state.run && guard++ < 3000) {
    const run = state.run;
    switch (run.phase) {
      case 'arcIntro': BL.continueStory(state); break;
      case 'clubSelect': BL.chooseClub(state, 'de'); break;
      case 'training': policyTrain(state); break;
      case 'event': BL.resolveEvent(state, Math.floor(rnd() * 2)); break;
      case 'match':
        if (run.match.showResult) { BL.dismissResult(state); break; }
        BL.chooseClimax(state, bestOption(run.match.current.options).key); break;
      case 'matchResult':
        if (run.match && run.match.showResult) { BL.dismissResult(state); break; }
        BL.nextAfterMatch(state); break;
      case 'evaluation':
        if (run.evalResult.survived) out.arcReached = run.arc + 1;
        BL.advance(state); break;
      case 'gameover': out.reason = run.gameover.reason; BL.closeRun(state); break;
      case 'clear': out.cleared = true; BL.closeRun(state); break;
      default: throw new Error('unknown phase ' + run.phase);
    }
  }
  if (guard >= 3000) throw new Error('loop guard');
  return out;
}
module.exports = { playRun };

if (require.main === module) {
  const N = parseInt(process.argv[2] || '200', 10);
  const rarFilter = (process.argv[3] || '8,7,6,5,4,3,2,1').split(',');
  const only = process.argv[4] || null;
  const dupes = parseInt(process.env.DUPES || '0', 10);
  let cards = BL.CARDS.filter(c => rarFilter.includes(c.rar) && (!only || c.id === only || c.char === only));
  // 1レアリティにつき同キャラの重複カードは1枚に絞る（計測量削減）。CARDS=all で全カード
  if (process.env.CARDS !== 'all') { const seen = new Set(); cards = cards.filter(c => { const k = c.rar + ':' + c.char; if (seen.has(k)) return false; seen.add(k); return true; }); }
  console.log('runs/card =', N, 'cards =', cards.length, 'dupes =', dupes);
  console.log('card'.padEnd(34), 'rar', ' typ', '  a0'.padStart(6), 'a1'.padStart(6), 'a2'.padStart(6), 'a3'.padStart(6), 'a4'.padStart(6), 'a5'.padStart(6), '  clear%');
  const agg = {};
  for (const c of cards) {
    const surv = [0, 0, 0, 0, 0, 0]; let clears = 0;
    for (let i = 0; i < N; i++) { const r = playRun(c.id, dupes); for (let k = 0; k < 6; k++) if (r.arcReached >= k + 1) surv[k]++; if (r.cleared) clears++; }
    const name = (BL.cardName(c)).slice(0, 18);
    const pad = 34 - [...name].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);
    console.log(name + ' '.repeat(Math.max(1, pad)), c.rar.padEnd(3), c.type.slice(0, 2), ...surv.map(v => (100 * v / N).toFixed(1).padStart(6)), (100 * clears / N).toFixed(2).padStart(8));
    const a = agg[c.rar] = agg[c.rar] || { n: 0, s: [0, 0, 0, 0, 0, 0], c: 0 };
    a.n += N; for (let k = 0; k < 6; k++) a.s[k] += surv[k]; a.c += clears;
  }
  console.log('\n--- by rarity ---');
  for (const r of D.RARITY_ORDER) { const a = agg[r]; if (!a) continue; console.log(('★' + r).padEnd(8), ...a.s.map(v => (100 * v / a.n).toFixed(1).padStart(6)), (100 * a.c / a.n).toFixed(2).padStart(8)); }
}
