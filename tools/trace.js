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
const state = BL.newState(); state.meta.roster[card.id] = { dupes: parseInt(process.env.DUPES || '0', 10), tier: parseInt(process.env.TIER || '0', 10) };
if (process.env.DIFF) state.meta.difficulty = process.env.DIFF;
const ADV = process.argv[4] || 'ego';
let r0 = BL.startRun(state, { cardId: card.id, advisorId: ADV, partnerId: process.env.PARTNER || null }); if (!r0.ok) throw new Error('start ' + r0.reason);
console.log('==', BL.cardName(card), '★' + card.rar, card.type, 'growth', JSON.stringify(state.run.growth));
function fmt(run) { const s = run.stats; return `SHT ${s.SHT.toFixed(0)} SPD ${s.SPD.toFixed(0)} TEC ${s.TEC.toFixed(0)} INT ${s.INT.toFixed(0)} PHY ${s.PHY.toFixed(0)} | total ${BL.sumStats(s).toFixed(0)} | HP ${run.hp} ${run.cond} | skills ${BL.aggregateSkills(BL.isFinal(run) ? BL.playerView(run, run.captain || 0) : run).count}`; }
function bestStat(run) {
  const opts = BL.previewOptions(run); let best = opts[0]; for (const o of opts) if (o.ratio > best.ratio) best = o;
  const g0 = BL.previewGain(run, best.stats[0])[best.stats[0]]; const g1 = BL.previewGain(run, best.stats[1])[best.stats[1]];
  return g0 >= g1 ? best.stats[0] : best.stats[1];
}
let guard = 0;
while (state.run && guard++ < 4000) {
  const run = state.run;
  switch (run.phase) {
    case 'arcIntro': console.log('\n#### ' + BL.arcOf(run).part + ' ' + BL.arcOf(run).title + (BL.isFinal(run) ? '（決戦・5人）' : '')); BL.continueStory(state); break;
    case 'policySelect': BL.choosePolicy(state, process.env.POLICY || 'balance'); break;
    case 'storyChoice': { const cc = BL.currentChoice(run); const n = cc.choice.options.length; const idx = process.env.CHOICE === 'rand' ? Math.floor(rnd() * n) : Math.min(n - 1, parseInt(process.env.CHOICE || '0', 10)); const r = BL.chooseStory(state, idx); console.log(`   [分岐] ${cc.choice.title} → ${r.label}${r.rollWin === undefined ? '' : (r.rollWin ? ' (WIN)' : ' (LOSE)')} : ${r.effects.join(' / ')}`); break; }
    case 'clubSelect': BL.chooseClub(state, process.argv[5] || 'de'); break;
    case 'training':
      if (run.hp < 30 || (run.hp < 50 && run.weeksLeft > 1)) { BL.rest(state); break; }
      if (run.hp < 50 && run.cash >= BL.itemPrice(D.ITEMS[0], run)) BL.buy(state, 'capsule');
      if (!run.protein && run.cash >= BL.itemPrice(D.ITEMS[1], run)) BL.buy(state, 'protein');
      BL.train(state, bestStat(run)); break;
    case 'event': { const ev = BL.eventById(run.event.id); const res = BL.resolveEvent(state, 0); console.log(`   [event${ev.pair ? '/pair' : ''}] ${ev.title} → ${res.effects.join(' / ')}`); break; }
    case 'match': {
      if (run.match.showResult) { BL.dismissResult(state); break; }
      const cur = run.match.current;
      if (run.match.results.length === 0) {
        console.log(`\n== ${run.match.name}: ${fmt(run)}`);
        if (!cur.players) for (const o of cur.options) console.log(`   ${o.key} ${o.power}/${o.rate} r=${o.ratio.toFixed(2)} -> ${o.pct}%${o.wall ? ' WALL' : ''}${cur.flow ? ' FLOW' : ''}`);
      }
      if (cur.players) {
        let best = null; for (const pe of cur.players) { if (!pe.avail) continue; for (const o of pe.options) if (!best || o.p > best.o.p || (o.p === best.o.p && pe.uses < best.pe.uses)) best = { pe, o }; }
        const r = BL.chooseClimax(state, best.o.key, best.pe.i);
        console.log(`   C${r.idx + 1} ${r.playerName} ${r.key} ${r.p}% -> ${r.success ? 'OK' : 'NG'}${r.skill ? ' 覚醒:' + r.skill.name : ''}${r.flow ? ' [FLOW]' : ''}`);
      } else {
        let best = cur.options[0]; for (const o of cur.options) if (o.p > best.p) best = o;
        const r = BL.chooseClimax(state, best.key);
        console.log(`   C${r.idx + 1} ${r.key} ${r.p}% -> ${r.success ? 'OK' : 'NG'}${r.skill ? ' 覚醒:' + r.skill.name : ''}${r.sig ? ' 固有:' + r.sig.name : ''}${r.flow ? ' [FLOW]' : ''}`);
      }
      break; }
    case 'matchResult': {
      if (run.match && run.match.showResult) { BL.dismissResult(state); break; }
      const mr = run.matchResult;
      console.log(`   結果 ${mr.me}-${mr.en} ${mr.won ? 'WIN' : 'LOSE'} outcome=${mr.outcome} bid=${BL.fmtYen(mr.bidTotal)} cash=${mr.cashTotal} rank=${mr.rank}${mr.detail ? ' | ' + mr.detail : ''}`);
      BL.nextAfterMatch(state); break; }
    case 'evaluation': { const ev = run.evalResult; console.log(`   査定: ${ev.survived ? '生存' : '除籍'} [${ev.partRank}] ${ev.checks.map(c => (c.ok ? '✓' : '✗') + c.label + '=' + c.value).join(', ')}`); BL.advance(state); break; }
    case 'graduated': {
      const g = state.meta.grads[state.meta.grads.length - 1]; console.log(`GRADUATED part ${g.part}: ${fmt(run)} pieces=${state.meta.pieces} mastery=${JSON.stringify(state.meta.mastery)}`); BL.closeRun(state);
      if (g.part >= BL.STORY.arcs.length - 1) { for (let k = 0; k < 4; k++) { const c = JSON.parse(JSON.stringify(g)); c.id = 'clone' + k; state.meta.grads.push(c); } const rf = BL.startFinal(state, state.meta.grads.map(x => x.id), ADV); if (!rf.ok) throw new Error('final ' + rf.reason); }
      else { const rn = BL.startRun(state, { gradId: g.id, advisorId: ADV, partnerId: process.env.PARTNER || null }); if (!rn.ok) throw new Error('next ' + rn.reason); }
      break; }
    case 'gameover': console.log('GAME OVER', run.gameover.reason, run.gameover.detail); BL.closeRun(state); break;
    case 'clear': console.log('CLEAR!', fmt(run)); BL.closeRun(state); break;
  }
}
