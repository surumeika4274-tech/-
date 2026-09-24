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
/* 人間の判断に合わせ、カードの主タイプに沿った育成方針を選ぶ（POLICY 環境変数で固定可） */
const POLICY_BY_TYPE = { 'キック': 'shoot', 'フィジカル': 'shoot', 'スピード': 'speed', 'テクニック': 'tactic', '賢さ': 'tactic', 'スタミナ': 'balance', 'コンディション': 'balance' };
function policyFor(run) { if (process.env.POLICY) return process.env.POLICY; const c = BL.cardById(run.cardId); return POLICY_BY_TYPE[c && c.type] || 'balance'; }
function bestOption(opts) { let b = opts[0]; for (const o of opts) if (o.p > b.p) b = o; return b; }

function bestFinalPick(cur) {
  let best = null;
  for (const pe of cur.players) { if (!pe.avail) continue; for (const o of pe.options) if (!best || o.p > best.o.p || (o.p === best.o.p && pe.uses < best.pe.uses)) best = { pe, o }; }
  return best;
}
/** 1 RUN（編）を最後まで進める。戻り値 'graduated' | 'gameover' | 'clear' */
function playPart(state) {
  let guard = 0;
  while (state.run && guard++ < 3000) {
    const run = state.run;
    switch (run.phase) {
      case 'arcIntro': BL.continueStory(state); break;
      case 'policySelect': BL.choosePolicy(state, policyFor(run)); break;
      case 'storyChoice': { var n = BL.currentChoice(run).choice.options.length; BL.chooseStory(state, process.env.CHOICE === 'rand' ? Math.floor(rnd() * n) : Math.min(n - 1, parseInt(process.env.CHOICE || '0', 10))); break; }
      case 'clubSelect': BL.chooseClub(state, 'de'); break;
      case 'training': policyTrain(state); break;
      case 'event': BL.resolveEvent(state, Math.floor(rnd() * 2)); break;
      case 'match':
        if (run.match.showResult) { BL.dismissResult(state); break; }
        if (run.match.current.players) { const b = bestFinalPick(run.match.current); BL.chooseClimax(state, b.o.key, b.pe.i); }
        else BL.chooseClimax(state, bestOption(run.match.current.options).key);
        break;
      case 'matchResult':
        if (run.match && run.match.showResult) { BL.dismissResult(state); break; }
        BL.nextAfterMatch(state); break;
      case 'evaluation': BL.advance(state); break;
      case 'graduated': return 'graduated';
      case 'gameover': return 'gameover';
      case 'clear': return 'clear';
      default: throw new Error('unknown phase ' + run.phase);
    }
  }
  throw new Error('loop guard');
}
/** カード 1 枚を第一編から決戦まで通す（卒業生で次の編へ。決戦は同一卒業生 5 体の複製で出撃） */
function playRun(cardId, dupes, advisor) {
  const state = BL.newState(); state.meta.roster[cardId] = { dupes: dupes || 0, tier: 0 };
  const adv = advisor || 'ego';
  let r = BL.startRun(state, { cardId, advisorId: adv }); if (!r.ok) throw new Error('start ' + r.reason);
  const out = { arcReached: 0, cleared: false, reason: '' };
  for (let i = 0; i < 8; i++) {
    const res = playPart(state);
    if (res === 'gameover') { out.reason = state.run.gameover.reason; BL.closeRun(state); return out; }
    if (res === 'clear') { out.cleared = true; out.arcReached = ARCS_N; BL.closeRun(state); return out; }
    const g = state.meta.grads[state.meta.grads.length - 1]; out.arcReached = g.part; BL.closeRun(state);
    if (g.part >= ARCS_N - 1) {
      for (let k = 0; k < 4; k++) { const c = JSON.parse(JSON.stringify(g)); c.id = 'clone' + k; state.meta.grads.push(c); }
      r = BL.startFinal(state, state.meta.grads.map(x => x.id), adv); if (!r.ok) throw new Error('final ' + r.reason);
    } else { r = BL.startRun(state, { gradId: g.id, advisorId: adv }); if (!r.ok) throw new Error('next ' + r.reason); }
  }
  throw new Error('too many parts');
}
const ARCS_N = BL.STORY.arcs.length;
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
  console.log('card'.padEnd(34), 'rar', ' typ', '  第一'.padStart(6), '第二'.padStart(6), '第三'.padStart(6), '第四'.padStart(6), '第五'.padStart(6), '  clear%');
  const agg = {};
  for (const c of cards) {
    const surv = [0, 0, 0, 0, 0]; let clears = 0;
    for (let i = 0; i < N; i++) { const r = playRun(c.id, dupes); for (let k = 0; k < 5; k++) if (r.arcReached >= k + 1) surv[k]++; if (r.cleared) clears++; }
    const name = (BL.cardName(c)).slice(0, 18);
    const pad = 34 - [...name].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);
    console.log(name + ' '.repeat(Math.max(1, pad)), c.rar.padEnd(3), c.type.slice(0, 2), ...surv.map(v => (100 * v / N).toFixed(1).padStart(6)), (100 * clears / N).toFixed(2).padStart(8));
    const a = agg[c.rar] = agg[c.rar] || { n: 0, s: [0, 0, 0, 0, 0], c: 0 };
    a.n += N; for (let k = 0; k < 5; k++) a.s[k] += surv[k]; a.c += clears;
  }
  console.log('\n--- by rarity ---');
  for (const r of D.RARITY_ORDER) { const a = agg[r]; if (!a) continue; console.log(('★' + r).padEnd(8), ...a.s.map(v => (100 * v / a.n).toFixed(1).padStart(6)), (100 * a.c / a.n).toFixed(2).padStart(8)); }
}
