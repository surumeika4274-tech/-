#!/usr/bin/env node
/* 1キャラのステータス推移をトレース: node tools/trace.js <charId> [seed] */
'use strict';
require('../js/data.js');
require('../js/engine.js');
const BL = globalThis.BL;
const D = BL.DATA;
BL.setStorage({ get() { return null; }, set() {} });
let seed = parseInt(process.argv[3] || '7', 10);
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);

const charId = process.argv[2] || 'isagi_early';
const state = BL.newState();
state.meta.roster[charId] = { dupes: 0 };
BL.startRun(state, charId);

function fmt(run) {
  const s = run.stats;
  return `SHT ${s.SHT.toFixed(0)} SPD ${s.SPD.toFixed(0)} TEC ${s.TEC.toFixed(0)} INT ${s.INT.toFixed(0)} PHY ${s.PHY.toFixed(0)} | total ${BL.sumStats(s).toFixed(0)} | HP ${run.hp} | skills ${BL.skillCount(run.skills)}`;
}
function bestStat(run) {
  const ch = BL.chapterByN(run.chapter);
  const opts = BL.computeOptions(run, ch.enemy.rate, {});
  let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g = BL.previewGain(run, best.stats[0])[best.stats[0]];
  const g2 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g >= g2 ? best.stats[0] : best.stats[1];
}
let guard = 0;
while (state.run && guard++ < 500) {
  const run = state.run;
  if (run.phase === 'training') {
    if (run.hp < 50 && run.weeksLeft > 1 || run.hp < 30) { BL.rest(state); continue; }
    if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run.chapter)) BL.buy(state, 'capsule');
    if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run.chapter)) BL.buy(state, 'protein');
    const st = bestStat(run);
    BL.train(state, st);
  } else if (run.phase === 'event') BL.resolveEvent(state, 0);
  else if (run.phase === 'match') {
    if (run.match.showResult) { BL.dismissResult(state); continue; }
    if (run.match.idx === 0 && run.match.results.length === 0) {
      console.log(`\n== 第${run.chapter}章 試合前: ${fmt(run)}`);
      for (const o of run.match.current.options) console.log(`   ${o.key} power ${o.power} / rate ${o.rate} = ${o.ratio.toFixed(2)} -> ${o.pct}%${o.wall ? ' WALL' : ''}${run.match.current.flow ? ' FLOW' : ''}`);
    }
    const opts = run.match.current.options;
    let best = opts[0]; for (const o of opts) if (o.p > best.p) best = o;
    const r = BL.chooseClimax(state, best.key);
    console.log(`   Climax${r.idx + 1} ${r.key} ${r.p}% -> ${r.success ? 'OK' : 'NG'}${r.skill ? ' 覚醒:' + r.skill.name : ''}${r.flow ? ' [FLOW]' : ''}`);
  } else if (run.phase === 'evaluation') {
    if (run.match && run.match.showResult) { BL.dismissResult(state); continue; }
    const ev = run.evalResult;
    console.log(`   査定: ${ev.survived ? '生存' : '除籍'} bid=${BL.fmtYen(ev.bidTotal)} cash=${ev.cashTotal} checks=${ev.checks.map(c => (c.ok ? '✓' : '✗') + c.label).join(', ')}`);
    BL.advance(state);
  } else if (run.phase === 'gameover') { console.log('GAME OVER', run.gameover.reason); BL.closeRun(state); }
  else if (run.phase === 'clear') { console.log('CLEAR!', fmt(run)); BL.closeRun(state); }
}
