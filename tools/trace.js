#!/usr/bin/env node
/* 1カードの RUN をトレース: node tools/trace.js <cardId|charId> [seed] [advisor] [club] */
'use strict';
require('../js/data.js'); require('../js/cards.js'); require('../js/story.js'); require('../js/engine.js');
const BL = globalThis.BL; const D = BL.DATA;
BL.setStorage({ get() { return null; }, set() {} });
let seed = parseInt(process.argv[3] || '7', 10);
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return (seed >>> 0) / 4294967296; }
BL.setRng(rnd);
const arg = process.argv[2] || 'isagi';
const card = BL.cardById(arg) || BL.CARDS.filter(c => c.char === arg).sort((a, b) => D.RARITY[b.rar].base - D.RARITY[a.rar].base)[0];
const state = BL.newState(); state.meta.roster[card.id] = { dupes: parseInt(process.env.DUPES || '0', 10) };
BL.startRun(state, card.id, process.argv[4] || 'ego');
console.log('==', BL.cardName(card), '★' + card.rar, card.type, 'growth', JSON.stringify(state.run.growth));
function fmt(run) { const s = run.stats; return `SHT ${s.SHT.toFixed(0)} SPD ${s.SPD.toFixed(0)} TEC ${s.TEC.toFixed(0)} INT ${s.INT.toFixed(0)} PHY ${s.PHY.toFixed(0)} | total ${BL.sumStats(s).toFixed(0)} | HP ${run.hp} ${run.cond} | skills ${BL.aggregateSkills(run).count}`; }
function bestStat(run) {
  const opts = BL.previewOptions(run); let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g0 = BL.previewGain(run, best.stats[0])[best.stats[0]]; const g1 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g0 >= g1 ? best.stats[0] : best.stats[1];
}
let guard = 0;
while (state.run && guard++ < 3000) {
  const run = state.run;
  switch (run.phase) {
    case 'arcIntro': console.log('\n#### 第' + BL.arcOf(run).n + '章 ' + BL.arcOf(run).title); BL.continueStory(state); break;
    case 'policySelect': BL.choosePolicy(state, process.env.POLICY || 'balance'); break;
    case 'clubSelect': BL.chooseClub(state, process.argv[5] || 'de'); break;
    case 'training':
      if (run.hp < 30 || (run.hp < 50 && run.weeksLeft > 1)) { BL.rest(state); break; }
      if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run)) BL.buy(state, 'capsule');
      if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run)) BL.buy(state, 'protein');
      BL.train(state, bestStat(run)); break;
    case 'event': BL.resolveEvent(state, 0); break;
    case 'match': {
      if (run.match.showResult) { BL.dismissResult(state); break; }
      if (run.match.results.length === 0) {
        console.log(`\n== ${run.match.name}: ${fmt(run)}`);
        for (const o of run.match.current.options) console.log(`   ${o.key} ${o.power}/${o.rate} r=${o.ratio.toFixed(2)} -> ${o.pct}%${o.wall ? ' WALL' : ''}${run.match.current.flow ? ' FLOW' : ''}`);
      }
      const opts = run.match.current.options; let best = opts[0]; for (const o of opts) if (o.p > best.p) best = o;
      const r = BL.chooseClimax(state, best.key);
      console.log(`   C${r.idx + 1} ${r.key} ${r.p}% -> ${r.success ? 'OK' : 'NG'}${r.skill ? ' 覚醒:' + r.skill.name : ''}${r.sig ? ' 固有:' + r.sig.name : ''}${r.flow ? ' [FLOW]' : ''}`);
      break; }
    case 'matchResult': {
      if (run.match && run.match.showResult) { BL.dismissResult(state); break; }
      const mr = run.matchResult;
      console.log(`   結果 ${mr.me}-${mr.en} ${mr.won ? 'WIN' : 'LOSE'} outcome=${mr.outcome} bid=${BL.fmtYen(mr.bidTotal)} cash=${mr.cashTotal} rank=${mr.rank}${mr.detail ? ' | ' + mr.detail : ''}`);
      BL.nextAfterMatch(state); break; }
    case 'evaluation': { const ev = run.evalResult; console.log(`   査定: ${ev.survived ? '生存' : '除籍'} ${ev.checks.map(c => (c.ok ? '✓' : '✗') + c.label + '=' + c.value).join(', ')}`); BL.advance(state); break; }
    case 'gameover': console.log('GAME OVER', run.gameover.reason, run.gameover.detail); BL.closeRun(state); break;
    case 'clear': console.log('CLEAR!', fmt(run)); BL.closeRun(state); break;
  }
}
