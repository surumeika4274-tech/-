/* ブラウザE2E: python3 -m http.server 8765 を起動した状態で node tools/e2e.js（要 playwright + chromium。executablePath は環境に合わせて変更） */
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const OUT = require('path').join(__dirname, '..', 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const base = 'http://127.0.0.1:8765/';
function assert(c, msg) { if (!c) throw new Error('ASSERT: ' + msg); console.log('ok -', msg); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|404/.test(m.text())) errors.push('console: ' + m.text()); });
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(BL_UI.state())));
  const U = () => page.evaluate(() => ({ modal: BL_UI.ui.modal && BL_UI.ui.modal.type }));
  const phase = async () => (await S()).run && (await S()).run.phase;
  const wait = (ms) => page.waitForTimeout(ms);

  await page.goto(base);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForSelector('.title-screen');
  await page.screenshot({ path: OUT + '/01_title.png' });
  await page.click('.title-screen'); await page.waitForSelector('.lobby');
  await page.screenshot({ path: OUT + '/02_lobby.png', fullPage: true });
  let st = await S();
  assert(Object.keys(st.meta.roster).length === 1, 'starter card only');
  const starterId = Object.keys(st.meta.roster)[0];

  /* gacha */
  await page.click('[data-action="lobby-tab"][data-arg="gacha"]');
  await page.screenshot({ path: OUT + '/03_gacha.png', fullPage: true });
  await page.click('[data-action="gacha"][data-arg="10"]'); await page.waitForSelector('.pulls'); await wait(1200);
  await page.screenshot({ path: OUT + '/04_gacha_result.png', fullPage: true });
  await page.click('[data-action="close-modal"]');
  st = await S(); assert(st.meta.gems === 0 + (st.meta.achievements.first_run ? 100 : 0), 'gems spent');

  /* dex + achievements + records tabs */
  await page.click('[data-action="lobby-tab"][data-arg="dex"]'); await page.screenshot({ path: OUT + '/05_dex.png' });
  await page.click('[data-action="lobby-tab"][data-arg="ach"]'); await page.screenshot({ path: OUT + '/06_ach.png' });
  await page.click('[data-action="lobby-tab"][data-arg="records"]'); await page.click('[data-action="open-rules"]'); assert(await page.$('.rules'), 'rules modal'); await page.screenshot({ path: OUT + '/07_rules.png', fullPage: true }); await page.click('[data-action="close-modal"]');

  /* start run: pick starter → advisor modal → choose ego */
  await page.click('[data-action="lobby-tab"][data-arg="roster"]');
  await page.click('[data-action="pick-card"][data-arg="' + starterId + '"]');
  assert(await page.$('.btn.choice.adv'), 'advisor picker shown');
  assert(await page.$('.btn.choice.adv.locked'), 'locked advisors shown');
  await page.screenshot({ path: OUT + '/08_advisor.png' });
  await page.click('[data-action="start-run"][data-arg="anri"]'); await wait(1500);
  st = await S(); assert(st.run && st.run.phase === 'arcIntro' && st.run.advisorId === 'anri', 'run started at arc intro');
  assert(!!st.meta.achievements.first_run, 'first_run achievement');
  await page.screenshot({ path: OUT + '/09_arcintro.png', fullPage: true });
  /* entry test: story-next → match immediately (0 weeks) */
  await page.click('[data-action="story-next"]'); await wait(1700);
  st = await S(); assert(st.run.phase === 'match' && st.run.match.rule === 'single' && st.run.match.current.options.length === 3, 'entry single climax with custom options');
  await page.screenshot({ path: OUT + '/10_entry_match.png', fullPage: true });
  /* force success for test determinism: set option p to 100 */
  await page.evaluate(() => { const s = BL_UI.state(); s.run.match.current.options.forEach(o => { o.p = 100; o.pct = 100; }); BL.save(s); BL_UI.render(); });
  await page.click('[data-action="climax"][data-arg="C"]'); await wait(200);
  assert(await page.$('.result-wrap.success'), 'entry result shown');
  await page.click('[data-action="climax-next"]'); await wait(100);
  st = await S(); assert(st.run.phase === 'matchResult' && st.run.matchResult.outcome === 'advance', 'match result screen');
  await page.screenshot({ path: OUT + '/11_matchresult.png', fullPage: true });
  await page.click('[data-action="match-next"]'); await wait(100);
  st = await S(); assert(st.run.phase === 'evaluation' && st.run.evalResult.survived, 'arc0 evaluation survived');
  await page.screenshot({ path: OUT + '/12_eval.png', fullPage: true });
  await page.click('[data-action="eval-next"]'); await wait(1500);
  st = await S(); assert(st.run.phase === 'arcIntro' && st.run.arc === 1, 'arc1 intro');
  await page.click('[data-action="story-next"]'); await wait(200);
  st = await S(); assert(st.run.phase === 'training' && st.run.weeksLeft === 3, 'arc1 seg1 training 3 weeks');
  await page.screenshot({ path: OUT + '/13_training.png', fullPage: true });

  /* keyboard shortcut training + condition + event handling */
  await page.keyboard.press('1'); await wait(150);
  st = await S();
  if (st.run.phase === 'event') { await page.click('[data-action="event-choice"][data-arg="0"]'); await wait(100); await page.click('[data-action="close-event"]'); await wait(100); st = await S(); }
  assert(st.run.weeksLeft === 2 && st.run.stats.SHT > 31, 'keyboard training consumed a week');
  await page.click('[data-action="open-story"]'); assert(await page.$('.story-body'), 'story modal'); await page.keyboard.press('Escape');

  /* run through league arc with forced 100% to reach the branch mechanics quickly */
  async function playUntil(pred, max) {
    for (let i = 0; i < (max || 400); i++) {
      st = await S(); if (!st.run) return;
      if (pred(st)) return;
      const ph = st.run.phase; const u = await U();
      if (u.modal === 'event') { await page.click('[data-action="event-choice"][data-arg="0"]'); await wait(60); await page.click('[data-action="close-event"]'); await wait(60); continue; }
      if (ph === 'training') { if (st.run.hp < 50) await page.click('[data-action="rest"]'); else await page.click('[data-action="train"][data-arg="INT"]'); await wait(1600 * (st.run.weeksLeft === 1 ? 1 : 0) + 80); continue; }
      if (ph === 'match') {
        if (st.run.match.showResult) { await page.click('[data-action="climax-next"]'); await wait(60); continue; }
        await page.evaluate(() => { const s = BL_UI.state(); s.run.match.current.options.forEach(o => { o.p = 100; o.pct = 100; }); BL.save(s); BL_UI.render(); });
        await page.click('[data-action="climax"][data-arg="' + st.run.match.current.options[0].key + '"]'); await wait(60); continue;
      }
      if (ph === 'matchResult') { if (st.run.match && st.run.match.showResult) { await page.click('[data-action="climax-next"]'); await wait(60); continue; } await page.click('[data-action="match-next"]'); await wait(1700); continue; }
      if (ph === 'evaluation') { await page.click('[data-action="eval-next"]'); await wait(1500); continue; }
      if (ph === 'arcIntro') { await page.evaluate(() => { const s = BL_UI.state(); Object.keys(s.run.stats).forEach(k => { s.run.stats[k] *= 4; }); BL.save(s); }); await page.click('[data-action="story-next"]'); await wait(200); continue; }
      if (ph === 'clubSelect') { await page.screenshot({ path: OUT + '/16_club.png', fullPage: true }); await page.click('[data-action="choose-club"][data-arg="fr"]'); await wait(200); continue; }
      if (ph === 'gameover' || ph === 'clear') return;
    }
  }
  await playUntil(s => s.run.arc === 2 && s.run.phase === 'training');
  st = await S(); assert(st.run.arc === 2, 'reached arc 2 (二次選考)');
  assert(!!st.meta.achievements.pass_first, 'pass_first achievement');
  /* force a loss at s_rin1 to test branch: play until s_rin1 match then set p=0 */
  await playUntil(s => s.run.phase === 'match' && s.run.match.rule === 'stage3_rin');
  st = await S(); assert(st.run.match.rule === 'stage3_rin', 'at 3rd stage vs Rin');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { const s = BL_UI.state(); if (s.run.match.current) s.run.match.current.options.forEach(o => { o.p = 0; o.pct = 0; }); BL.save(s); BL_UI.render(); });
    await page.click('[data-action="climax"][data-arg="A"]'); await wait(60); await page.click('[data-action="climax-next"]'); await wait(60);
  }
  st = await S(); assert(st.run.phase === 'matchResult' && st.run.matchResult.outcome === 'branch' && st.run.flags.rinLoss, 'loss vs Rin branches instead of eliminating');
  await page.screenshot({ path: OUT + '/14_branch.png', fullPage: true });
  await page.click('[data-action="match-next"]'); await wait(1700);
  st = await S(); assert(st.run.phase === 'match' && /2ndステージ/.test(st.run.match.name), '2v2 segment inserted immediately (0 weeks)');
  await page.screenshot({ path: OUT + '/15_2v2.png', fullPage: true });
  /* continue to NEL club select and then to WC group */
  await playUntil(s => s.run.arc === 4 && s.run.phase === 'training');
  st = await S(); assert(st.run.club === 'fr', 'club chosen (PXG)');
  assert(/P・X・G/.test(BL_name(st)), 'NEL match resolved vs opponent');
  function BL_name(s) { return s.run.log.join(' '); }
  await playUntil(s => s.run.arc === 5 && s.run.phase === 'training');
  st = await S(); assert(st.run.arc === 5 && st.meta.achievements.pass_nel, 'reached WC arc + pass_nel');
  await playUntil(s => !s.run || s.run.phase === 'clear');
  st = await S(); assert(st.run && st.run.phase === 'clear', 'cleared the run (forced)');
  await page.screenshot({ path: OUT + '/17_clear.png', fullPage: true });
  await page.click('[data-action="close-run"]');
  st = await S(); assert(st.meta.hof.length === 1 && st.run === null && st.meta.history.length === 1, 'HoF entry + history recorded');
  await page.click('[data-action="lobby-tab"][data-arg="hof"]'); await page.screenshot({ path: OUT + '/18_hof.png', fullPage: true });
  await page.click('[data-action="wc-start"]'); assert(await page.$('.wc-intro'), 'WC intro');
  await page.click('[data-action="wc-begin"]'); await wait(1600);
  st = await S(); assert(st.wc.phase === 'match' && st.wc.match.n === 4, 'WC match 4 climaxes');
  /* reload persistence mid WC */
  await page.reload(); await page.click('.title-screen'); await wait(300);
  st = await S(); assert(st.wc && st.wc.phase === 'match', 'WC persisted across reload');
  await page.screenshot({ path: OUT + '/19_wc.png', fullPage: true });
  console.log('ERRORS', errors.length ? errors : 'none');
  await browser.close();
  if (errors.length) process.exit(2);
})().catch(e => { console.error('E2E FAILED', e); process.exit(1); });
