/* ブラウザE2E: python3 -m http.server 8765 を起動した状態で node tools/e2e.js（要 playwright + chromium。executablePath は環境に合わせて変更） */
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const OUT = require('path').join(__dirname, '..', 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const base = 'http://127.0.0.1:8765/';
let nOk = 0;
function assert(c, msg) { if (!c) throw new Error('ASSERT: ' + msg); nOk++; console.log('ok -', msg); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|404/.test(m.text())) errors.push('console: ' + m.text()); });
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(BL_UI.state())));
  const U = () => page.evaluate(() => ({ modal: BL_UI.ui.modal && BL_UI.ui.modal.type }));
  const wait = (ms) => page.waitForTimeout(ms);
  const force = () => page.evaluate(() => { const s = BL_UI.state(); const cur = s.run.match.current; if (cur.players) cur.players.forEach(pe => pe.options.forEach(o => { o.p = 100; o.pct = 100; })); else cur.options.forEach(o => { o.p = 100; o.pct = 100; }); BL.save(s); BL_UI.render(); });
  const zero = () => page.evaluate(() => { const s = BL_UI.state(); const cur = s.run.match.current; if (!cur) return; if (cur.players) cur.players.forEach(pe => pe.options.forEach(o => { o.p = 0; o.pct = 0; })); else cur.options.forEach(o => { o.p = 0; o.pct = 0; }); BL.save(s); BL_UI.render(); });
  async function clickClimax(st) {
    const cur = st.run.match.current;
    if (cur.players) { const pe = cur.players.find(x => x.avail); await page.click('[data-action="climax"][data-player="' + pe.i + '"][data-arg="' + pe.options[0].key + '"]'); }
    else await page.click('[data-action="climax"][data-arg="' + cur.options[0].key + '"]');
  }

  await page.goto(base);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForSelector('.title-screen');
  await page.screenshot({ path: OUT + '/01_title.png' });
  await page.click('.title-screen'); await page.waitForSelector('.lobby');
  await page.screenshot({ path: OUT + '/02_lobby.png', fullPage: true });
  let st = await S();
  assert(Object.keys(st.meta.roster).length === 1 && st.v === 5, 'starter card only, save v5');
  const starterId = Object.keys(st.meta.roster)[0];

  /* gacha */
  await page.click('[data-action="lobby-tab"][data-arg="gacha"]');
  await page.click('[data-action="gacha"][data-arg="10"]'); await page.waitForSelector('.pulls'); await wait(1200);
  await page.screenshot({ path: OUT + '/04_gacha_result.png', fullPage: true });
  await page.click('[data-action="close-modal"]');
  st = await S(); assert(st.meta.gems === 0, 'gems spent');
  assert(Object.keys(st.meta.roster).length >= 2, 'cards obtained');

  /* upgrades + star-up (inject currency) */
  await page.click('[data-action="lobby-tab"][data-arg="upgrade"]');
  assert((await page.$$('.upg')).length === 10, '10 persistent upgrades listed');
  await page.evaluate(() => { const s = BL_UI.state(); s.meta.gems = 1000; s.meta.pieces = 100; BL.save(s); BL_UI.render(); });
  await page.click('[data-action="buy-upgrade"][data-arg="train_eff"]'); await wait(100);
  st = await S(); assert(st.meta.upgrades.train_eff === 1 && st.meta.gems === 1000 - 200 + 100, 'upgrade bought (+100 achievement)');
  await page.click('[data-action="star-up"][data-arg="' + starterId + '"]'); await wait(100);
  st = await S(); assert(st.meta.roster[starterId].tier === 1 && st.meta.pieces === 40, 'star-up ★1→★2 (60 pieces)');
  await page.screenshot({ path: OUT + '/05_upgrade.png', fullPage: true });

  /* dex + achievements + records tabs */
  await page.click('[data-action="lobby-tab"][data-arg="dex"]'); await page.screenshot({ path: OUT + '/06_dex.png' });
  await page.click('[data-action="lobby-tab"][data-arg="ach"]');
  await page.click('[data-action="lobby-tab"][data-arg="records"]'); await page.click('[data-action="open-rules"]'); assert(await page.$('.rules'), 'rules modal'); await page.click('[data-action="close-modal"]');
  await page.click('[data-action="lobby-tab"][data-arg="grads"]'); assert(await page.$('.squad-bar'), 'grads tab (empty) with squad bar'); await page.screenshot({ path: OUT + '/07_grads_empty.png', fullPage: true });

  /* start part 1: pick starter → advisor → partner */
  await page.click('[data-action="lobby-tab"][data-arg="roster"]');
  await page.click('[data-action="pick-card"][data-arg="' + starterId + '"]');
  assert(await page.$('.btn.choice.adv'), 'advisor picker shown');
  assert(await page.$('.btn.choice.adv.locked'), 'locked advisors shown');
  await page.click('[data-action="choose-advisor"][data-arg="anri"]'); await wait(150);
  assert(await page.$('[data-action="choose-partner"][data-arg="none"]'), 'partner picker shown');
  const partners = await page.$$('.btn.choice.partner'); assert(partners.length >= 1, 'owned partners listed');
  await page.screenshot({ path: OUT + '/08_partner.png', fullPage: true });
  const partnerId = await page.evaluate(() => document.querySelector('.btn.choice.partner').getAttribute('data-arg'));
  await page.click('[data-action="choose-partner"][data-arg="' + partnerId + '"]'); await wait(1500);
  st = await S(); assert(st.run && st.run.phase === 'arcIntro' && st.run.advisorId === 'anri' && st.run.partnerId === partnerId && st.run.kind === 'part' && st.run.arc === 0, 'run started at arc intro with partner');
  assert(!!st.meta.achievements.first_run, 'first_run achievement');
  await page.screenshot({ path: OUT + '/09_arcintro.png', fullPage: true });
  await page.click('[data-action="story-next"]'); await wait(300);
  st = await S(); assert(st.run.phase === 'policySelect', 'policy select shown after arc intro');
  await page.click('[data-action="choose-policy"][data-arg="balance"]'); await wait(1700);
  st = await S(); assert(st.run.policy === 'balance' && st.run.phase === 'match' && st.run.match.rule === 'single' && st.run.match.current.options.length === 3, 'entry single climax with custom options');
  await page.screenshot({ path: OUT + '/10_entry_match.png', fullPage: true });
  await force();
  await page.click('[data-action="climax"][data-arg="C"]'); await wait(200);
  assert(await page.$('.result-wrap.success'), 'entry result shown');
  await page.click('[data-action="climax-next"]'); await wait(100);
  st = await S(); assert(st.run.phase === 'matchResult' && st.run.matchResult.outcome === 'advance', 'match result screen');
  await page.click('[data-action="match-next"]'); await wait(300);
  st = await S(); assert(st.run.phase === 'storyChoice' && st.run.seg === 1, 'story choice shown before z_x');
  assert((await page.$$('[data-action="choose-story"]')).length === 3 && (await page.$('.rival-hero')), 'three options + rival hero');
  await page.screenshot({ path: OUT + '/11_choice.png', fullPage: true });
  await page.click('[data-action="choose-story"][data-arg="1"]'); await wait(150);
  assert(await page.$('[data-action="close-choice"]'), 'choice result modal');
  await page.click('[data-action="close-choice"]'); await wait(200);
  st = await S(); assert(st.run.phase === 'training' && st.run.seg === 1 && st.run.weeksLeft === 3 && st.run.flags.ally_chigiri && st.run.storyFx.opt.C === 3 && st.run.choiceLog.length === 1, 'choice applied: flag + Option C +3, training 3 weeks');
  assert(await page.$('.nm-rival'), 'rival art in next-match panel');
  await page.screenshot({ path: OUT + '/13_training.png', fullPage: true });
  await page.keyboard.press('1'); await wait(150);
  st = await S();
  if (st.run.phase === 'event') { await page.click('[data-action="event-choice"][data-arg="0"]'); await wait(100); await page.click('[data-action="close-event"]'); await wait(100); st = await S(); }
  assert(st.run.weeksLeft === 2 && st.run.stats.SHT > 31, 'keyboard training consumed a week');
  await page.click('[data-action="open-story"]'); assert(await page.$('.story-body'), 'story modal'); await page.keyboard.press('Escape');

  /* generic autoplay with forced 100% */
  async function playUntil(pred, max) {
    for (let i = 0; i < (max || 500); i++) {
      st = await S(); if (!st.run) return;
      if (pred(st)) return;
      const ph = st.run.phase; const u = await U();
      if (u.modal === 'event') { await page.click('[data-action="event-choice"][data-arg="0"]'); await wait(60); await page.click('[data-action="close-event"]'); await wait(60); continue; }
      if (ph === 'training') { if (st.run.hp < 50) await page.click('[data-action="rest"]'); else await page.click('[data-action="train"][data-arg="INT"]'); await wait(1600 * (st.run.weeksLeft === 1 ? 1 : 0) + 80); continue; }
      if (ph === 'match') {
        if (st.run.match.showResult) { await page.click('[data-action="climax-next"]'); await wait(60); continue; }
        await force(); await clickClimax(st); await wait(60); continue;
      }
      if (ph === 'matchResult') { if (st.run.match && st.run.match.showResult) { await page.click('[data-action="climax-next"]'); await wait(60); continue; } await page.click('[data-action="match-next"]'); await wait(1700); continue; }
      if (ph === 'evaluation') { await page.click('[data-action="eval-next"]'); await wait(300); continue; }
      if (ph === 'arcIntro') { await page.evaluate(() => { const s = BL_UI.state(); if (s.run.players) s.run.players.forEach(p => Object.keys(p.stats).forEach(k => { p.stats[k] *= 4; })); else Object.keys(s.run.stats).forEach(k => { s.run.stats[k] *= 4; }); BL.save(s); }); await page.click('[data-action="story-next"]'); await wait(200); continue; }
      if (ph === 'policySelect') { await page.click('[data-action="choose-policy"][data-arg="balance"]'); await wait(200); continue; }
      if (ph === 'storyChoice') { const ci = (st.run.arc === 1 && st.run.seg === 1) ? 1 : 0; await page.click('[data-action="choose-story"][data-arg="' + ci + '"]'); await wait(120); if (await page.$('[data-action="close-choice"]')) { await page.click('[data-action="close-choice"]'); await wait(120); } continue; }
      if (ph === 'clubSelect') { await page.screenshot({ path: OUT + '/16_club.png', fullPage: true }); await page.click('[data-action="choose-club"][data-arg="fr"]'); await wait(200); continue; }
      if (ph === 'gameover' || ph === 'clear' || ph === 'graduated') return;
    }
  }
  async function nextPart(gradId, shot) {
    await page.click('[data-action="lobby-tab"][data-arg="grads"]'); if (shot) await page.screenshot({ path: shot, fullPage: true });
    await page.click('[data-action="pick-grad"][data-arg="' + gradId + '"]'); await wait(100);
    await page.click('[data-action="choose-advisor"][data-arg="anri"]'); await wait(100);
    await page.click('[data-action="choose-partner"][data-arg="none"]'); await wait(1500);
  }

  /* part 1 → graduation */
  await playUntil(s => s.run.phase === 'evaluation');
  st = await S(); assert(st.run.evalResult.survived && st.run.evalResult.partRank, 'first arc evaluation survived with part rank');
  await page.screenshot({ path: OUT + '/12_eval.png', fullPage: true });
  await page.click('[data-action="eval-next"]'); await wait(300);
  st = await S(); assert(st.run.phase === 'graduated' && st.meta.grads.length === 1 && st.meta.grads[0].part === 1, 'graduated screen + grad stored');
  assert(!!st.meta.achievements.pass_first && !!st.meta.achievements.grad_first, 'pass_first + grad_first achievements');
  assert(st.meta.mastery.isagi === 1 && st.meta.pieces > 40, 'mastery and pieces granted');
  await page.screenshot({ path: OUT + '/14_graduated.png', fullPage: true });
  await page.click('[data-action="close-run"]'); await wait(100);
  st = await S(); assert(st.run === null && st.meta.history[0].graduated, 'run closed; history says graduated');
  assert(await page.$('.grad-card'), 'grads tab shows the graduate');
  const gradId = st.meta.grads[0].id;

  /* part 2 from the graduate; force Rin loss to test the branch */
  await nextPart(gradId, OUT + '/15_grads.png');
  st = await S(); assert(st.run && st.run.arc === 1 && st.run.gradId === gradId && st.run.stats.SHT === st.meta.grads[0].stats.SHT, 'part 2 started from graduate with carried stats');
  await playUntil(s => s.run.phase === 'match' && s.run.match.rule === 'stage3_rin');
  st = await S(); assert(st.run.match.rule === 'stage3_rin', 'at 3rd stage vs Rin');
  for (let i = 0; i < 3; i++) { await zero(); await page.click('[data-action="climax"][data-arg="A"]'); await wait(60); await page.click('[data-action="climax-next"]'); await wait(60); }
  st = await S(); assert(st.run.phase === 'matchResult' && st.run.matchResult.outcome === 'branch' && st.run.flags.rinLoss && st.run.flags.team_barou, 'loss vs Rin branches (team_barou route)');
  await page.click('[data-action="match-next"]'); await wait(1700);
  st = await S(); assert(st.run.phase === 'match' && /蜂楽・凪/.test(st.run.match.name) && st.run.match.rival === 'nagi', 'alternate 2v2 route vs Bachira/Nagi inserted (0 weeks)');
  assert(await page.$('.rival-strip'), 'rival strip in climax');
  assert(!!st.meta.achievements.route_barou, 'route achievement');
  await page.screenshot({ path: OUT + '/15b_alt_route.png', fullPage: true });
  await playUntil(s => s.run.phase === 'graduated'); await page.click('[data-action="close-run"]'); await wait(100);
  st = await S(); assert(st.meta.grads.length === 1 && st.meta.grads[0].part === 2, 'same graduate advanced to part 2');
  /* part 3, part 4 */
  await nextPart(gradId); await playUntil(s => s.run.phase === 'graduated'); await page.click('[data-action="close-run"]'); await wait(100);
  st = await S(); assert(st.meta.grads[0].part === 3, 'part 3 graduated');
  await nextPart(gradId); st = await S(); assert(st.run.arc === 3, 'part 4 (NEL) started');
  await playUntil(s => s.run.arc === 3 && s.run.phase === 'training');
  st = await S(); assert(st.run.club === 'fr' && /P・X・G/.test(st.run.log.join(' ')), 'club chosen (PXG) and NEL match resolved');
  await playUntil(s => s.run.phase === 'graduated'); await page.click('[data-action="close-run"]'); await wait(100);
  st = await S(); assert(st.meta.grads[0].part === 4 && !!st.meta.achievements.grad_4 && !!st.meta.achievements.pass_nel, 'part 4 graduated (final candidate)');
  await page.screenshot({ path: OUT + '/17_grads_p4.png', fullPage: true });

  /* squad: clone the graduate to 5, pick, start final */
  await page.evaluate(() => { const s = BL_UI.state(); const g = s.meta.grads[0]; for (let i = 0; i < 4; i++) { const c = JSON.parse(JSON.stringify(g)); c.id = 'g_clone' + i; s.meta.grads.push(c); } BL.save(s); BL_UI.render(); });
  st = await S();
  for (const g of st.meta.grads) { await page.click('[data-action="toggle-squad"][data-arg="' + g.id + '"]'); await wait(50); }
  st = await S(); assert(st.meta.squadPick.length === 5, 'five squad members picked');
  assert(await page.$('.squad-bar.ready'), 'squad bar ready');
  await page.screenshot({ path: OUT + '/18_squad.png', fullPage: true });
  await page.click('[data-action="pick-final"]'); await wait(100);
  await page.click('[data-action="choose-advisor"][data-arg="anri"]'); await wait(1500);
  st = await S(); assert(st.run && st.run.kind === 'final' && st.run.players.length === 5 && st.run.arc === 4 && !!st.meta.achievements.final_first, 'final started with 5 players');
  await playUntil(s => s.run.arc === 4 && s.run.phase === 'training');
  assert((await page.$$('.sq-row')).length === 5, 'squad training rows');
  await page.screenshot({ path: OUT + '/19_final_training.png', fullPage: true });
  await playUntil(s => s.run.phase === 'match');
  st = await S(); assert(st.run.match.current.players && st.run.match.current.players.length === 5, 'final climax lists 5 players');
  assert((await page.$$('.sq-climax')).length === 5, 'squad climax rows');
  await page.screenshot({ path: OUT + '/20_final_climax.png', fullPage: true });
  await force(); await clickClimax(st); await wait(200);
  st = await S(); assert(st.run.players.some(p => p.uses === 1) && st.run.match.lastResult.playerName, 'player use counted and result names the player');
  await page.screenshot({ path: OUT + '/21_final_result.png', fullPage: true });
  await playUntil(s => !s.run || s.run.phase === 'clear');
  st = await S(); assert(st.run && st.run.phase === 'clear', 'cleared the final (forced)');
  assert(Math.max.apply(null, st.run.players.map(p => p.uses)) <= 4, 'uses cap respected');
  await page.screenshot({ path: OUT + '/22_clear.png', fullPage: true });
  await page.click('[data-action="close-run"]'); await wait(100);
  st = await S(); assert(st.meta.hof.length === 5 && st.run === null && st.meta.grads.length === 0 && st.meta.history[0].kind === 'final', 'HoF ×5, grads consumed, history recorded');
  /* export / import roundtrip */
  await page.click('[data-action="lobby-tab"][data-arg="records"]'); await page.click('[data-action="open-export"][data-arg="save"]'); await wait(100);
  const exported = await page.evaluate(() => document.querySelector('.modal textarea').value); assert(exported.length > 1000 && JSON.parse(exported).v === 5, 'save exported');
  await page.click('[data-action="close-modal"]');
  const imp = await page.evaluate((txt) => { const r = BL.importSave(txt.replace('"gems":' + JSON.parse(txt).meta.gems, '"gems":4321')); return r.ok && BL.load().meta.gems; }, exported);
  assert(imp === 4321, 'import roundtrip (gems overwritten)');
  await page.evaluate((txt) => { BL.importSave(txt); }, exported);
  await page.click('[data-action="lobby-tab"][data-arg="hof"]'); await page.screenshot({ path: OUT + '/23_hof.png', fullPage: true });
  await page.click('[data-action="wc-start"]'); assert(await page.$('.wc-intro'), 'WC intro');
  await page.click('[data-action="wc-begin"]'); await wait(1600);
  st = await S(); assert(st.wc.phase === 'match' && st.wc.match.n === 4, 'WC match 4 climaxes');
  await page.reload(); await page.click('.title-screen'); await wait(300);
  st = await S(); assert(st.wc && st.wc.phase === 'match', 'WC persisted across reload');
  console.log('ERRORS', errors.length ? errors : 'none', '/ assertions', nOk);
  await browser.close();
  if (errors.length) process.exit(2);
})().catch(e => { console.error('E2E FAILED', e); process.exit(1); });
