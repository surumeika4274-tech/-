/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  UI layer v3 (vanilla DOM, no framework)
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL; var D = BL.DATA; var P = D.PARAMS; var ARCS = BL.STORY.arcs; var LAST = ARCS.length - 1;

  var state = BL.load();
  var ui = { screen: 'title', lobbyTab: 'roster', rosterFilter: 'all', inLobby: false, modal: null, flash: null, busy: false, pick: null, fastFx: false };
  function motionOk() { try { return !ui.fastFx && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return !ui.fastFx; } }
  BL.SFX.setEnabled(state.meta.sfx !== false);

  /* ------------------------------------------------------------ utils */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(r) { var n = D.RARITY[r].stars; var s = ''; for (var i = 0; i < n; i++) s += '★'; return s; }
  function cardBadge(card) { return (card.flow ? ' <span class="tag flow">FLOW</span>' : '') + (card.origin === 'mod' ? ' <span class="tag">改変版</span>' : ''); }
  function num(v) { return Math.round(v).toLocaleString(); }
  function pct(v) { return Math.round(v) + '%'; }
  function yen(v) { return BL.fmtYen(v); }
  function cash(v) { return '¥' + Math.round(v).toLocaleString(); }
  function rc(r) { return D.RARITY[r].color; }
  function sfx(n) { if (state.meta.sfx !== false) BL.SFX.play(n); }
  function typeIcon(t) { return BL.ART.typeIcon(t, 14); }
  function portraitOf(charId) { return (state.meta.portraits || {})[charId] || (BL.PORTRAITS && BL.PORTRAITS[charId]) || null; }
  function art(card, size) { return BL.ART.svg(card, { portrait: portraitOf(card.char), size: size || 120 }); }
  function ownOf(cardId) { return state.meta.roster[cardId]; }
  function effRar(card) { return BL.effRar(card, ownOf(card.id)); }
  function rarLabel(card) { var own = ownOf(card.id); var e = effRar(card); return stars(e) + (own && own.tier ? '<small class="tierup">+' + own.tier + '</small>' : ''); }
  function policyName(id) { var p = BL.policyById(id); return p ? p.name : ''; }
  /* 育成中の選手を大きく見せる帯（編導入・方針選択・査定・除籍・世界一で共通）。決戦は 5 人の帯 */
  function runHero(run, size) {
    if (BL.isFinal(run)) return squadStrip(run, size ? Math.round(size * 0.6) : 72);
    var card = BL.cardById(run.cardId); if (!card) return '';
    var ranks = (run.partRanks || []).map(function (r, i) { return r ? '<em class="pr ' + r + '">' + (i + 1) + ':' + r + '</em>' : ''; }).join('');
    var partner = run.partnerId ? BL.cardById(run.partnerId) : null; var chem = partner ? BL.chemistryFor(state, run.charId, run.partnerId) : null;
    return '<div class="run-hero" style="--rc:' + rc(card.rar) + '"><div class="rh-art" data-action="card-detail" data-arg="' + card.id + '">' + art(card, size || 120) + '</div>' +
      '<div class="rh-meta"><i>' + rarLabel(card) + ' ' + esc(D.RARITY[effRar(card)].name) + '</i><b>' + esc(BL.cardName(card)) + '</b><small>' + esc(card.type) + ' / ' + esc((card.pos || []).join('・')) + (run.policy ? ' / 方針：' + esc(policyName(run.policy)) : '') + (run.lb ? ' / 限界突破 +' + run.lb : '') + (run.masteryLv ? ' / 熟練度 Lv.' + run.masteryLv : '') + '</small>' +
      (partner ? '<small class="partner-line">相棒：' + esc(BL.cardName(partner)) + (chem && chem.pair ? ' ＝ 化学反応「' + esc(chem.name) + '」' : '') + '</small>' : '') +
      (ranks ? '<div class="rh-ranks">' + ranks + '</div>' : '') + '</div></div>';
  }
  function squadStrip(run, size) {
    var cap = BL.usesCap(run);
    return '<div class="squad-strip">' + run.players.map(function (p, i) {
      var card = BL.cardById(p.cardId);
      return '<div class="sq-mini' + (p.injured ? ' injured' : '') + (i === run.captain ? ' captain' : '') + '" style="--rc:' + rc(card.rar) + '" data-action="card-detail" data-arg="' + card.id + '">' + art(card, size || 72) + '<b>' + esc(D.CHARACTERS[p.charId].name) + '</b><small>' + (p.injured ? '故障' : 'HP ' + p.hp + '% / 起用 ' + p.uses + '/' + cap) + '</small></div>';
    }).join('') + '</div>';
  }
  function charOfRun(run) { return D.CHARACTERS[run.charId]; }

  function toast(msg, kind) {
    var box = $('#toasts'); var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : ''); el.textContent = msg; box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2400);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2900);
  }
  function flushAchievements() {
    var ids = BL.drainPendingAch(state);
    ids.forEach(function (id, i) {
      var a = D.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0]; if (!a) return;
      setTimeout(function () { toast('🏆 実績「' + a.name + '」達成！ Ego Gems +' + a.gems, 'ok'); sfx('ach'); }, 300 + i * 700);
    });
  }
  function disclaimerBar() { return '<div class="disclaimer">' + esc(D.DISCLAIMER) + '</div>'; }

  /* ------------------------------------------------------------ render root */
  function render() {
    var app = $('#app'); var html = '';
    var inGame = ui.screen !== 'title' && !ui.inLobby && !state.wc;
    if (inGame && state.run && state.run.phase === 'event' && !(ui.modal && ui.modal.type === 'event')) ui.modal = { type: 'event' };
    if (ui.screen === 'title') html = renderTitle();
    else if (state.wc && !ui.inLobby) html = renderWorldCup();
    else if (state.run && !ui.inLobby) html = renderRun();
    else html = renderLobby();
    app.innerHTML = html;
    renderOverlay();
    document.body.classList.toggle('flow', isFlowActive());
    document.body.setAttribute('data-part', state.run && !ui.inLobby ? String(BL.arcOf(state.run).n) : (state.wc && !ui.inLobby ? 'wc' : '0'));
    window.scrollTo(0, 0);
    if ($('.bid-num')) countUp();
    flushAchievements();
  }
  function isFlowActive() {
    var m = state.wc ? state.wc.match : (state.run && state.run.match);
    var phase = state.wc ? state.wc.phase : (state.run && state.run.phase);
    if (!(m && phase === 'match' && m.current && !m.showResult)) return false;
    if (m.current.players) return m.current.players.some(function (pe) { return pe.flow && pe.avail; });
    return !!m.current.flow;
  }
  function renderOverlay() {
    var ov = $('#overlay');
    if (!ui.modal) { ov.hidden = true; ov.innerHTML = ''; return; }
    var inner = '';
    switch (ui.modal.type) {
      case 'store': inner = renderStore(); break;
      case 'event': inner = renderEventModal(); break;
      case 'gacha': inner = renderGachaResult(); break;
      case 'card': inner = renderCardDetail(); break;
      case 'skills': inner = renderSkillList(); break;
      case 'rules': inner = renderRules(); break;
      case 'advisor': inner = renderAdvisorPick(); break;
      case 'partner': inner = renderPartnerPick(); break;
      case 'story': inner = renderStoryModal(); break;
      case 'naming': inner = renderNamingList(); break;
      case 'exchange': inner = renderExchange(); break;
      case 'grad': inner = renderGradDetail(); break;
      case 'choiceResult': inner = renderChoiceResult(); break;
      case 'export': inner = renderExport(); break;
      case 'summary': inner = '<div class="modal-head"><h2>RUN 結果</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><p class="muted small">クリップボードにアクセスできない環境のため、以下を選択してコピーしてください。</p><textarea class="summary-box" id="summary-text" readonly onfocus="this.select()">' + esc(ui.modal.text) + '</textarea>'; break;
    }
    ov.innerHTML = '<div class="modal-backdrop"><div class="modal">' + inner + '</div></div>'; ov.hidden = false;
  }

  /* ------------------------------------------------------------ title */
  function renderTitle() {
    return '<section class="screen title-screen" data-action="title-start"><div class="title-bg"><i></i><i></i><i></i></div>' + disclaimerBar() +
      '<div class="title-body"><div class="title-kicker">PROJECT : WORLD CHAMPION — MODIFIED / 原作準拠ローグライト</div>' +
      '<h1 class="title-logo"><span>BLUE</span> <span class="accent">LOCK</span><small>PWC : EGOIST ROGUELITE</small></h1>' +
      '<p class="title-tag">一次選考から二次・三次選考、新英雄大戦まで、編ごとに1人を育て上げて卒業させろ。第四編を卒業した5人で U-20 ワールドカップに挑む。敗者は即刻除籍。能力は青天井。</p>' +
      '<div class="title-cta">' + (state.run ? '育成中のデータがあります — TAP TO RESUME' : 'TAP TO START') + '</div>' +
      '<div class="title-meta">Ego Gems ' + num(state.meta.gems) + ' / 周回 ' + state.meta.records.runs + ' / 育成済み ' + state.meta.grads.length + ' / 殿堂入り ' + state.meta.hof.length + ' / 所持カード ' + Object.keys(state.meta.roster).length + '/' + BL.CARDS.length + '</div>' +
      '</div></section>';
  }

  /* ------------------------------------------------------------ lobby */
  function renderLobby() {
    var m = state.meta;
    var tabs = [['roster', '所持選手'], ['grads', '育成済み' + (m.grads.length ? ' (' + m.grads.length + ')' : '')], ['gacha', 'スカウト'], ['upgrade', '強化'], ['dex', '図鑑'], ['hof', '殿堂 / W杯'], ['ach', '実績'], ['records', '戦績・ルール']];
    var tabHtml = tabs.map(function (t) { return '<button class="tab' + (ui.lobbyTab === t[0] ? ' active' : '') + '" data-action="lobby-tab" data-arg="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var body = { roster: renderRoster, grads: renderGrads, gacha: renderGacha, upgrade: renderUpgrades, dex: renderDex, hof: renderHof, ach: renderAchievements, records: renderRecords }[ui.lobbyTab]();
    var feat = featuredCard();
    var hero = feat ? '<div class="home-hero"><div class="hero-art" data-action="card-detail" data-arg="' + feat.id + '">' + art(feat, 150) + '</div><div class="hero-text"><div class="hero-kicker">' + (state.run ? (BL.isFinal(state.run) ? '決戦メンバー（キャプテン）' : '育成中') : '推しストライカー') + '</div><h2>' + esc(D.CHARACTERS[feat.char].name) + '<small>【' + esc(feat.title) + '】 ' + rarLabel(feat) + ' ' + typeIcon(feat.type) + '</small></h2>' +
      (state.run ? '<div class="muted">' + esc(BL.arcOf(state.run).part) + ' ' + esc(BL.arcOf(state.run).title) + ' ／ 公式戦まで ' + state.run.weeksLeft + ' 週 ／ 合計 ' + num(BL.sumStats(state.run.stats)) + '</div><button class="btn primary" data-action="resume-run">育成を再開</button>' : '<div class="muted">' + esc(D.CHARACTERS[feat.char].passive.name) + '：' + esc(D.CHARACTERS[feat.char].passive.desc) + '</div><button class="btn primary" data-action="pick-card" data-arg="' + feat.id + '">この選手で第一編を開始</button>') +
      '</div></div>' : '';
    return '<section class="screen lobby">' + disclaimerBar() +
      '<header class="lobby-head"><div class="lobby-title"><span class="accent">BLUE LOCK</span> PWC — ロビー</div>' +
      '<div class="head-right"><button class="btn ghost sm diff ' + (m.difficulty === 'hell' ? 'hell' : '') + '" data-action="toggle-difficulty" title="' + esc(D.DIFFICULTIES[m.difficulty || 'normal'].desc) + '">' + (m.difficulty === 'hell' ? '🔥 地獄モード' : '難易度：通常') + '</button><button class="btn ghost sm" data-action="toggle-sfx">' + (m.sfx !== false ? '🔊 SE ON' : '🔇 SE OFF') + '</button><div class="gems">🧩 <b>' + num(m.pieces || 0) + '</b> ピース</div><div class="gems">💎 <b>' + num(m.gems) + '</b> Ego Gems</div></div></header>' +
      hero + '<nav class="tabs">' + tabHtml + '</nav><div class="lobby-body">' + body + '</div></section>';
  }

  function featuredCard() {
    if (state.run) return BL.cardById(state.run.cardId);
    var ids = Object.keys(state.meta.roster); if (!ids.length) return null;
    var best = null; ids.forEach(function (id) { var c = BL.cardById(id); if (c && (!best || Number(effRar(c)) > Number(effRar(best)))) best = c; });
    return best;
  }
  function cardCardHtml(card, own, opts) {
    var c = D.CHARACTERS[card.char]; var prof = own ? BL.profileFor(state, card) : BL.cardProfile(card, 0);
    var statLine = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(prof.stats[s]) + '</span>'; }).join('');
    var mlv = BL.masteryLv(state, card.char);
    var actions = '';
    if (opts && opts.owned) {
      actions = '<button class="btn ghost sm" data-action="card-detail" data-arg="' + card.id + '">詳細</button>' +
        '<button class="btn primary" data-action="pick-card" data-arg="' + card.id + '"' + (state.run || state.wc ? ' disabled' : '') + '>第一編を開始</button>';
    } else actions = '<button class="btn ghost sm" data-action="card-detail" data-arg="' + card.id + '">詳細</button>';
    return '<article class="card char-card' + (own ? '' : ' unowned') + '" style="--rc:' + rc(effRar(card)) + '">' +
      '<div class="card-art" data-action="card-detail" data-arg="' + card.id + '">' + art(card, 120) + '</div><div class="card-body">' +
      '<div class="card-top"><div class="rarity">' + rarLabel(card) + cardBadge(card) + '</div><div class="lb">' + typeIcon(card.type) + ' ' + esc(card.type) + (own ? (own.dupes ? ' / 限界突破 +' + own.dupes : '') + (mlv ? ' / 熟練 Lv.' + mlv : '') : ' / 未所持') + '</div></div>' +
      '<h3>' + esc(c.name) + '<small>【' + esc(card.title) + '】 ' + esc(card.pos.join('/')) + (card.stage ? ' / ' + esc(card.stage) : '') + ' — ' + esc(c.tag) + '</small></h3>' +
      '<div class="stat-line">' + statLine + '<span class="st total"><i>合計</i>' + num(BL.sumStats(prof.stats)) + '</span></div>' +
      '<div class="passive"><b>' + esc(c.passive.name) + '</b> ' + esc(c.passive.desc) + '</div>' +
      '<div class="card-actions">' + actions + '</div></div></article>';
  }
  function rarityFilterBar(current, action) {
    var opts = [['all', '全て']].concat(D.RARITY_ORDER.map(function (r) { return [r, D.RARITY[r].label + ' ' + D.RARITY[r].name]; }));
    return '<div class="filters">' + opts.map(function (o) { return '<button class="chipbtn' + (current === o[0] ? ' active' : '') + '" data-action="' + action + '" data-arg="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function busyNotice() {
    return state.run ? '<div class="notice warn">育成中の選手がいます。RUN を終えるまで新規育成は開始できません（リセット・放棄は不可）。<button class="btn primary sm" data-action="resume-run">育成を再開</button></div>' :
           state.wc ? '<div class="notice warn">FIFAワールドカップに出撃中の選手がいます。<button class="btn gold sm" data-action="wc-resume">W杯を再開</button></div>' : '';
  }
  function renderRoster() {
    var ids = Object.keys(state.meta.roster);
    var cards = ids.map(BL.cardById).filter(Boolean).filter(function (c) { return ui.rosterFilter === 'all' || effRar(c) === ui.rosterFilter; })
      .sort(function (a, b) { return D.RARITY_ORDER.indexOf(effRar(a)) - D.RARITY_ORDER.indexOf(effRar(b)) || a.char.localeCompare(b.char); });
    var tips = state.meta.records.runs === 0 ? '<div class="notice tips"><b>進行の流れ</b><ul><li><b>第一編</b>：所持カードから 1 人を選び、アドバイザーと相棒（任意）を決めて育成。編末の査定を生き残ると「卒業」し、<b>育成済み</b>タブに保存される。</li><li><b>第二〜四編</b>：前の編を卒業した選手だけが挑める。能力・スキル・年俸を引き継ぎ、編ごとに育成方針を選び直す。除籍されるとその卒業生は抹消される。</li><li><b>第五編・決戦</b>：第四編を卒業した 5 人を決戦メンバーに選び、U-20 W杯へ。局面ごとに起用選手を選ぶ（同一選手の起用は ' + P.FINAL_USES + ' 回まで）。世界一で 5 人全員が殿堂入り。</li><li>練習は HP を約15% 消費。HP50% 未満で効率半減、30% 未満で練習すると 40% で選手生命が終わる。全ての行動は即時保存され、やり直しは不可能。</li><li>Ego Gems はスカウトと<b>永続強化</b>に、エゴ・ピースは交換所と<b>星上げ</b>に使う。</li></ul></div>' : '';
    return busyNotice() + renderMissions() + tips + '<div class="muted small">所持 ' + ids.length + ' / ' + BL.CARDS.length + ' 枚（PWC 全170カード + 改変版オリジナル75枚）。同一カード再排出で限界突破（初期値 +5% / 成長 +3%）、ピースで星上げ（最大 +' + P.STARUP_MAX + ' 段階）。ここから開始できるのは<b>第一編</b>のみ。第二編以降は「育成済み」タブから。</div>' +
      rarityFilterBar(ui.rosterFilter, 'roster-filter') + '<div class="grid">' + cards.map(function (c) { return cardCardHtml(c, state.meta.roster[c.id], { owned: true }); }).join('') + '</div>';
  }
  function renderMissions() {
    var list = BL.missionStatus(state); var d = BL.daily(state);
    var rows = list.map(function (ms) {
      var rw = (ms.reward.gems ? '💎 ' + ms.reward.gems : '') + (ms.reward.pieces ? ' 🧩 ' + ms.reward.pieces : '');
      return '<div class="mission' + (ms.claimed ? ' claimed' : (ms.done ? ' done' : '')) + '"><div class="ms-body"><b>' + esc(ms.name) + '</b><div class="ms-bar"><i style="width:' + Math.round(100 * ms.cur / ms.goal) + '%"></i></div><small>' + ms.cur + ' / ' + ms.goal + '</small></div>' +
        (ms.claimed ? '<span class="tag ok">受取済</span>' : '<button class="btn ' + (ms.done ? 'gold' : 'ghost') + ' sm" data-action="claim-mission" data-arg="' + ms.id + '"' + (ms.done ? '' : ' disabled') + '>' + rw.trim() + '</button>') + '</div>';
    }).join('');
    return '<div class="panel missions"><h4>デイリーミッション <small>' + esc(d.date) + ' ／ 日付が変わるとリセット ／ 通算受取 ' + (d.claimedTotal || 0) + '</small></h4><div class="ms-grid">' + rows + '</div></div>';
  }
  function gradCardHtml(g, opts) {
    var card = BL.cardById(g.cardId); var c = D.CHARACTERS[g.charId];
    var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(g.stats[s]) + '</span>'; }).join('');
    var ranks = (g.partRanks || []).map(function (r, i) { return r ? '<em class="pr ' + r + '">' + (i + 1) + ':' + r + '</em>' : ''; }).join('');
    var isLast = g.part >= LAST; var picked = (state.meta.squadPick || []).indexOf(g.id) >= 0;
    var btn = isLast ? '<button class="btn ' + (picked ? 'gold' : 'ghost') + '" data-action="toggle-squad" data-arg="' + g.id + '"' + (state.run || state.wc ? ' disabled' : '') + '>' + (picked ? '✓ 決戦メンバー' : '決戦メンバーに選ぶ') + '</button>'
                     : '<button class="btn primary" data-action="pick-grad" data-arg="' + g.id + '"' + (state.run || state.wc ? ' disabled' : '') + '>' + esc(ARCS[g.part].part) + 'へ進む</button>';
    return '<article class="card char-card grad-card' + (picked ? ' picked' : '') + '" style="--rc:' + rc(effRar(card)) + '">' +
      '<div class="card-art" data-action="grad-detail" data-arg="' + g.id + '">' + art(card, 120) + '<span class="part-badge p' + g.part + '">' + esc(ARCS[g.part - 1].part) + ' 卒業</span></div><div class="card-body">' +
      '<div class="card-top"><div class="rarity">' + rarLabel(card) + '</div><div class="lb">' + typeIcon(card.type) + ' ' + esc(card.type) + (g.lb ? ' / 限界突破 +' + g.lb : '') + (g.finals ? ' / 決戦敗退 ' + g.finals + ' 回' : '') + '</div></div>' +
      '<h3>' + esc(c.name) + '<small>【' + esc(card.title) + '】 ' + (isLast ? '決戦メンバー候補' : '次：' + esc(ARCS[g.part].part) + ' ' + esc(ARCS[g.part].title)) + '</small></h3>' +
      '<div class="stat-line">' + st + '<span class="st total"><i>合計</i>' + num(BL.sumStats(g.stats)) + '</span></div>' +
      '<div class="muted small">スキル ' + (BL.skillCount(g.skills) + (g.sig || 0)) + ' / 年俸 ' + yen(g.bid || 0) + ' / Cash ' + cash(g.cash || 0) + (ranks ? ' <span class="rh-ranks inline">' + ranks + '</span>' : '') + '</div>' +
      '<div class="card-actions"><button class="btn ghost sm" data-action="grad-detail" data-arg="' + g.id + '">詳細</button>' + btn + '</div></div></article>';
  }
  function renderGrads() {
    var grads = state.meta.grads.slice().sort(function (a, b) { return b.part - a.part || BL.sumStats(b.stats) - BL.sumStats(a.stats); });
    var pick = (state.meta.squadPick || []).filter(function (id) { return BL.gradById(state, id); });
    var finalists = grads.filter(function (g) { return g.part >= LAST; });
    var squadBar = '<div class="squad-bar' + (pick.length === P.FINAL_SQUAD ? ' ready' : '') + '"><div><b>決戦メンバー ' + pick.length + ' / ' + P.FINAL_SQUAD + '</b><small class="muted">第四編を卒業した選手（候補 ' + finalists.length + ' 名）から 5 人を選ぶ。U-20 W杯では局面ごとに起用選手を選び、同じ選手は ' + P.FINAL_USES + ' 回（永続強化で増加）まで起用できる。敗退しても卒業生は失われないが、敗退回数が記録される。</small></div>' +
      '<button class="btn gold lg" data-action="pick-final"' + (pick.length !== P.FINAL_SQUAD || state.run || state.wc ? ' disabled' : '') + '>第五編・決戦へ出撃</button></div>';
    if (!grads.length) return busyNotice() + '<div class="notice">育成済みの選手はまだいない。所持選手から第一編を開始し、査定を生き残ると「卒業」してここに保存される。卒業生は次の編に能力・スキル・年俸を引き継いで挑める。</div>' + squadBar;
    var groups = [4, 3, 2, 1].map(function (p) {
      var list = grads.filter(function (g) { return g.part === p; }); if (!list.length) return '';
      return '<h4 class="sect">' + esc(ARCS[p - 1].part) + ' 卒業 <small class="muted">' + list.length + ' 名 — ' + (p >= LAST ? '決戦メンバー候補' : '次は ' + esc(ARCS[p].part) + '「' + esc(ARCS[p].title) + '」') + '</small></h4><div class="grid">' + list.map(function (g) { return gradCardHtml(g); }).join('') + '</div>';
    }).join('');
    return busyNotice() + squadBar + groups;
  }
  function renderGradDetail() {
    var g = BL.gradById(state, ui.modal.gradId); if (!g) return '';
    var card = BL.cardById(g.cardId);
    var hist = (g.history || []).slice(-12).reverse().map(function (h) { return '<li class="' + (h.won ? 'ok' : 'ng') + '"><span>' + esc(ARCS[h.arc].part) + ' ' + esc(h.name) + '</span><b>' + h.me + '-' + h.en + '</b></li>'; }).join('');
    return '<div class="modal-head"><h2 style="color:' + rc(effRar(card)) + '">' + rarLabel(card) + ' ' + esc(g.name) + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<div class="detail-grid"><div class="detail-art">' + art(card, 160) + '</div><div class="detail-body">' +
      '<p class="muted">' + esc(ARCS[g.part - 1].part) + ' 卒業 ／ アドバイザー ' + esc((BL.advisorById(g.advisorId) || {}).name || '') + (g.partnerId && BL.cardById(g.partnerId) ? ' ／ 相棒 ' + esc(BL.cardName(BL.cardById(g.partnerId))) : '') + (g.club ? ' ／ ' + esc(BL.clubById(g.club).name) : '') + '<br>方針履歴：' + esc((g.policies || []).map(policyName).join(' → ')) + '</p>' +
      '<div class="stat-line">' + D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(g.stats[s]) + '</span>'; }).join('') + '<span class="st total"><i>合計</i>' + num(BL.sumStats(g.stats)) + '</span></div>' +
      '<div class="muted">年俸 ' + yen(g.bid || 0) + ' ／ Cash ' + cash(g.cash || 0) + ' ／ 通算ゴール ' + ((g.totals || {}).goals || 0) + ' ／ 編評価 ' + esc((g.partRanks || []).join('')) + '</div>' +
      '<div class="panel skills"><h4>覚醒スキル</h4>' + (skillChips(g.skills) || '<span class="muted">なし</span>') + (g.sig ? '<span class="chip sig">★ ' + esc(D.CHARACTERS[g.charId].sig.name) + '<b>Lv.' + g.sig + '</b></span>' : '') + '</div>' +
      ((g.choiceLog && g.choiceLog.length) ? '<h4 class="sect">選択の履歴</h4><ul class="req-list">' + g.choiceLog.map(function (c) { return '<li class="pending"><span>' + esc(ARCS[c.arc].part) + ' ' + esc(c.title) + '</span><b>' + esc(c.label) + '</b></li>'; }).join('') + '</ul>' : '') +
      (hist ? '<h4 class="sect">直近の試合</h4><ul class="req-list">' + hist + '</ul>' : '') + '</div></div>';
  }
  function renderUpgrades() {
    var m = state.meta;
    var rows = D.UPGRADES.map(function (u) {
      var lv = m.upgrades[u.id] || 0; var cost = BL.upgradeCost(state, u.id); var maxed = lv >= u.max;
      var pips = ''; for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      return '<div class="upg"><div class="upg-icon">' + u.icon + '</div><div class="upg-body"><b>' + esc(u.name) + ' <small>Lv.' + lv + ' / ' + u.max + '</small></b><div class="muted small">' + esc(u.desc) + '</div><div class="pips">' + pips + '</div></div>' +
        '<button class="btn ' + (maxed ? 'ghost' : 'primary') + '" data-action="buy-upgrade" data-arg="' + u.id + '"' + (maxed || m.gems < cost ? ' disabled' : '') + '>' + (maxed ? 'MAX' : '💎 ' + num(cost)) + '</button></div>';
    }).join('');
    var owned = Object.keys(m.roster).map(BL.cardById).filter(Boolean).sort(function (a, b) { return D.RARITY_ORDER.indexOf(effRar(a)) - D.RARITY_ORDER.indexOf(effRar(b)); });
    var starRows = owned.map(function (c) {
      var own = m.roster[c.id]; var su = BL.starUpCost(state, c.id);
      return '<tr><td style="color:' + rc(effRar(c)) + '">' + rarLabel(c) + '</td><td><b>' + esc(D.CHARACTERS[c.char].name) + '</b> 【' + esc(c.title) + '】<small class="muted"> 元 ' + stars(c.rar) + '</small></td><td>' + (own.tier || 0) + ' / ' + P.STARUP_MAX + '</td>' +
        '<td>' + (su ? '<button class="btn gold sm" data-action="star-up" data-arg="' + c.id + '"' + ((m.pieces || 0) < su.cost ? ' disabled' : '') + '>→ ' + stars(su.rar) + '（🧩 ' + num(su.cost) + '）</button>' : '<span class="muted">上限</span>') + '</td></tr>';
    }).join('');
    var mast = Object.keys(m.mastery || {}).filter(function (id) { return m.mastery[id] > 0 && D.CHARACTERS[id]; }).sort(function (a, b) { return m.mastery[b] - m.mastery[a]; }).map(function (id) {
      var xp = m.mastery[id]; var lv = BL.masteryLvOf(xp); var next = D.MASTERY_TH[lv + 1];
      return '<tr><td><b>' + esc(D.CHARACTERS[id].name) + '</b></td><td>Lv.' + lv + '</td><td>' + xp + (next ? ' / ' + next : ' (MAX)') + '</td><td class="muted">成長 +' + lv + '% ／ 初期値 +' + lv + '%</td></tr>';
    }).join('');
    return '<div class="notice"><b>永続強化（エゴ強化）</b><span class="muted small">Ego Gems で購入し、以後のすべての RUN に適用される（開始時に反映）。費用は Lv ごとに増加。</span><span class="gems">💎 <b>' + num(m.gems) + '</b></span></div><div class="upgs">' + rows + '</div>' +
      '<h4 class="sect">星上げ <small class="muted">エゴ・ピースでカードの段階を上げる（1 枚につき最大 +' + P.STARUP_MAX + '、★8 まで）。初期値・成長補正が上の段階の基準値になる。所持 🧩 ' + num(m.pieces || 0) + '</small></h4>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>現在</th><th>カード</th><th>星上げ</th><th>次の段階</th></tr></thead><tbody>' + starRows + '</tbody></table></div>' +
      '<h4 class="sect">熟練度 <small class="muted">キャラごとの累積 XP（編を卒業 +' + P.MASTERY_XP_PART + '、決戦制覇 +' + P.MASTERY_XP_FINAL + '）。Lv ごとに成長補正 +1%・初期値 +1%。同キャラの全カードに適用。</small></h4>' +
      (mast ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>キャラ</th><th>Lv</th><th>XP</th><th>効果</th></tr></thead><tbody>' + mast + '</tbody></table></div>' : '<div class="muted small">まだ熟練度を持つキャラはいない。編を卒業すると加算される。</div>');
  }
  function renderDex() {
    var cards = BL.CARDS.filter(function (c) { return ui.rosterFilter === 'all' || c.rar === ui.rosterFilter; });
    var owned = cards.filter(function (c) { return !!state.meta.roster[c.id]; }).length;
    var rows = cards.map(function (c) {
      var own = state.meta.roster[c.id]; var ch = D.CHARACTERS[c.char];
      return '<tr class="' + (own ? 'have' : 'nohave') + '" data-action="card-detail" data-arg="' + c.id + '"><td style="color:' + rc(c.rar) + '">' + stars(c.rar) + (c.flow ? ' F' : '') + '</td><td><b>' + esc(ch.name) + '</b> 【' + esc(c.title) + '】' + (c.origin === 'mod' ? ' <small class="muted">改変版</small>' : '') + '</td><td>' + typeIcon(c.type) + esc(c.type) + '</td><td>' + esc(c.pos.join('/')) + '</td><td>' + (own ? '所持' + (own.dupes ? ' +' + own.dupes : '') + (own.tier ? ' ★+' + own.tier : '') : '—') + '</td></tr>';
    }).join('');
    var np = Object.keys(state.meta.portraits || {}).length; var nf = BL.PORTRAITS ? Object.keys(BL.PORTRAITS).length : 0;
    return '<div class="muted small">図鑑 ' + owned + ' / ' + cards.length + ' 枚（' + Object.keys(D.CHARACTERS).length + ' キャラ）。行をクリックで詳細。</div>' +
      '<div class="notice"><b>画像パック一括取り込み</b><span class="muted small">ファイル名をキャラID（例 isagi.png）またはキャラ名（例 潔世一.jpg）にした画像をまとめて選択すると、各キャラのポートレートとして端末内に保存する（端末保存 ' + np + ' キャラ／同梱フォルダ ' + nf + ' キャラ）。開発版では <code>assets/portraits/</code> に置いた画像を <code>node tools/build_portraits.js</code> で取り込める。</span><label class="btn ghost sm"><input type="file" accept="image/*" multiple data-portrait-bulk="1" hidden>画像を選択</label><button class="btn ghost sm" data-action="open-naming">キャラID一覧</button></div>' +
      rarityFilterBar(ui.rosterFilter, 'roster-filter') +
      '<table class="tbl dex"><thead><tr><th>レア</th><th>カード</th><th>タイプ</th><th>ポジション</th><th>所持</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function renderNamingList() {
    var rows = Object.keys(D.CHARACTERS).map(function (id) { return '<tr><td><code>' + id + '</code></td><td>' + esc(D.CHARACTERS[id].name) + '</td><td>' + (portraitOf(id) ? '設定済み' : '—') + '</td></tr>'; }).join('');
    return '<div class="modal-head"><h2>キャラID一覧（画像ファイル名用）</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><p class="muted small">ファイル名（拡張子を除く）が ID またはキャラ名と一致する画像を取り込む。1枚 60KB・合計 3MB まで（端末内で 160×200 に縮小）。</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>キャラ</th><th>画像</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function renderExchange() {
    var pieces = state.meta.pieces || 0;
    var cards = BL.CARDS.filter(function (c) { return ui.rosterFilter === 'all' || c.rar === ui.rosterFilter; });
    var rows = cards.map(function (c) {
      var own = state.meta.roster[c.id]; var cost = D.PIECES.cost[c.rar];
      return '<tr><td style="color:' + rc(c.rar) + '">' + stars(c.rar) + '</td><td><b>' + esc(D.CHARACTERS[c.char].name) + '</b> 【' + esc(c.title) + '】</td><td>' + (own ? '所持 +' + own.dupes : '未所持') + '</td><td class="num">🧩 ' + cost + '</td><td><button class="btn primary sm" data-action="exchange" data-arg="' + c.id + '"' + (pieces < cost ? ' disabled' : '') + '>交換</button></td></tr>';
    }).join('');
    return '<div class="modal-head"><h2>ピース交換所 <small class="muted">🧩 ' + num(pieces) + '</small></h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<p class="muted small">限界突破時に段階別ピース（★1 2 … ★8 150）、卒業で 10×編番号、除籍で 3×編番号 を獲得。交換コストは ★1 30 / ★2 50 / ★3 90 / ★4 200 / ★5 400 / ★6 800 / ★7 1,600 / ★8 3,200。未所持なら新規、所持済みなら限界突破。星上げは「強化」タブ。</p>' +
      rarityFilterBar(ui.rosterFilter, 'exchange-filter') + '<div class="tbl-wrap"><table class="tbl"><tbody>' + rows + '</tbody></table></div>';
  }
  function renderCardDetail() {
    var card = BL.cardById(ui.modal.cardId); if (!card) return '';
    var c = D.CHARACTERS[card.char]; var own = state.meta.roster[card.id]; var prof = own ? BL.profileFor(state, card) : BL.cardProfile(card, 0);
    var rows = D.STATS.map(function (s) { return '<tr><td style="color:' + D.STAT_META[s].color + '"><b>' + s + '</b> ' + D.STAT_META[s].jp + '</td><td>' + num(prof.stats[s]) + '</td><td>×' + prof.growth[s].toFixed(2) + '</td></tr>'; }).join('');
    var others = BL.CARDS.filter(function (x) { return x.char === card.char && x.id !== card.id; }).map(function (x) { return '<span class="tag" style="border-color:' + rc(x.rar) + '">' + stars(x.rar) + ' ' + esc(x.title) + (state.meta.roster[x.id] ? ' ✓' : '') + '</span>'; }).join(' ');
    var hasPortrait = !!(state.meta.portraits || {})[card.char];
    var posOpt = D.POS_AFFINITY[card.pos[0]]; var er = effRar(card); var mlv = BL.masteryLv(state, card.char); var su = own ? BL.starUpCost(state, card.id) : null;
    var pairs = D.CHEMISTRY.filter(function (p) { return p.a === card.char || p.b === card.char; }).map(function (p) { var o = p.a === card.char ? p.b : p.a; return '<span class="tag">' + esc(D.CHARACTERS[o].name) + '：' + esc(p.name) + '</span>'; }).join(' ');
    return '<div class="modal-head"><h2 style="color:' + rc(er) + '">' + rarLabel(card) + ' ' + esc(c.name) + '【' + esc(card.title) + '】' + cardBadge(card) + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<div class="detail-grid"><div class="detail-art">' + art(card, 160) +
      '<div class="portrait-ctl"><label class="btn ghost sm"><input type="file" accept="image/*" data-portrait="' + card.char + '" hidden>画像を設定</label>' + (hasPortrait ? '<button class="btn ghost sm" data-action="portrait-remove" data-arg="' + card.char + '">画像を削除</button>' : '') + '</div>' +
      '<p class="muted tiny">原作画像は同梱していない。利用者が権利を持つ画像を端末内（localStorage）または assets/portraits/ フォルダから読み込み、このキャラの全カードに表示する。</p></div><div class="detail-body">' +
      '<p class="muted">' + esc(D.RARITY[er].name) + '（' + esc(D.RARITY[er].tier) + '）' + (own && own.tier ? '<br>星上げ +' + own.tier + '（元 ' + stars(card.rar) + '）' : '') + '<br>' + typeIcon(card.type) + ' ' + esc(card.type) + 'タイプ（' + esc(D.TYPE_MAP[card.type].desc) + '） / ' + esc(card.pos.join(' / ')) + (posOpt ? '（ポジション適性：Option ' + posOpt + ' +' + P.POS_BONUS + '%）' : '') + (card.stage ? ' / 段階：' + esc(card.stage) : '') + (card.pwc ? ' / PWC ' + esc(card.pwc === '4FLOW' ? '★4 FLOW' : '★' + card.pwc) + ' 由来' : ' / 改変版オリジナル') + (card.flow ? ' / FLOW 突入率 +15%・FLOW ボーナス +5pt' : '') + '</p>' +
      '<table class="tbl"><thead><tr><th>能力</th><th>初期値</th><th>成長補正</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="passive big"><b>固有エゴ：' + esc(c.passive.name) + '</b><br>' + esc(c.passive.desc) + '</div>' +
      '<div class="passive big"><b>固有覚醒スキル：' + esc(c.sig.name) + '</b><br>' + esc(c.sig.desc) + '（主属性 ' + D.TYPE_MAP[card.type].stat + ' が ' + P.SIG_TH + ' 以上で Climax 成功、または FLOW 成功で覚醒）</div>' +
      (pairs ? '<div class="muted small">化学反応ペア：' + pairs + '</div>' : '') +
      (own ? '<p class="muted">限界突破 +' + own.dupes + '（初期値 +' + Math.round(own.dupes * P.LB_STEP * 100) + '% / 成長 +' + Math.round(own.dupes * P.LB_GROWTH * 100) + '%）' + (mlv ? ' ／ 熟練度 Lv.' + mlv + '（成長 +' + mlv + '% / 初期値 +' + mlv + '%）' : '') + '</p>' : '<p class="muted">未所持</p>') +
      (others ? '<div class="muted small">同キャラの他カード：' + others + '</div>' : '') +
      '</div></div>' + (own && !state.run && !state.wc ? '<div class="modal-foot center">' + (su ? '<button class="btn gold" data-action="star-up" data-arg="' + card.id + '"' + ((state.meta.pieces || 0) < su.cost ? ' disabled' : '') + '>星上げ → ' + stars(su.rar) + '（🧩 ' + num(su.cost) + '）</button>' : '') + '<button class="btn primary" data-action="pick-card" data-arg="' + card.id + '">第一編を開始</button></div>' : '');
  }
  function renderAdvisorPick() {
    var pk = ui.pick; if (!pk) return '';
    var title = pk.kind === 'final' ? '決戦メンバー 5 人（' + pk.gradIds.map(function (id) { var g = BL.gradById(state, id); return g ? D.CHARACTERS[g.charId].name : ''; }).join('・') + '）' : BL.cardName(BL.cardById(pk.cardId));
    var list = D.ADVISORS.map(function (a) {
      var ok = BL.advisorUnlocked(state, a); var ach = a.unlock ? D.ACHIEVEMENTS.filter(function (x) { return x.id === a.unlock; })[0] : null;
      return '<button class="btn choice adv' + (ok ? '' : ' locked') + '" data-action="choose-advisor" data-arg="' + a.id + '"' + (ok ? '' : ' disabled') + '><span>' + esc(a.name) + ' <small>【' + esc(a.card) + '】</small></span><small>' + (ok ? esc(a.desc) : '🔒 解放条件：実績「' + esc(ach ? ach.name : '') + '」') + '</small></button>';
    }).join('');
    return '<div class="modal-head"><h2>アドバイザーを選択</h2><button class="btn ghost sm" data-action="close-modal">戻る</button></div>' +
      '<p class="muted">' + esc(title) + ' の' + (pk.kind === 'grad' ? esc(ARCS[pk.arc].part) + '（' + esc(ARCS[pk.arc].title) + '）' : pk.kind === 'final' ? '決戦' : '第一編') + 'に同行するアドバイザーを 1 名選ぶ。' + (pk.kind === 'final' ? '選択と同時に RUN が開始される。' : '次に相棒を選ぶ。') + ' 難易度：<b>' + esc(D.DIFFICULTIES[state.meta.difficulty || 'normal'].name) + '</b>（ロビー右上で変更。RUN 開始時に確定）</p><div class="choices">' + list + '</div>';
  }
  function renderPartnerPick() {
    var pk = ui.pick; if (!pk) return ''; var card = BL.cardById(pk.cardId);
    var owned = Object.keys(state.meta.roster).map(BL.cardById).filter(function (c) { return c && c.char !== card.char; });
    var items = owned.map(function (c) { var ch = BL.chemistryFor(state, card.char, c.id); return { c: c, ch: ch }; })
      .sort(function (a, b) { return (b.ch && b.ch.pair ? 1 : 0) - (a.ch && a.ch.pair ? 1 : 0) || Number(effRar(b.c)) - Number(effRar(a.c)); });
    var list = items.map(function (it) {
      var c = it.c, ch = it.ch; var main = D.TYPE_MAP[c.type].stat;
      return '<button class="btn choice partner' + (ch && ch.pair ? ' pair' : '') + '" data-action="choose-partner" data-arg="' + c.id + '"><span class="pt-art">' + art(c, 56) + '</span><span>' + esc(BL.cardName(c)) + ' <small>' + rarLabel(c) + '</small></span><small>' + main + ' 成長 +' + Math.round(ch.fx.growth[main] * 1000) / 10 + '%' + (ch.pair ? ' ／ <b class="hl">化学反応「' + esc(ch.name) + '」</b>：' + esc(describeFx(ch.pairFx)) + '＋専用イベント' : '') + '</small></button>';
    }).join('');
    return '<div class="modal-head"><h2>相棒を選択</h2><button class="btn ghost sm" data-action="close-modal">戻る</button></div>' +
      '<p class="muted">' + esc(BL.cardName(card)) + ' と一緒に練習する相棒を所持カードから 1 枚選ぶ（PWC のサポート枠に対応）。相棒の主属性の成長が上がり、原作ペアなら化学反応イベントが解放される。相棒は育成されない。</p>' +
      '<div class="choices"><button class="btn choice" data-action="choose-partner" data-arg="none"><span>相棒なし</span><small>単独で育成する</small></button>' + list + '</div>';
  }
  function describeFx(fx) {
    if (!fx) return ''; var out = [];
    if (fx.growth) for (var s in fx.growth) out.push(s + ' 成長 +' + Math.round(fx.growth[s] * 100) + '%');
    if (fx.opt) for (var k in fx.opt) out.push('Option ' + k + ' +' + fx.opt[k] + '%');
    if (fx.all) out.push('全選択肢 +' + fx.all + '%');
    if (fx.cashMult) out.push('Cash ×' + fx.cashMult);
    return out.join('・');
  }

  function renderGacha() {
    var m = state.meta;
    var rateRows = D.RARITY_ORDER.map(function (r) {
      var n = BL.CARDS.filter(function (c) { return c.rar === r; }).length;
      var names = BL.CARDS.filter(function (c) { return c.rar === r; }).map(function (c) { return D.CHARACTERS[c.char].name; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 6).join('、');
      return '<tr><td style="color:' + rc(r) + '">' + stars(r) + '</td><td><b>' + esc(D.RARITY[r].name) + '</b><br><small class="muted">' + esc(names) + (n > 6 ? ' ほか' : '') + '</small></td><td class="num">' + D.RARITY[r].rate.toFixed(1) + '%</td><td class="muted">' + n + ' 枚</td></tr>';
    }).join('');
    return '<div class="gacha-panel"><div class="gacha-cta"><div><div class="muted">所持 Ego Gems</div><div class="big-num">💎 ' + num(m.gems) + '</div></div>' +
      '<div class="gacha-btns"><button class="btn primary" data-action="gacha" data-arg="1"' + (m.gems < P.GACHA_SINGLE ? ' disabled' : '') + '>単発スカウト<small>' + P.GACHA_SINGLE + ' Gems</small></button>' +
      '<button class="btn gold" data-action="gacha" data-arg="10"' + (m.gems < P.GACHA_TEN ? ' disabled' : '') + '>10連スカウト<small>' + P.GACHA_TEN + ' Gems</small></button></div></div>' +
      '<p class="muted small">天井・確定枠は存在しない。8段階の提供割合は仕様書どおり（0.2 / 0.8 / 2 / 5 / 12 / 25 / 30 / 25%）。所持済みカードの再排出は限界突破に加えて<b>エゴ・ピース</b>を付与し、ピースは交換所（任意カード）と星上げに使える。Ego Gems は「強化」タブの永続強化とも競合する。</p>' +
      '<div class="exchange-cta"><span>🧩 所持ピース <b>' + num(m.pieces || 0) + '</b></span><button class="btn gold sm" data-action="open-exchange">ピース交換所</button></div>' +
      '<table class="tbl"><thead><tr><th>レア</th><th>クラス</th><th>提供割合</th><th>収録</th></tr></thead><tbody>' + rateRows + '</tbody></table></div>';
  }
  function renderGachaResult() {
    var res = ui.modal.results.map(function (r, i) {
      return '<div class="pull' + (D.RARITY[r.rar].stars >= 6 ? ' hi' : '') + '" style="--rc:' + rc(r.rar) + '; animation-delay:' + (i * 90) + 'ms" data-action="card-detail" data-arg="' + r.id + '"><div class="pull-art">' + art(BL.cardById(r.id), 96) + '</div><div class="pull-r">' + stars(r.rar) + (r.flow ? ' F' : '') + '</div><div class="pull-t">' + (r.isNew ? '<b class="new">NEW</b>' : '限界突破 +' + r.dupes + (r.pieces ? ' 🧩+' + r.pieces : '')) + '</div></div>';
    }).join('');
    var costN = ui.modal.n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE;
    return '<div class="modal-head"><h2>スカウト結果</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="pulls">' + res + '</div>' +
      '<div class="modal-foot"><span class="muted">残り 💎 ' + num(state.meta.gems) + '</span><button class="btn primary" data-action="gacha" data-arg="' + ui.modal.n + '"' + (state.meta.gems < costN ? ' disabled' : '') + '>もう一度（' + costN + '）</button></div>';
  }

  function renderHof() {
    var hof = state.meta.hof;
    if (!hof.length) return '<div class="notice">殿堂入り選手はまだいない。第五編・決戦（U-20ワールドカップ）を決勝 3対0 の完全勝利で制した決戦メンバー 5 人がここに刻まれ、FIFAワールドカップ（成人A代表・世界決戦モード）への出撃権を得る。</div>';
    var list = hof.slice().reverse().map(function (e) {
      var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(e.stats[s]) + '</span>'; }).join('');
      var wc = e.wc || { status: 'none' };
      var wcLabel = wc.status === 'none' ? '<span class="tag">W杯 未出撃</span>' : wc.status === 'inprogress' ? '<span class="tag warn">W杯 出撃中</span>' :
                    wc.status === 'champion' ? '<span class="tag gold">🏆 FIFA W杯 優勝</span>' : '<span class="tag danger">W杯 ' + esc(D.WORLD_CUP.stages[Math.min(wc.stage, D.WORLD_CUP.stages.length - 1)].name) + ' 敗退</span>';
      var btn = wc.status === 'none' ? '<button class="btn gold" data-action="wc-start" data-arg="' + e.id + '"' + (state.wc || state.run ? ' disabled' : '') + '>FIFAワールドカップに出撃（一発勝負）</button>' :
                wc.status === 'inprogress' ? '<button class="btn primary" data-action="wc-resume">W杯を再開</button>' : '';
      var hc = BL.cardById(e.cardId);
      return '<article class="card hof-card char-card" style="--rc:' + rc(e.rar) + '">' + (hc ? '<div class="card-art">' + art(hc, 120) + '</div>' : '') + '<div class="card-body"><div class="card-top"><div class="rarity">' + stars(e.rar) + (e.tier ? '<small class="tierup">+' + e.tier + '</small>' : '') + '</div>' + wcLabel + '</div>' +
        '<h3>' + esc(e.name) + '<small>' + new Date(e.clearedAt).toLocaleDateString('ja-JP') + ' 世界一達成 / アドバイザー ' + esc((BL.advisorById(e.advisorId) || {}).name || '') + (e.club ? ' / ' + esc(BL.clubById(e.club).name) : '') + (e.squad ? '<br>決戦メンバー：' + esc(e.squad.join('・')) : '') + '</small></h3>' +
        '<div class="stat-line">' + st + '<span class="st total"><i>合計</i>' + num(BL.sumStats(e.stats)) + '</span></div>' +
        '<div class="muted">最終年俸 ' + yen(e.bid) + ' / スキル ' + (BL.skillCount(e.skills) + (e.sig || 0)) + ' / ゴール ' + e.totals.goals + '</div><div class="card-actions">' + btn + '</div></div></article>';
    }).join('');
    return '<div class="notice">FIFAワールドカップは殿堂入り選手ごとに<b>一度きり</b>の挑戦。4回の Climax で3勝以上（2-2 の引き分けは即時敗北）を4連戦。決勝はノエル・ノア率いるフランス代表。敗退した選手は再挑戦できない。</div><div class="grid">' + list + '</div>';
  }
  function renderAchievements() {
    var rows = D.ACHIEVEMENTS.map(function (a) { var u = state.meta.achievements[a.id]; return '<li class="' + (u ? 'ok' : 'pending') + '"><span><b>' + esc(a.name) + '</b><br><small class="muted">' + esc(a.desc) + '</small></span><b>' + (u ? '達成 +' + a.gems : '💎 ' + a.gems) + '</b></li>'; }).join('');
    var n = Object.keys(state.meta.achievements).length;
    return '<div class="muted small">実績 ' + n + ' / ' + D.ACHIEVEMENTS.length + '。達成で Ego Gems を獲得し、一部はアドバイザーを解放する。</div><ul class="req-list big">' + rows + '</ul>';
  }
  function renderRecords() {
    var r = state.meta.records;
    var hist = state.meta.history.map(function (h) { return '<tr><td>#' + h.runNo + '</td><td style="color:' + rc(h.rar) + '">' + esc(h.card) + '</td><td>' + (h.cleared ? '🏆 世界一' : h.graduated ? esc(ARCS[h.arc].part) + ' 卒業' : esc(ARCS[h.arc].part) + ' ' + esc(h.arcTitle) + ' で除籍') + '</td><td>' + num(h.total) + '</td><td>' + yen(h.bid) + '</td><td>' + h.rank + '位' + (h.partRanks && h.partRanks.length ? ' / ' + h.partRanks.join('') : '') + '</td></tr>'; }).join('');
    return '<div class="records"><div class="kpis">' +
      '<div class="kpi"><i>周回数</i><b>' + r.runs + '</b></div><div class="kpi"><i>卒業</i><b>' + (r.grads || 0) + '</b></div><div class="kpi"><i>除籍回数</i><b>' + r.eliminations + '</b></div><div class="kpi"><i>決戦出撃</i><b>' + (r.finals || 0) + '</b></div><div class="kpi"><i>世界一達成</i><b>' + r.clears + '</b></div>' +
      '<div class="kpi"><i>最高到達</i><b>' + (r.bestArc >= 0 ? esc(ARCS[r.bestArc].part) + ' 突破' : '—') + '</b></div><div class="kpi"><i>BLランキング最高</i><b>' + r.bestRank + '位</b></div><div class="kpi"><i>最高年俸</i><b>' + yen(r.bestBid) + '</b></div>' +
      '<div class="kpi"><i>最高合計ステータス</i><b>' + num(r.bestTotal) + '</b></div><div class="kpi"><i>スカウト回数</i><b>' + r.gachaPulls + '</b></div><div class="kpi"><i>FIFA W杯 優勝</i><b>' + r.wcTitles + '</b></div></div>' +
      '<button class="btn ghost" data-action="open-rules">ルール・仕様を読む</button>' +
      '<div class="notice"><b>バックアップ</b><span class="muted small">セーブ（カード・卒業生・強化・殿堂・進行中の RUN を含む全データ）と画像パック（端末保存のポートレート）を JSON で書き出し／読み込み。インポートは現在のデータを完全に上書きする。</span>' +
      '<button class="btn ghost sm" data-action="open-export" data-arg="save">セーブを書き出す</button><label class="btn ghost sm"><input type="file" accept="application/json,.json" data-import-save="1" hidden>セーブを読み込む</label>' +
      '<button class="btn ghost sm" data-action="open-export" data-arg="portraits">画像パックを書き出す</button><label class="btn ghost sm"><input type="file" accept="application/json,.json" data-import-portraits="1" hidden>画像パックを読み込む</label></div>' +
      (hist ? '<h4 class="sect">RUN 履歴</h4><table class="tbl"><thead><tr><th>#</th><th>カード</th><th>結果</th><th>合計</th><th>年俸</th><th>順位</th></tr></thead><tbody>' + hist + '</tbody></table>' : '') + '</div>';
  }
  function renderRules() {
    var arcRows = ARCS.map(function (a) {
      var segs = a.segments.map(function (s) { return esc(s.name) + '（' + s.weeks + '週' + (s.match.rule === 'single' ? '・単発' : '') + '）'; }).join(' → ');
      var cut = []; if (a.cut.statReq) cut.push('合計 ' + a.cut.statReq); if (a.cut.leagueWins) cut.push('リーグ ' + a.cut.leagueWins + ' 勝'); if (a.cut.finalMustWin) cut.push('最終戦勝利'); if (a.cut.bidReq) cut.push('年俸 ' + yen(a.cut.bidReq));
      return '<tr><td>' + esc(a.part) + ' ' + esc(a.title) + '</td><td>' + segs + '</td><td>' + (cut.join(' / ') || '—') + '</td></tr>';
    }).join('');
    return '<div class="modal-head"><h2>ルール</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="rules">' +
      '<h4>進行（編ごとに 1 回の育成）</h4><ul><li>第一編は所持カードから開始。編末の査定を生き残ると「卒業」し、育成済み選手として保存される。第二〜四編は前の編の卒業生だけが挑め、能力・スキル・年俸・Cash を引き継ぐ。除籍された卒業生は抹消される。</li>' +
      '<li>第五編・決戦は第四編を卒業した 5 人で挑む。練習は 5 人同時、Climax は局面ごとに起用選手を選ぶ。同じ選手の起用は ' + P.FINAL_USES + ' 回まで（永続強化「決戦の采配」で増加）。故障者が出て 3 人未満になれば敗退。決戦の敗退では卒業生を失わない。</li>' +
      '<li>練習・休養は1クリックで即座に1週を消費。確認ダイアログは無い。すべての行動はクリックした瞬間に LocalStorage へ上書き保存され、リロードしてもやり直しは不可能。</li></ul>' +
      '<h4>肉体健全度とコンディション</h4><ul><li>練習でHP約15%消費、休養で+40%。HP50%以上：万全／30〜49%：疲労（効率50%）／30%未満：危険水域（効率35%、練習強行で40%の確率で靭帯断裂＝即除籍）。</li>' +
      '<li>コンディション（絶好調 ×1.15 / 好調 ×1.05 / 普通 / 不調 ×0.85・HP消費+2）は練習で下がりやすく休養で上がりやすい。</li></ul>' +
      '<h4>成長</h4><ul><li>獲得量 = (基礎値×編環境倍率 + 現在値×複利率) × (1 + 0.05×所持スキル数) × 成長補正 × 限界突破 × HP効率 × コンディション。上限なし。</li><li>化学反応練習：毎週ランダムに 1 属性が指定され、その練習の主獲得量が ×' + P.HOT_MULT + '。</li>' +
      '<li>相棒：所持カードを 1 枚同行させると、その主属性の成長が上がる。原作ペア（' + D.CHEMISTRY.length + ' 組）なら追加補正と専用の化学反応イベント。</li></ul>' +
      '<h4>永続強化</h4><ul><li>エゴ強化（Ego Gems・' + D.UPGRADES.length + ' 種）は以後のすべての RUN に適用。星上げ（ピース）はカードの段階を最大 +' + P.STARUP_MAX + '。熟練度はキャラごとに卒業で加算され、成長と初期値を +1%／Lv。</li></ul>' +
      '<h4>レアリティ（8段階）</h4><ul>' + D.RARITY_ORDER.map(function (r) { return '<li><b style="color:' + rc(r) + '">' + D.RARITY[r].label + ' ' + esc(D.RARITY[r].name) + '</b>（' + D.RARITY[r].rate + '%）：' + esc(D.RARITY[r].tier) + '</li>'; }).join('') + '<li>PWC の各カードは「キャラの原作の格 (floor, peak)」と「PWC でのレアリティ（★1→floor … ★5→peak）」で内挿して割り当て。★4FLOW 由来は FLOW 突入率 +15%・ボーナス +5pt。</li></ul>' +
      '<h4>試合（Climax）</h4><ul><li>成功率 = 対応2ステータス合計 ÷ 敵レート の比率 r をシグモイド変換（r=1 で 50%）。r &lt; 0.7 は補正を無視して 0%（完全ゼロの壁）。</li>' +
      '<li>スキル・固有エゴ・アドバイザー・クラブ・アナライズノートは失敗率を割合で削る乗算補正。FLOW は +20pt 加算（最良選択肢が 25〜40% の局面で 25% で突入、成功時スキル確定覚醒）。</li>' +
      '<li>試合の Climax の成功率上限は ' + P.P_CAP + '%（入寮テスト・100ゴールなどの単発試練は除く）。運による最低保証が無いのと同様に、確定成功も無い。</li>' +
      '<li>失敗はカウンターで失点。勝利必須の試合では勝利条件が数学的に不可能になった瞬間にコールド負け。同点は即時敗北。</li>' +
      '<li>試合ルール：単発（失敗＝除籍）／リーグ（編末判定）／勝利必須／二次選考3rd（敗北で蜂楽を奪われ2対2へ）／二次選考4th（敗北でも INT または2得点で凛の指名）／新英雄大戦（年俸判定）／グループ（3戦2勝）／決勝（3対0のみ）。</li></ul>' +
      '<h4>編構成</h4><table class="tbl"><thead><tr><th>編</th><th>節</th><th>編末足切り</th></tr></thead><tbody>' + arcRows + '</tbody></table>' +
      '<h4>ローグライト</h4><ul><li>編を卒業で Ego Gems +500 とピース、世界一でさらに +2000。除籍時は編番号×300 の補償（絵心アドバイザー・永続強化で増加）。実績でもジェムとアドバイザーを獲得。</li>' +
      '<li>同一カードの再排出は限界突破（初期値+5%・成長+3%）として周回を跨いで蓄積。卒業生以外の新規 RUN へのステータス持ち越しは無い。</li></ul></div>';
  }

  /* ------------------------------------------------------------ run */
  function renderRun() {
    var run = state.run;
    switch (run.phase) {
      case 'arcIntro': return renderArcIntro();
      case 'policySelect': return renderPolicySelect();
      case 'clubSelect': return renderClubSelect();
      case 'storyChoice': return renderStoryChoice();
      case 'training': case 'event': return BL.isFinal(run) ? renderTrainingFinal() : renderTraining();
      case 'match': return renderMatch(run.match, runMatchCtx());
      case 'matchResult': return (run.match && run.match.showResult) ? renderMatch(run.match, runMatchCtx()) : renderMatchResult();
      case 'evaluation': return renderEvaluation();
      case 'graduated': return renderGraduated();
      case 'gameover': return renderGameover();
      case 'clear': return renderClear();
    }
    return '';
  }
  function runMatchCtx() {
    var run = state.run; var arc = BL.arcOf(run); var m = run.match;
    return { kind: 'run', title: arc.part + ' ' + arc.title, sub: m.name, enemy: m.enemy, lead: m.lead, highlights: m.highlights, intro: m.intro,
             needText: ruleText(m), charName: BL.isFinal(run) ? 'BL.JAPAN' : charOfRun(run).name, canon: m.canon, card: BL.cardById(run.cardId), final: BL.isFinal(run) };
  }
  function ruleText(m) {
    switch (m.rule) {
      case 'single': return '単発の試練：失敗すればその場で脱落';
      case 'league': return '総当たり：試合単位の除籍なし（編末に2勝以上＆最終戦勝利を判定）' + (m.final ? ' — 最終戦は勝利必須' : '');
      case 'mustWin': return m.n + '回の Climax で ' + (Math.floor(m.n / 2) + 1) + ' 勝以上（勝利必須・不可能になれば即打ち切り）';
      case 'tryout': return '5点先取トライアウト：勝利必須（23人枠）';
      case 'stage3_rin': return '敗北しても除籍ではない——蜂楽を奪われ、潔と凪の2人で2対2へ';
      case 'stage4_rin': return '敗北時は「凛の指名」判定：INT ' + m.nominateInt + ' 以上 または 2得点以上で生存';
      case 'nel': return '入札戦：試合単位の除籍なし。ゴール数と勝利が年俸（入札）に直結';
      case 'group': return 'グループリーグ：3試合で2勝以上（不可能になった瞬間に敗退）';
      case 'perfect': return '3回すべての Climax に勝利する「3対0の完全勝利」のみ世界一';
    }
    return '';
  }

  function rivalHero(charId, size, kicker) {
    var rival = charId ? BL.rivalCard(charId) : null; if (!rival) return '';
    return '<div class="run-hero rival-hero" style="--rc:' + rc(rival.rar) + '"><div class="rh-art" data-action="card-detail" data-arg="' + rival.id + '">' + art(rival, size || 110) + '</div><div class="rh-meta"><i>' + esc(kicker || '次の相手') + '</i><b>' + esc(D.CHARACTERS[rival.char].name) + '</b><small>' + esc(D.CHARACTERS[rival.char].tag) + '</small></div></div>';
  }
  function renderStoryChoice() {
    var run = state.run; var cc = BL.currentChoice(run); if (!cc) return ''; var arc = BL.arcOf(run); var seg = cc.seg; var ch = cc.choice;
    var opts = ch.options.map(function (o, i) {
      var gam = o.fx && o.fx.roll ? '<em class="risk">成功率 ' + Math.round(o.fx.roll.p * 100) + '% のギャンブル</em>' : '';
      var dep = o.fx && o.fx.ifFlag ? '<em class="dep">過去の選択（' + esc(o.fx.ifFlag.flag) + '）で効果が変わる' + (run.flags[o.fx.ifFlag.flag] ? '：条件を満たしている' : '：条件を満たしていない') + '</em>' : '';
      return '<button class="btn choice story-opt" data-action="choose-story" data-arg="' + i + '"><span>' + (i + 1) + '. ' + esc(o.label) + '</span><small>' + esc(o.desc || '') + ' ' + gam + dep + '</small></button>';
    }).join('');
    return '<section class="screen story choice"><div class="story-kicker">' + esc(arc.part) + ' ' + esc(arc.title) + ' — ' + esc(seg.name) + '</div><h2 class="story-title">' + esc(ch.title) + '<small>分岐：選択は即時保存され、この編の残り（場合によっては次の編）に影響する。</small></h2>' +
      '<div class="choice-stage">' + runHero(run, 110) + (seg.match && seg.match.rival ? '<div class="vs-mark">VS</div>' + rivalHero(seg.match.rival, 110, '次の相手：' + (seg.match.enemy || '')) : '') + '</div>' +
      '<div class="story-body"><p>' + esc(ch.text) + '</p></div><div class="choices">' + opts + '</div>' +
      '<p class="hint">選択履歴は卒業生に引き継がれ、殿堂・戦績に記録される。キー 1〜3 でも選択可。</p></section>';
  }
  function renderChoiceResult() {
    var r = ui.modal.result;
    return '<div class="event choice"><div class="ev-kicker">分岐 — ' + esc(r.title) + '</div><h2>' + esc(r.label) + '</h2><p class="ev-text ' + (r.rollWin === false ? 'bad' : '') + '">' + esc(r.text) + '</p>' +
      (r.effects.length ? '<div class="ev-fx">' + r.effects.map(function (e) { return '<span class="tag">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + '<div class="modal-foot"><button class="btn primary" data-action="close-choice">続ける</button></div></div>';
  }
  function renderExport() {
    var kind = ui.modal.kind; var text = kind === 'portraits' ? BL.exportPortraits(state) : BL.exportSave(state);
    var fname = kind === 'portraits' ? 'bluelock_portraits.json' : 'bluelock_save.json';
    var href = 'data:application/json;charset=utf-8,' + encodeURIComponent(text);
    return '<div class="modal-head"><h2>' + (kind === 'portraits' ? '画像パックのエクスポート' : 'セーブデータのエクスポート') + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<p class="muted small">下のテキストを保存するか、ダウンロードする（' + Math.round(text.length / 1024) + ' KB）。別の端末・ブラウザで「インポート」すると復元できる。Artifact 表示ではダウンロードが無効化されるため、テキストをコピーして保存すること。</p>' +
      '<textarea class="summary-box" readonly onfocus="this.select()">' + esc(text) + '</textarea>' +
      '<div class="modal-foot"><a class="btn ghost" href="' + href + '" download="' + fname + '">ダウンロード</a><button class="btn primary" data-action="copy-text" data-arg="' + kind + '">コピー</button></div>';
  }
  function renderArcIntro() {
    var run = state.run; var arc = BL.arcOf(run);
    var paras = arc.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var segs = arc.segments.filter(function (s) { return !s.cond; }).map(function (s) { var rv = s.match.rival ? BL.rivalCard(s.match.rival) : null; return '<li class="with-rival">' + (rv ? '<span class="seg-rival">' + art(rv, 44) + '</span>' : '') + '<span><b>' + esc(s.name) + (s.choice ? ' <em class="tag">分岐</em>' : '') + '</b><small>' + (s.weeks ? '公式戦まで ' + s.weeks + ' 週' : '即時') + ' — ' + esc(s.match.canon || '') + '</small></span></li>'; }).join('');
    return '<section class="screen story"><div class="story-kicker">' + esc(arc.part) + ' — PART ' + arc.n + ' / ' + ARCS.length + '</div><h2 class="story-title">' + esc(arc.title) + '<small>' + esc(arc.sub) + '</small></h2>' + runHero(run, 120) +
      '<div class="story-body">' + paras + '</div><div class="panel"><h4>この編の節</h4><ul class="seg-list">' + segs + '</ul></div>' +
      '<div class="modal-foot center"><button class="btn primary lg" data-action="story-next">育成方針を選ぶ</button></div></section>';
  }
  function renderPolicySelect() {
    var run = state.run; var arc = BL.arcOf(run);
    var list = D.POLICIES.map(function (p) { return '<button class="btn choice" data-action="choose-policy" data-arg="' + p.id + '"><span>' + esc(p.name) + '</span><small>' + esc(p.desc) + '</small></button>'; }).join('');
    return '<section class="screen story"><div class="story-kicker">' + esc(arc.part) + '</div><h2 class="story-title">育成方針を選択<small>この編の練習に適用される成長補正。編ごとに選び直す。' + (BL.isFinal(run) ? '決戦メンバー全員に適用される。' : '') + '</small></h2>' + runHero(run, 110) + '<div class="choices">' + list + '</div></section>';
  }
  function renderClubSelect() {
    var list = D.NEL_CLUBS.map(function (c) {
      return '<button class="btn choice club" data-action="choose-club" data-arg="' + c.id + '"><span>' + c.flag + ' ' + esc(c.name) + '（' + esc(c.country) + '）<small>マスター：' + esc(c.master) + (c.stars !== c.master ? ' / 看板：' + esc(c.stars) : '') + '</small></span>' +
        '<small class="hl">' + esc(c.passive.desc) + '</small><small>青い監獄組：' + esc(c.bl) + '</small><small class="muted">' + esc(c.canon) + '</small></button>';
    }).join('');
    return '<section class="screen story"><div class="story-kicker">NEO EGOIST LEAGUE</div><h2 class="story-title">所属クラブを選択<small>マスターの指導効果と対戦順が変わる。選択は不可逆。</small></h2><div class="choices">' + list + '</div></section>';
  }

  function hpClass(hp) { return hp >= 50 ? 'ok' : (hp >= 30 ? 'tired' : 'danger'); }
  function hpLabel(hp) { return hp >= 50 ? '万全' : (hp >= 30 ? '疲労（効率50%）' : '危険水域（効率35%・故障率' + Math.round(BL.injuryChance(state.run) * 100) + '%）'); }
  function reqPanel(run, arc, total) {
    var cut = arc.cut || {}; var reqs = [];
    if (cut.statReq) reqs.push({ label: '合計ステータス ' + num(cut.statReq), ok: total >= cut.statReq, cur: num(total) });
    if (cut.leagueWins) reqs.push({ label: 'リーグ ' + cut.leagueWins + ' 勝以上', ok: run.arcState.wins >= cut.leagueWins ? true : null, cur: run.arcState.wins + '勝' + run.arcState.losses + '敗' });
    if (cut.finalMustWin) reqs.push({ label: '最終戦 vs チームV 勝利', ok: null, cur: '試合で判定' });
    if (cut.bidReq) reqs.push({ label: '年俸 ' + yen(cut.bidReq) + ' 以上', ok: run.bid >= cut.bidReq, cur: yen(run.bid) });
    if (arc.id === 'wc') reqs.push({ label: 'グループ 2勝以上', ok: run.arcState.wins >= 2 ? true : null, cur: run.arcState.wins + '勝' + run.arcState.losses + '敗' });
    var reqHtml = reqs.map(function (r) { return '<li class="' + (r.ok === null ? 'pending' : (r.ok ? 'ok' : 'ng')) + '"><span>' + r.label + '</span><b>' + r.cur + '</b></li>'; }).join('');
    return '<div class="panel reqs"><h4>編末の足切り条件</h4><ul class="req-list">' + (reqHtml || '<li class="pending"><span>この編の足切りは試合結果のみ</span><b>—</b></li>') + '</ul></div>';
  }
  function nextMatchPanel(mdef, preview) {
    var optPrev = preview.map(function (o) { return '<div class="opt-prev' + (o.wall ? ' wall' : '') + '"><b>' + o.key + '</b><span class="bar"><i style="width:' + Math.round(o.p) + '%;background:' + (D.OPTIONS[o.key] || { color: '#fff' }).color + '"></i></span><em>' + (o.wall ? '0%（壁）' : pct(o.p)) + '</em><small>' + o.stats.join('+') + ' ' + num(o.power) + '/' + num(o.rate) + '</small></div>'; }).join('');
    var rv = mdef.rival ? BL.rivalCard(mdef.rival) : null;
    return '<div class="panel next-match"><div class="nm-head">' + (rv ? '<span class="nm-rival" data-action="card-detail" data-arg="' + rv.id + '">' + art(rv, 72) + '</span>' : '') + '<div><h4>次の試合：' + esc(mdef.enemy) + '</h4><div class="muted">' + esc(mdef.lead) + '</div><div class="muted small">' + esc(ruleText(mdef)) + '</div></div></div>' +
      '<div class="opt-prevs">' + optPrev + '</div><div class="muted small">原作：' + esc(mdef.canon || '') + '</div></div>';
  }
  function trainHeader(run, arc, seg, mdef) {
    return '<header class="chapter-head' + (run.weeksLeft <= 1 ? ' urgent' : '') + '">' +
      '<div class="ch-title">' + esc(arc.part) + ' ' + esc(arc.title) + ' — ' + esc(seg.name) + '</div><div class="weeks">公式戦まで <b>あと ' + run.weeksLeft + ' 週</b></div><div class="ch-sub">' + esc(mdef.name) + (run.policy ? ' ／ 方針：' + esc(policyName(run.policy)) : '') + (run.difficulty === 'hell' ? ' ／ <span class="hell-tag">🔥 地獄</span>' : '') + '</div>' +
      '<div class="head-btns"><button class="btn ghost sm" data-action="open-story">ストーリー</button><button class="btn ghost sm" data-action="to-lobby">ロビー</button></div></header>';
  }
  function cmdRow(run) {
    return '<div class="cmd-row three"><button class="btn auto" data-action="auto-train"><span>おまかせ練習</span><small>次の試合に最適な属性（' + BL.recommendStat(run) + '）</small></button><button class="btn rest" data-action="rest"><span>休養</span><small>1週消費・HP +' + (P.REST_HEAL + BL.playerMods(BL.isFinal(run) ? BL.playerView(run, run.captain || 0) : run).restBonus) + '%</small></button><button class="btn store" data-action="open-store"><span>購買部</span><small>週消費なし・Cash ' + cash(run.cash) + '</small></button></div>' +
      '<p class="hint">練習：HP 約' + BL.expectedHpCost(run) + '% 消費。HP30%未満で練習を強行すると ' + Math.round(BL.injuryChance(run) * 100) + '% の確率で選手生命が終了する。ショートカット：1〜5 練習 / R 休養 / S 購買部</p>';
  }

  function renderTraining() {
    var run = state.run; var arc = BL.arcOf(run); var seg = BL.segOf(run); var card = BL.cardById(run.cardId); var c = charOfRun(run);
    var mdef = BL.currentMatchDef(run); var preview = BL.previewOptions(run); var gains = BL.previewGain(run, null);
    var total = BL.sumStats(run.stats); var agg = BL.aggregateSkills(run); var cond = D.CONDITIONS[run.cond];
    var flash = ui.flash; ui.flash = null;
    var statRows = D.STATS.map(function (s) {
      var g = BL.previewGain(run, s)[s];
      var pop = (flash && flash.gains && flash.gains[s]) ? '<span class="gain-pop' + (flash.stat === s ? ' main' : '') + '">+' + flash.gains[s] + '</span>' : '';
      var hot = (s === run.hot);
      return '<div class="stat-row' + (hot ? ' hot' : '') + '" style="--c:' + D.STAT_META[s].color + '"><div class="stat-name"><b>' + s + '</b><i>' + D.STAT_META[s].en + '</i>' + (hot ? '<em class="hotlbl">化学反応 ×' + P.HOT_MULT + '</em>' : '') + '</div><div class="stat-val">' + num(run.stats[s]) + pop + '</div>' +
        '<button class="btn train" data-action="train" data-arg="' + s + '"><span>' + D.STAT_META[s].jp + '練習' + (hot ? ' ⚡' : '') + '</span><small>主 +' + g + ' / 副 +' + gains[s] + '</small></button></div>';
    }).join('');
    var sigHtml = run.sig ? '<span class="chip sig" style="--c:' + D.STAT_META[D.TYPE_MAP[card.type].stat].color + '">★ ' + esc(c.sig.name) + '<b>Lv.' + run.sig + '</b></span>' : '';
    var logHtml = run.log.slice(-6).reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
    var adv = BL.advisorById(run.advisorId); var club = run.club ? BL.clubById(run.club) : null;
    var partner = run.partnerId ? BL.cardById(run.partnerId) : null; var chem = partner ? BL.chemistryFor(state, run.charId, run.partnerId) : null;
    return '<section class="screen training">' + trainHeader(run, arc, seg, mdef) +
      '<div class="train-grid"><div class="col"><div class="panel player">' +
      '<div class="player-name" style="--rc:' + rc(effRar(card)) + '"><span class="thumb" data-action="card-detail" data-arg="' + card.id + '">' + art(card, 84) + '</span><span class="rarity">' + rarLabel(card) + '</span><b>' + esc(c.name) + '</b><span class="muted">【' + esc(card.title) + '】' + typeIcon(card.type) + '</span><small>' + esc(c.passive.name) + '：' + esc(c.passive.desc) + ' ／ アドバイザー ' + esc(adv.name) + '：' + esc(adv.desc) + (club ? ' ／ ' + esc(club.passive.desc) : '') + '</small>' +
      (partner ? '<small class="partner-line"><span class="pt-mini">' + art(partner, 28) + '</span>相棒 ' + esc(BL.cardName(partner)) + '：' + chem.main + ' 成長 +' + Math.round(chem.fx.growth[chem.main] * 1000) / 10 + '%' + (chem.pair ? ' ／ 化学反応「' + esc(chem.name) + '」' + esc(describeFx(chem.pairFx)) : '') + '</small>' : '') + '</div>' +
      '<div class="hp ' + hpClass(run.hp) + '"><div class="hp-label"><span>肉体健全度 HP</span><b>' + run.hp + '%</b><em>' + hpLabel(run.hp) + '</em></div><div class="hp-bar"><i style="width:' + run.hp + '%"></i></div></div>' +
      '<div class="money"><span class="cond" style="color:' + cond.color + '">' + cond.icon + ' ' + cond.label + '</span><span>BLランク <b>' + (run.rank || 300) + '位</b></span><span>年俸 <b>' + yen(run.bid) + '</b></span><span>Cash <b>' + cash(run.cash) + '</b></span><span>💎 <b>' + num(state.meta.gems) + '</b></span></div>' +
      (run.protein || run.note ? '<div class="buffs">' + (run.protein ? '<span class="tag gold">🥤 次回練習×2</span>' : '') + (run.note ? '<span class="tag gold">📓 次試合 +10%</span>' : '') + '</div>' : '') + '</div>' +
      '<div class="panel stats">' + statRows + '<div class="stat-total">合計 <b>' + num(total) + '</b> <small>スキル乗数 ×' + (1 + P.SKILL_STEP * agg.count).toFixed(2) + ' / 環境倍率 ×' + arc.envMult + ' / HP効率 ×' + BL.hpEfficiency(run.hp) + ' / コンディション ×' + cond.mult + '</small></div></div>' +
      cmdRow(run) + '</div>' +
      '<div class="col">' + nextMatchPanel(mdef, preview) + reqPanel(run, arc, total) +
      '<div class="panel skills"><h4>覚醒スキル <small>' + agg.count + ' 個</small> <button class="btn ghost sm" data-action="open-skills">一覧</button></h4>' + sigHtml + (skillChips(run.skills) || (run.sig ? '' : '<div class="muted">なし（Climax 成功時に該当ステータスが閾値を超えていれば覚醒）</div>')) + '</div>' +
      '<div class="panel log"><h4>ログ</h4><ul>' + logHtml + '</ul></div></div></div></section>';
  }
  /** 決戦：5 人同時練習 */
  function renderTrainingFinal() {
    var run = state.run; var arc = BL.arcOf(run); var seg = BL.segOf(run);
    var mdef = BL.currentMatchDef(run); var cond = D.CONDITIONS[run.cond]; var cap = BL.usesCap(run);
    var flash = ui.flash; ui.flash = null;
    var rows = run.players.map(function (p, i) {
      var card = BL.cardById(p.cardId); var v = BL.playerView(run, i); var opts = BL.previewOptionsFor(run, i); var best = opts[0]; opts.forEach(function (o) { if (o.p > best.p) best = o; });
      var pop = (flash && flash.per) ? flash.per.filter(function (x) { return x.i === i; })[0] : null;
      return '<div class="sq-row' + (p.injured ? ' injured' : '') + (i === run.captain ? ' captain' : '') + '" style="--rc:' + rc(effRar(card)) + '"><span class="thumb" data-action="card-detail" data-arg="' + card.id + '">' + art(card, 64) + '</span>' +
        '<div class="sq-body"><b>' + esc(D.CHARACTERS[p.charId].name) + '</b><small>' + rarLabel(card) + ' ' + typeIcon(card.type) + ' 合計 ' + num(BL.sumStats(p.stats)) + ' ／ スキル ' + BL.aggregateSkills(v).count + ' ／ 起用 ' + p.uses + '/' + cap + (pop && pop.gains ? ' <em class="gain-pop main">+' + (pop.gains[flash.stat] || 0) + '</em>' : '') + (pop && pop.injured ? ' <em class="danger">故障</em>' : '') + '</small>' +
        '<div class="hp mini ' + hpClass(p.hp) + '"><div class="hp-bar"><i style="width:' + p.hp + '%"></i></div><b>' + (p.injured ? '故障' : 'HP ' + p.hp + '% ' + D.CONDITIONS[p.cond].icon) + '</b></div></div>' +
        '<div class="sq-best">' + (best ? '<b style="color:' + (D.OPTIONS[best.key] || {}).color + '">' + best.key + ' ' + (best.wall ? '0%' : pct(best.p)) + '</b><small>次戦 最良</small>' : '') + '</div></div>';
    }).join('');
    var statRows = D.STATS.map(function (s) {
      var g = BL.previewGain(run, s)[s]; var hot = (s === run.hot);
      return '<div class="stat-row' + (hot ? ' hot' : '') + '" style="--c:' + D.STAT_META[s].color + '"><div class="stat-name"><b>' + s + '</b><i>' + D.STAT_META[s].en + '</i>' + (hot ? '<em class="hotlbl">化学反応 ×' + P.HOT_MULT + '</em>' : '') + '</div><div class="stat-val">' + num(run.stats[s]) + '<small class="muted"> 平均</small></div>' +
        '<button class="btn train" data-action="train" data-arg="' + s + '"><span>' + D.STAT_META[s].jp + '練習' + (hot ? ' ⚡' : '') + '</span><small>全員 ／ 代表 +' + g + '</small></button></div>';
    }).join('');
    var logHtml = run.log.slice(-6).reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
    var adv = BL.advisorById(run.advisorId);
    return '<section class="screen training final">' + trainHeader(run, arc, seg, mdef) +
      '<div class="train-grid"><div class="col"><div class="panel squad"><h4>決戦メンバー <small>アドバイザー ' + esc(adv.name) + ' ／ 起用上限 ' + cap + ' 回／人 ／ 健全 ' + BL.healthyCount(run) + '/' + run.players.length + '</small></h4>' + rows +
      '<div class="money"><span class="cond" style="color:' + cond.color + '">' + cond.icon + ' 代表 ' + cond.label + '</span><span>BLランク <b>' + (run.rank || 300) + '位</b></span><span>年俸 <b>' + yen(run.bid) + '</b></span><span>Cash <b>' + cash(run.cash) + '</b></span></div>' +
      (run.protein || run.note ? '<div class="buffs">' + (run.protein ? '<span class="tag gold">🥤 次回練習×2</span>' : '') + (run.note ? '<span class="tag gold">📓 次試合 +10%</span>' : '') + '</div>' : '') + '</div>' +
      '<div class="panel stats">' + statRows + '<div class="stat-total">平均合計 <b>' + num(BL.sumStats(run.stats)) + '</b> <small>練習は 5 人同時に行われ、各自の成長補正・HP で獲得量が決まる。休養・カプセルも全員に効く。</small></div></div>' +
      cmdRow(run) + '</div>' +
      '<div class="col">' + nextMatchPanel(mdef, BL.previewOptions(run)) + reqPanel(run, arc, BL.sumStats(run.stats)) +
      '<div class="panel log"><h4>ログ</h4><ul>' + logHtml + '</ul></div></div></div></section>';
  }
  function skillChips(skills) {
    var ids = Object.keys(skills || {}).filter(function (id) { return skills[id] > 0; });
    ids.sort(function (a, b) { var sa = BL.skillById(a), sb = BL.skillById(b); return sb.tier - sa.tier || sa.family.localeCompare(sb.family); });
    return ids.map(function (id) { var sk = BL.skillById(id); return '<span class="chip" style="--c:' + D.STAT_META[sk.family].color + '" title="' + esc(sk.desc) + '">' + esc(sk.name) + '<b>Lv.' + skills[id] + '</b></span>'; }).join('');
  }
  function renderSkillList() {
    var player = state.wc ? BL.hofById(state, state.wc.hofId) : state.run; var skills = player ? player.skills : {};
    var body = ['SHT', 'SPD', 'TEC', 'INT', 'PHY'].map(function (f) {
      var rows = D.SKILLS.filter(function (s) { return s.family === f; }).map(function (s) { var lv = skills[s.id] || 0; return '<tr class="' + (lv ? 'have' : '') + '"><td>T' + s.tier + '</td><td><b>' + esc(s.name) + '</b></td><td>' + f + ' ≥ ' + s.th + '</td><td>' + esc(s.desc) + '</td><td>' + (lv ? 'Lv.' + lv : '—') + '</td></tr>'; }).join('');
      return '<h4 style="color:' + D.STAT_META[f].color + '">' + esc(D.FAMILY_JP[f]) + '</h4><table class="tbl"><tbody>' + rows + '</tbody></table>';
    }).join('');
    return '<div class="modal-head"><h2>スキル一覧</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><p class="muted">Climax 成功時、選択肢に対応する系統のうち閾値を満たした最上位スキルが覚醒（同スキル所持時の重複は35%、FLOW 成功時は確定）。所持数が増えるほど練習獲得倍率が上昇する。' + (state.run && BL.isFinal(state.run) ? '決戦ではキャプテンのスキルを表示。' : '') + '</p>' + body;
  }
  function renderStoryModal() {
    var run = state.run; var arc = BL.arcOf(run); var mdef = BL.currentMatchDef(run);
    return '<div class="modal-head"><h2>' + esc(arc.part) + ' ' + esc(arc.title) + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="story-body small">' + arc.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      (mdef ? '<div class="passive big"><b>次の試合：' + esc(mdef.name) + '</b><br>' + esc(mdef.intro || '') + '<br><small class="muted">' + esc(mdef.canon || '') + '</small></div>' : '');
  }
  function renderStore() {
    var run = state.run;
    var items = D.ITEMS.map(function (it) {
      var price = BL.itemPrice(it, run);
      var why = run.cash < price ? 'Cash 不足' : (it.id === 'capsule' && run.hp >= 100) ? 'HP は既に100%' : ((it.id === 'protein' && run.protein) || (it.id === 'note' && run.note)) ? '適用済み（買いだめ不可）' : '';
      return '<div class="item"><div class="item-icon">' + it.icon + '</div><div class="item-body"><b>' + esc(it.name) + '</b><div class="muted">' + esc(it.desc) + (BL.isFinal(run) && it.id === 'capsule' ? '（決戦メンバー全員）' : '') + '</div></div><button class="btn primary" data-action="buy" data-arg="' + it.id + '"' + (why ? ' disabled' : '') + '>' + cash(price) + '<small>' + (why || '即時適用') + '</small></button></div>';
    }).join('');
    return '<div class="modal-head"><h2>購買部</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="muted">所持 Cash <b>' + cash(run.cash) + '</b> ／ 価格は編番号に比例。購入と同時に即時消費され、週は消費しない。</div><div class="items">' + items + '</div>';
  }
  function renderEventModal() {
    var run = state.run; var m = ui.modal;
    if (m.result) {
      var r = m.result;
      return '<div class="event' + (r.pair ? ' pair' : '') + '"><div class="ev-kicker">' + (r.pair ? '化学反応イベント — 原作ペア' : '突発化学反応イベント') + '</div><h2>' + esc(r.title) + '</h2><div class="ev-choice">▶ ' + esc(r.label) + '</div><p class="ev-text ' + (r.rollWin === false ? 'bad' : '') + '">' + esc(r.text) + '</p>' +
        (r.effects.length ? '<div class="ev-fx">' + r.effects.map(function (e) { return '<span class="tag">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + '<div class="modal-foot"><button class="btn primary" data-action="close-event">続ける</button></div></div>';
    }
    var ev = BL.eventById(run.event.id);
    var choices = ev.choices.map(function (ch, i) { return '<button class="btn choice" data-action="event-choice" data-arg="' + i + '"><span>' + esc(ch.label) + '</span>' + (ch.fx.roll ? '<small class="risk">成功率 ' + Math.round(ch.fx.roll.p * 100) + '% のギャンブル</small>' : '') + '</button>'; }).join('');
    return '<div class="event' + (ev.pair ? ' pair' : '') + '"><div class="ev-kicker">' + (ev.pair ? '化学反応イベント — 原作ペア' : '突発化学反応イベント') + ' — 即断せよ（選択と同時に保存）</div><h2>' + esc(ev.title) + '</h2><p class="ev-text">' + esc(ev.text) + '</p><div class="choices">' + choices + '</div></div>';
  }

  /* ------------------------------------------------------------ match */
  function renderMatch(m, ctx) {
    var dots = ''; for (var i = 0; i < m.n; i++) { var r = m.results[i]; dots += '<span class="dot' + (r ? (r.success ? ' win' : ' lose') : (i === m.idx && !m.ended ? ' now' : '')) + '"></span>'; }
    var body = (m.showResult && m.lastResult) ? renderClimaxResult(m, ctx) : (m.current ? (m.current.players ? renderClimaxFinal(m, ctx) : renderClimax(m, ctx)) : '');
    var flow = (m.current && !m.showResult && (m.current.flow || (m.current.players && m.current.players.some(function (pe) { return pe.flow && pe.avail; }))));
    var meArt = ctx.final ? '<span class="thumb">' + BL.ART.emblem('JPN', '#2f80ff', 48) + '</span>' : (ctx.card ? '<span class="thumb">' + art(ctx.card, 48) + '</span>' : '');
    var rivalCard = m.rival ? BL.rivalCard(m.rival) : null;
    var enArt = rivalCard ? '<span class="thumb rival">' + art(rivalCard, 48) + '</span>' : '<span class="thumb">' + BL.ART.emblem(ctx.enemy.replace(/^[^ ]+ /, ''), '#ff2a4a', 48) + '</span>';
    return '<section class="screen match' + (flow ? ' in-flow' : '') + '"><header class="match-head"><div class="mh-title">' + esc(ctx.title) + '<small>' + esc(ctx.sub) + '</small></div>' +
      '<div class="score"><div class="side me">' + meArt + '<i>' + esc(ctx.charName) + '</i><b>' + m.me + '</b></div><div class="vs">-</div><div class="side en"><b>' + m.en + '</b><i>' + esc(ctx.enemy) + '</i>' + enArt + '</div></div>' +
      '<div class="dots">' + dots + '</div><div class="need">' + esc(ctx.needText) + '</div></header>' + body + '</section>';
  }
  function optionButton(o, actionName, extraAttr) {
    var color = (D.OPTIONS[o.key] || { color: '#fff' }).color;
    var bd = o.breakdown.map(function (b) { return '<span>' + esc(b.label) + ' +' + b.v + '</span>'; }).join('');
    return '<button class="btn climax' + (o.wall ? ' wall' : '') + (o.key === 'D' ? ' meta' : '') + '" style="--oc:' + color + '" data-action="' + actionName + '" data-arg="' + o.key + '"' + (extraAttr || '') + '><div class="cl-key">' + o.key + '</div>' +
      '<div class="cl-body"><b>' + esc(o.name) + '</b><small>' + esc(o.flavor) + '</small><div class="cl-calc">' + o.stats.join('+') + ' ' + num(o.power) + ' vs 敵レート ' + num(o.rate) + ' （比率 ' + o.ratio.toFixed(2) + '）' + (bd ? '<span class="bd">' + bd + '</span>' : '') + '</div></div>' +
      '<div class="cl-pct' + (o.p >= 70 ? ' hi' : (o.p >= 40 ? ' mid' : ' lo')) + '">' + (o.wall ? '<b>0%</b><small>完全ゼロの壁</small>' : '<b>' + o.pct + '%</b><small>成功率</small>') + '</div></button>';
  }
  function renderClimax(m, ctx) {
    var cur = m.current; var hl = ctx.highlights[Math.min(m.idx, ctx.highlights.length - 1)];
    var opts = cur.options.map(function (o) { return optionButton(o, ctx.kind === 'wc' ? 'wc-climax' : 'climax'); }).join('');
    return '<div class="climax-wrap">' + (m.idx === 0 && ctx.intro ? '<div class="match-intro">' + esc(ctx.intro) + '</div>' : '') +
      (cur.flow ? '<div class="flow-banner">FLOW — 覚醒。全選択肢 +20pt / 成功時スキル確定覚醒</div>' : '') +
      '<div class="highlight">' + rivalStrip(m, ctx) + '<div><span class="hl-kicker">Climax ' + (m.idx + 1) + ' / ' + m.n + '</span><p>' + esc(hl) + '</p></div></div><div class="climax-opts">' + opts + '</div>' +
      '<p class="hint">選択した瞬間に判定・保存される。運による最低保証は無い。キー A/B/C/D でも選択可。</p></div>';
  }
  /** 決戦：起用選手 × 選択肢 */
  function renderClimaxFinal(m, ctx) {
    var run = state.run; var cur = m.current; var hl = ctx.highlights[Math.min(m.idx, ctx.highlights.length - 1)];
    var rows = cur.players.map(function (pe) {
      var p = run.players[pe.i]; var card = BL.cardById(p.cardId);
      var opts = pe.avail ? pe.options.map(function (o) { return '<button class="btn climax mini' + (o.wall ? ' wall' : '') + (o.key === 'D' ? ' meta' : '') + '" style="--oc:' + (D.OPTIONS[o.key] || {}).color + '" data-action="climax" data-arg="' + o.key + '" data-player="' + pe.i + '" title="' + esc(o.name) + ' ' + o.stats.join('+') + ' ' + num(o.power) + '/' + num(o.rate) + '"><b>' + o.key + '</b><span>' + (o.wall ? '0%' : o.pct + '%') + '</span></button>'; }).join('') :
                 '<span class="muted small">' + (pe.injured ? '故障で起用不可' : '起用上限（' + pe.uses + '/' + pe.cap + '）') + '</span>';
      return '<div class="sq-climax' + (pe.avail ? '' : ' unavail') + (pe.flow ? ' flow' : '') + '" style="--rc:' + rc(effRar(card)) + '"><span class="thumb">' + art(card, 64) + '</span><div class="sq-body"><b>' + esc(D.CHARACTERS[p.charId].name) + (pe.flow && pe.avail ? ' <em class="flow-tag">FLOW</em>' : '') + '</b><small>' + rarLabel(card) + ' 起用 ' + pe.uses + '/' + pe.cap + ' ／ HP ' + pe.hp + '%</small></div><div class="sq-opts">' + opts + '</div></div>';
    }).join('');
    return '<div class="climax-wrap">' + (m.idx === 0 && ctx.intro ? '<div class="match-intro">' + esc(ctx.intro) + '</div>' : '') +
      (cur.players.some(function (pe) { return pe.flow && pe.avail; }) ? '<div class="flow-banner">FLOW — 覚醒した選手がいる。その選手の全選択肢 +20pt / 成功時スキル確定覚醒</div>' : '') +
      '<div class="highlight">' + rivalStrip(m, ctx) + '<div><span class="hl-kicker">Climax ' + (m.idx + 1) + ' / ' + m.n + ' — 起用する選手と選択肢を選べ</span><p>' + esc(hl) + '</p></div></div><div class="squad-climax">' + rows + '</div>' +
      '<p class="hint">選択した瞬間に判定・保存される。同じ選手は決戦を通じて ' + BL.usesCap(run) + ' 回まで起用できる（全 18 局面）。</p></div>';
  }
  function rivalStrip(m, ctx) {
    var rv = m.rival ? BL.rivalCard(m.rival) : null; if (!rv) return '';
    return '<div class="rival-strip" style="--rc:' + rc(rv.rar) + '"><span class="thumb">' + art(rv, 72) + '</span><div><i>対戦相手</i><b>' + esc(D.CHARACTERS[rv.char].name) + '</b><small>' + esc(ctx.lead || '') + '</small></div></div>';
  }
  function renderClimaxResult(m, ctx) {
    var r = m.lastResult;
    var text = r.success ? (r.flow ? '世界がスローモーションになる。全ての選択肢が見えた——ゴォォォル！！' : ['DFを置き去りにしてゴールネットを揺らす——ゴォォォル！！', 'GKの逆を突いた。完璧なフィニッシュ——ゴール！', '軌道は読めない。ボールはゴールへ吸い込まれた——ゴール！'][r.idx % 3]) :
      ['ボールロスト——カウンターを浴び、失点。', '読まれていた。ボールを奪われ、一瞬で失点。', 'シュートは枠を外れ、カウンターから失点。'][r.idx % 3];
    if (m.rule === 'single') text = r.success ? '——切り抜けた。' : '——届かなかった。';
    var endInfo = '';
    if (m.ended) { if (m.cold) endInfo = '<div class="cold">コールド負け — 勝利条件の達成が数学的に不可能。試合は打ち切られた。</div>'; else if (m.draw) endInfo = '<div class="cold">同点 — 延長戦なし。即時敗北。</div>'; else endInfo = '<div class="end ' + (m.won ? 'won' : 'lost') + '">試合終了 ' + m.me + ' - ' + m.en + ' ' + (m.won ? '勝利' : '敗北') + '</div>'; }
    var cutCard = r.cardId ? BL.cardById(r.cardId) : ctx.card;
    var cut = (r.success && cutCard) ? '<div class="cutin"><div class="cutin-lines"></div><div class="burst"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="cutin-art">' + art(cutCard, 150) + '</div></div>' : '';
    var who = r.playerName ? '<div class="res-who">' + esc(r.playerName) + '</div>' : '';
    var skill = r.skill ? '<div class="awaken" style="--c:' + D.STAT_META[r.skill.family].color + '"><i>スキル覚醒</i><b>' + esc(r.skill.name) + ' Lv.' + r.skill.lv + '</b><small>' + esc(r.skill.desc) + '</small></div>' : '';
    var sig = r.sig ? '<div class="awaken sigaw" style="--c:' + D.STAT_META[r.sig.family].color + '"><i>固有エゴ覚醒</i><b>' + esc(r.sig.name) + ' Lv.' + r.sig.lv + '</b><small>' + esc(r.sig.desc) + '</small></div>' : '';
    var nextAction = ctx.kind === 'wc' ? 'wc-next' : 'climax-next';
    var nextLabel = m.ended ? (ctx.kind === 'wc' ? '結果へ' : '試合結果へ') : '次の局面へ';
    return '<div class="result-wrap ' + (r.success ? 'success' : 'fail') + '"><div class="res-kicker">Climax ' + (r.idx + 1) + ' — ' + r.key + ' ' + esc(r.name) + ' (' + r.p + '%)' + (r.flow ? ' [FLOW]' : '') + '</div>' +
      cut + who + '<div class="res-big">' + (r.success ? (m.rule === 'single' ? 'CLEAR' : 'GOAL') : 'LOST') + '</div>' + (m.rule !== 'single' ? pitchSvg(r.success, r.key) : '') + '<p class="res-text">' + esc(text) + '</p>' + skill + sig + endInfo +
      '<div class="modal-foot center"><button class="btn primary lg" data-action="' + nextAction + '">' + nextLabel + '</button></div></div>';
  }
  /** 局面の結果を示すミニピッチ（ボール軌道のアニメーション） */
  function pitchSvg(success, key) {
    var col = (D.OPTIONS[key] || { color: '#fff' }).color;
    return '<svg class="pitch ' + (success ? 'goal' : 'miss') + '" viewBox="0 0 320 150" width="320" height="150" aria-hidden="true">' +
      '<rect x="0" y="0" width="320" height="150" rx="10" fill="#0a3d22"/><path d="M0 40 H320 M0 75 H320 M0 110 H320" stroke="#0e4f2c" stroke-width="18"/>' +
      '<rect x="10" y="10" width="300" height="130" fill="none" stroke="#e8edf7" stroke-opacity=".5" stroke-width="2"/><path d="M160 10 V140" stroke="#e8edf7" stroke-opacity=".5" stroke-width="2"/><circle cx="160" cy="75" r="22" fill="none" stroke="#e8edf7" stroke-opacity=".5" stroke-width="2"/>' +
      '<rect x="262" y="40" width="48" height="70" fill="none" stroke="#e8edf7" stroke-opacity=".5" stroke-width="2"/><rect x="300" y="55" width="12" height="40" fill="#ffffff" fill-opacity=".25" stroke="#fff" stroke-width="2" class="net"/>' +
      '<circle cx="70" cy="75" r="9" fill="' + col + '" class="me"/><circle cx="215" cy="' + (success ? 100 : 75) + '" r="9" fill="#ff2a4a" class="df"/><circle cx="292" cy="75" r="9" fill="#ffd166" class="gk"/>' +
      '<circle cx="82" cy="75" r="5" fill="#ffffff" class="ball"/></svg>';
  }
  function renderMatchResult() {
    var run = state.run; var mr = run.matchResult; var arc = BL.arcOf(run);
    var cls = mr.outcome === 'eliminated' ? 'elim' : (mr.won ? 'won' : 'lost');
    var label = { advance: mr.won ? '次へ' : '次へ（試合単位の除籍なし）', branch: '2ndステージへ（2対2）', nominated: '凛の指名で突破 — 次へ', eliminated: '除籍処分を受ける' }[mr.outcome];
    return '<section class="screen evaluation"><header class="eval-head"><div class="ch-title">' + esc(arc.part) + ' ' + esc(arc.title) + '</div><h2 class="mr-name">' + esc(mr.name) + '</h2></header>' +
      '<div class="mr-score ' + cls + '"><b>' + mr.me + ' - ' + mr.en + '</b><span>' + (mr.cold ? 'コールド負け' : mr.draw ? '引き分け＝敗北' : mr.won ? '勝利' : '敗北') + '</span></div>' +
      '<p class="res-text center">' + esc(mr.text || '') + '</p>' + (mr.detail ? '<div class="' + (mr.outcome === 'eliminated' ? 'cold' : 'notice') + '">' + esc(mr.detail) + '</div>' : '') +
      '<div class="eval-grid"><div class="panel bid"><h4>年俸（入札）査定</h4><div class="bid-num" data-count="' + mr.bidTotal + '" data-from="' + (mr.bidTotal - mr.bidGain) + '">' + yen(mr.bidTotal - mr.bidGain) + '</div><div class="muted">今回 +' + yen(mr.bidGain) + '（ゴール ' + mr.goals + ' × 査定倍率 ×' + BL.bidMultiplier(run).toFixed(2) + (mr.wins === mr.n && mr.n > 1 ? ' × MVP1.5' : '') + '）</div>' +
      '<div class="money"><span>Cash 報酬 <b>+' + cash(mr.cashGain) + '</b></span><span>所持 <b>' + cash(mr.cashTotal) + '</b></span><span>BLランキング <b>' + mr.rank + '位</b></span></div></div>' +
      '<div class="panel"><h4>原作では</h4><p class="muted">' + esc(mr.canon || '') + '</p><h4>編内戦績</h4><p class="muted">' + run.arcState.wins + '勝 ' + run.arcState.losses + '敗 / ' + run.arcState.goals + ' ゴール</p></div></div>' +
      '<div class="modal-foot center"><button class="btn ' + (mr.outcome === 'eliminated' ? 'danger' : 'primary') + ' lg" data-action="match-next">' + label + '</button></div></section>';
  }

  /* ------------------------------------------------------------ evaluation / end */
  function renderEvaluation() {
    var run = state.run; var ev = run.evalResult;
    var checks = ev.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'ng') + '"><span>' + esc(c.label) + '</span><b>' + esc(String(c.value)) + '</b></li>'; }).join('');
    var verdict = ev.survived ? '<div class="verdict survive">' + (ev.isFinal ? '世界一達成 — 殿堂入り' : '生存 — 卒業') + '<small>Ego Gems +' + ev.gems + (ev.pieces ? ' ／ 🧩 +' + ev.pieces : '') + '</small></div>' : '<div class="verdict elim">除籍<small>補償 Ego Gems +' + ev.gems + (ev.pieces ? ' ／ 🧩 +' + ev.pieces : '') + '</small></div>';
    return '<section class="screen evaluation"><header class="eval-head"><div class="ch-title">' + esc(ARCS[ev.arc].part) + ' ' + esc(ev.title) + ' — 査定・選別</div><div class="muted">合計ステータス ' + num(ev.total) + ' / 年俸 ' + yen(ev.bid) + ' / BLランキング ' + ev.rank + '位</div></header>' + runHero(run, 120) +
      '<div class="part-rank ' + (ev.partRank || 'D') + '"><i>編評価</i><b>' + esc(ev.partRank || 'D') + '</b><small>合計ステータス ÷ 編基準値で判定（SS ≥ 3.0 / S ≥ 2.2 / A ≥ 1.6 / B ≥ 1.2 / C ≥ 0.9）</small></div>' +
      '<div class="panel"><h4>足切りサバイバル判定</h4><ul class="req-list big">' + checks + '</ul></div>' + verdict +
      '<div class="modal-foot center"><button class="btn ' + (ev.survived ? 'primary' : 'danger') + ' lg" data-action="eval-next">' + (ev.survived ? (ev.isFinal ? '殿堂へ' : '卒業する') : '除籍処分を受ける') + '</button></div></section>';
  }
  function renderGraduated() {
    var run = state.run; var ev = run.evalResult || {}; var arc = BL.arcOf(run); var next = ARCS[run.arc + 1];
    var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(run.stats[s]) + '</span>'; }).join('');
    return '<section class="screen clear grad"><div class="clear-kicker">GRADUATED — ' + esc(arc.part) + '</div><div class="clear-big">卒業</div><div class="go-box">' + runHero(run, 130) +
      '<div class="stat-line">' + st + '</div><div class="muted">編評価 ' + esc(ev.partRank || '') + ' ／ スキル ' + BL.aggregateSkills(run).count + ' ／ 年俸 ' + yen(run.bid) + ' ／ Cash ' + cash(run.cash) + (ev.masteryLv ? ' ／ 熟練度 Lv.' + ev.masteryLv : '') + '</div>' +
      '<p>この選手は「育成済み」に保存された。' + (next ? '次は<b>' + esc(next.part) + '「' + esc(next.title) + '」</b>。ロビーの「育成済み」タブから、能力・スキル・年俸を引き継いで挑める。' : '') + (run.arc + 1 >= LAST ? '第四編を卒業した 5 人が揃えば、決戦メンバーとして U-20 W杯へ出撃できる。' : '') + '</p></div>' +
      '<div class="modal-foot center"><button class="btn ghost" data-action="copy-summary">結果をコピー</button><button class="btn primary lg" data-action="close-run">ロビーへ（育成済み）</button></div></section>';
  }
  function renderGameover() {
    var run = state.run; var g = run.gameover; var card = BL.cardById(run.cardId);
    var reason = { injury: '故障 — 選手生命の終了', cold: 'コールド負け', lost: '敗北', cutoff: '足切り' }[g.reason] || '除籍';
    var lossNote = BL.isFinal(run) ? (run.gradsKept ? '決戦メンバーは卒業生として残る（敗退回数が記録される）。' : '決戦メンバーは全員抹消された。') : (run.gradLost ? 'この卒業生のデータは抹消された。第一編からやり直すしかない。' : '育成データは完全に抹消される。やり直しは存在しない。');
    return '<section class="screen gameover"><div class="go-big">除籍</div><div class="go-sub">ELIMINATED</div><div class="go-box">' + runHero(run, 110) + '<div class="go-reason">' + esc(reason) + '</div><p>' + esc(g.detail) + '</p>' +
      '<div class="muted">' + esc(BL.isFinal(run) ? '決戦メンバー' : BL.cardName(card)) + ' ／ ' + esc(ARCS[g.arc].part) + '「' + esc(ARCS[g.arc].title) + '」で脱落 ／ 合計 ' + num(g.total) + ' ／ スキル ' + g.skills + ' ／ 年俸 ' + yen(g.bid) + ' ／ BLランキング ' + (run.rank || 300) + '位</div>' +
      '<div class="go-gems">補償 Ego Gems <b>+' + g.gems + '</b>' + (g.pieces ? ' ／ 🧩 +' + g.pieces : '') + ' → 所持 ' + num(state.meta.gems) + '</div><p class="muted">' + esc(lossNote) + '</p></div>' +
      '<div class="modal-foot center"><button class="btn ghost" data-action="copy-summary">結果をコピー</button><button class="btn danger lg" data-action="close-run">ロビーへ強制送還</button></div></section>';
  }
  function renderClear() {
    var run = state.run; var card = BL.cardById(run.cardId);
    var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(run.stats[s]) + '</span>'; }).join('');
    var title = BL.isFinal(run) ? '決戦メンバー 5 人 — 全員殿堂入り' : stars(card.rar) + ' ' + esc(BL.cardName(card)) + ' — 殿堂入り';
    return '<section class="screen clear"><div class="clear-kicker">U-20 WORLD CUP CHAMPION</div><div class="clear-big">世界一</div><div class="go-box gold">' + runHero(run, 140) + '<h3>' + title + '</h3><div class="stat-line">' + st + '</div>' +
      '<div class="muted">最終年俸 ' + yen(run.bid) + ' ／ 通算ゴール ' + run.totals.goals + ' ／ ' + run.totals.matchWins + '勝' + (run.totals.matches - run.totals.matchWins) + '敗</div>' +
      '<p>' + (BL.isFinal(run) ? '5 人は殿堂入りとして永続保存され、それぞれメインメニューから「FIFAワールドカップ（成人A代表・世界決戦モード）」へ出撃できる。' : 'この選手は殿堂入りとして永続保存され、メインメニューから「FIFAワールドカップ」へ出撃できる。') + '</p></div><div class="modal-foot center"><button class="btn ghost" data-action="copy-summary">結果をコピー</button><button class="btn gold lg" data-action="close-run">ロビーへ</button></div></section>';
  }

  /* ------------------------------------------------------------ world cup */
  function renderWorldCup() {
    var wc = state.wc; var entry = BL.hofById(state, wc.hofId); var st = D.WORLD_CUP.stages[wc.stage];
    if (wc.phase === 'intro') {
      var player = BL.wcPlayerOf(state); var opts = BL.computeOptions(player, { rate: BL.wcRate(wc.stage) }, {});
      var prev = opts.map(function (o) { return '<div class="opt-prev' + (o.wall ? ' wall' : '') + '"><b>' + o.key + '</b><span class="bar"><i style="width:' + Math.round(o.p) + '%;background:' + D.OPTIONS[o.key].color + '"></i></span><em>' + (o.wall ? '0%（壁）' : pct(o.p)) + '</em><small>' + num(o.power) + '/' + num(o.rate) + '</small></div>'; }).join('');
      return '<section class="screen wc-intro">' + disclaimerBar() + '<div class="wc-kicker">FIFA WORLD CUP — 成人A代表・世界決戦モード</div><h2>' + esc(st.name) + '：' + st.flag + ' ' + esc(st.team) + '</h2><p class="muted">' + esc(st.intro) + '（' + esc(st.star) + '）</p>' +
        '<div class="panel"><h4>' + stars(entry.rar) + ' ' + esc(entry.name) + '</h4><div class="muted">' + skillChips(entry.skills) + '</div><div class="opt-prevs">' + prev + '</div><div class="muted small">4回の Climax で3勝以上。2-2 の同点は延長なしの即時敗北。敗退すればこの選手の挑戦権は永久に失われる。</div></div>' +
        '<div class="modal-foot center"><button class="btn gold lg" data-action="wc-begin">キックオフ</button></div></section>';
    }
    if (wc.phase === 'match' || ((wc.phase === 'stageResult' || wc.phase === 'end') && wc.match && wc.match.showResult)) {
      var ctx = { kind: 'wc', title: 'FIFA W杯 ' + st.name, sub: st.flag + ' ' + st.team, enemy: st.team, lead: st.star, highlights: D.WORLD_CUP.highlights, intro: st.intro, needText: ruleText(wc.match), charName: entry.name, card: BL.cardById(entry.cardId) };
      return renderMatch(wc.match, ctx);
    }
    if (wc.phase === 'stageResult') { var last = wc.results[wc.results.length - 1]; return '<section class="screen wc-intro"><div class="wc-kicker">FIFA WORLD CUP</div><h2>' + esc(last.stage) + ' 勝利！ ' + last.me + ' - ' + last.en + '</h2><p class="muted">' + esc(last.team) + ' を撃破。次のステージへ進む。</p><div class="modal-foot center"><button class="btn gold lg" data-action="wc-stage-next">次のステージへ</button></div></section>'; }
    var res = wc.results.map(function (r) { return '<li class="' + (r.won ? 'ok' : 'ng') + '"><span>' + esc(r.stage) + ' vs ' + esc(r.team) + '</span><b>' + r.me + ' - ' + r.en + '</b></li>'; }).join('');
    return '<section class="screen ' + (wc.champion ? 'clear' : 'gameover') + '">' + (wc.champion ? '<div class="clear-kicker">FIFA WORLD CUP CHAMPION</div><div class="clear-big">真の世界一</div>' : '<div class="go-big">敗退</div><div class="go-sub">ELIMINATED — ' + esc(st.name) + '</div>') +
      '<div class="go-box' + (wc.champion ? ' gold' : '') + '"><h3>' + esc(entry.name) + '</h3><ul class="req-list big">' + res + '</ul>' + (wc.champion ? '<p>Ego Gems +' + P.GEMS_CLEAR_BONUS + '。殿堂に「FIFA W杯優勝」が刻まれた。</p>' : '<p class="muted">この選手のワールドカップ挑戦権は失われた。記録は殿堂に残る。</p>') + '</div>' +
      '<div class="modal-foot center"><button class="btn ' + (wc.champion ? 'gold' : 'danger') + ' lg" data-action="wc-close">ロビーへ</button></div></section>';
  }

  /* ------------------------------------------------------------ effects */
  function blackout(text, ms, cb) {
    var fx = $('#fx'); fx.innerHTML = '<div class="blackout"><div class="blackout-text">' + esc(text) + '</div></div>'; fx.hidden = false; ui.busy = true; sfx('blackout');
    setTimeout(function () { fx.hidden = true; fx.innerHTML = ''; ui.busy = false; if (cb) cb(); }, ms);
  }
  /** 判定演出：メーターが成功率まで伸びて結果が確定する */
  function judge(res, cb) {
    if (!motionOk()) { cb(); return; }
    var fx = $('#fx'); var p = Math.max(0, Math.min(100, res.p || 0));
    fx.innerHTML = '<div class="judge"><div class="judge-box"><div class="judge-kicker">' + (res.playerName ? esc(res.playerName) + ' — ' : '') + 'Climax ' + (res.idx + 1) + '　' + esc(res.name) + '</div><div class="judge-meter"><i style="--p:' + p + '%"></i><em style="left:' + p + '%"></em></div><div class="judge-num" data-p="' + p + '">0%</div></div></div>';
    fx.hidden = false; ui.busy = true;
    var el = fx.querySelector('.judge-num'); var t0 = null; var dur = P.JUDGE_MS || 900;
    function step(ts) { if (t0 === null) t0 = ts; var t = Math.min(1, (ts - t0) / (dur * 0.7)); var e = 1 - Math.pow(1 - t, 2); if (el) el.textContent = Math.round(p * e) + '%'; if (t < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
    setTimeout(function () {
      var box = fx.querySelector('.judge-box'); if (box) box.classList.add(res.success ? 'hit' : 'fail');
      if (!res.success) { document.body.classList.add('shake'); setTimeout(function () { document.body.classList.remove('shake'); }, 450); }
      setTimeout(function () { fx.hidden = true; fx.innerHTML = ''; ui.busy = false; cb(); }, 320);
    }, dur);
  }
  function confetti() {
    if (!motionOk()) return;
    var fx = $('#fx'); var html = '<div class="confetti">'; var colors = ['#ffd166', '#4dd2ff', '#ff4d4d', '#7cff6b', '#c58bff', '#ffffff'];
    for (var i = 0; i < 46; i++) html += '<i style="left:' + Math.round(Math.random() * 100) + '%;background:' + colors[i % colors.length] + ';animation-delay:' + Math.round(Math.random() * 600) + 'ms;animation-duration:' + (2200 + Math.round(Math.random() * 1400)) + 'ms;transform:rotate(' + Math.round(Math.random() * 360) + 'deg)"></i>';
    fx.innerHTML = html + '</div>'; fx.hidden = false;
    setTimeout(function () { if (fx.querySelector('.confetti')) { fx.hidden = true; fx.innerHTML = ''; } }, 3800);
  }
  function countUp() {
    var el = $('.bid-num'); if (!el) return;
    var to = parseFloat(el.getAttribute('data-count')); var from = parseFloat(el.getAttribute('data-from')); var start = null; var dur = 1100;
    function step(ts) { if (start === null) start = ts; var t = Math.min(1, (ts - start) / dur); var e = 1 - Math.pow(1 - t, 3); el.textContent = yen(from + (to - from) * e); if (t < 1) requestAnimationFrame(step); else el.classList.add('done'); }
    requestAnimationFrame(step);
  }
  function afterWeekAction() {
    var run = state.run; if (!run) { render(); return; }
    if (run.phase === 'event') { ui.modal = { type: 'event' }; sfx('event'); render(); return; }
    if (run.phase === 'gameover') { blackout('選手生命、終了。', 1400, function () { sfx('elim'); render(); }); return; }
    if (run.phase === 'match' && run.match && run.match.results.length === 0) { render(); blackout('公式戦 — ' + run.match.enemy, 1500, function () { sfx('whistle'); render(); }); return; }
    render();
  }
  var lastWeekClick = 0;
  function clickGuard() { var now = Date.now(); if (now - lastWeekClick < 180) return false; lastWeekClick = now; return true; }
  function startPicked(partnerId) {
    var pk = ui.pick; if (!pk) return;
    var res = pk.kind === 'final' ? BL.startFinal(state, pk.gradIds, pk.advisorId) : BL.startRun(state, { cardId: pk.cardId, gradId: pk.gradId, advisorId: pk.advisorId, partnerId: partnerId || null });
    if (!res.ok) { toast({ active: '育成中の選手がいる', notowned: '所持していない', advisor: 'アドバイザーが未解放', nograd: '卒業生が見つからない', final: '第四編卒業生は決戦へ', count: '決戦メンバーは5人', part: '第四編を卒業した選手のみ', partner: '相棒を所持していない', partnerSame: '同じキャラは相棒にできない' }[res.reason] || '開始できない', 'warn'); return; }
    var label = pk.kind === 'final' ? 'BL.JAPAN — 決戦メンバー 5 人、出撃' : BL.cardName(BL.cardById(pk.cardId)) + ' — ' + (pk.kind === 'grad' ? ARCS[state.run.arc].part + ' 突入' : '青い監獄 入寮');
    ui.modal = null; ui.inLobby = false; ui.pick = null; render();
    blackout(label, 1300, render);
  }

  /* ------------------------------------------------------------ actions */
  var actions = {
    'title-start': function () { ui.screen = 'game'; ui.inLobby = false; sfx('click'); render(); },
    'lobby-tab': function (arg) { ui.lobbyTab = arg; render(); },
    'roster-filter': function (arg) { ui.rosterFilter = arg; render(); },
    'close-modal': function () { ui.modal = null; render(); },
    'open-rules': function () { ui.modal = { type: 'rules' }; render(); },
    'open-story': function () { ui.modal = { type: 'story' }; render(); },
    'card-detail': function (arg) { ui.modal = { type: 'card', cardId: arg }; render(); },
    'grad-detail': function (arg) { ui.modal = { type: 'grad', gradId: arg }; render(); },
    'open-skills': function () { ui.modal = { type: 'skills' }; render(); },
    'to-lobby': function () { ui.inLobby = true; ui.lobbyTab = 'roster'; render(); },
    'resume-run': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'toggle-sfx': function () { var v = BL.toggleSfx(state); BL.SFX.setEnabled(v); render(); },
    'toggle-difficulty': function () { var next = state.meta.difficulty === 'hell' ? 'normal' : 'hell'; BL.setDifficulty(state, next); sfx(next === 'hell' ? 'rare' : 'click'); toast(next === 'hell' ? '地獄モード：全試合の敵レート ×1.15、卒業・世界一の報酬 ×1.5（次の RUN から）' : '通常モードに戻した', next === 'hell' ? 'warn' : 'ok'); render(); },
    'claim-mission': function (arg) { var res = BL.claimMission(state, arg); if (!res.ok) { toast({ claimed: '受取済', incomplete: '未達成' }[res.reason] || '受け取れない', 'warn'); return; } sfx('ach'); toast('ミッション報酬：' + (res.reward.gems ? '💎 ' + res.reward.gems : '') + (res.reward.pieces ? ' 🧩 ' + res.reward.pieces : ''), 'ok'); render(); },
    'gacha': function (arg) {
      var n = parseInt(arg, 10) === 10 ? 10 : 1; var res = BL.gacha(state, n);
      if (!res.ok) { toast('Ego Gems が足りない', 'warn'); return; }
      var hi = res.results.some(function (r) { return D.RARITY[r.rar].stars >= 6; }); sfx(hi ? 'rare' : 'gacha');
      ui.modal = { type: 'gacha', results: res.results, n: n }; render();
    },
    'pick-card': function (arg) { if (state.run || state.wc) return; ui.pick = { kind: 'card', cardId: arg, arc: 0 }; ui.modal = { type: 'advisor' }; render(); },
    'pick-grad': function (arg) { if (state.run || state.wc) return; var g = BL.gradById(state, arg); if (!g) return; ui.pick = { kind: 'grad', gradId: g.id, cardId: g.cardId, arc: g.part }; ui.modal = { type: 'advisor' }; render(); },
    'toggle-squad': function (arg) { var res = BL.toggleSquadPick(state, arg); if (!res.ok) { toast(res.reason === 'full' ? '決戦メンバーは 5 人まで' : '第四編を卒業した選手のみ', 'warn'); return; } sfx('click'); render(); },
    'pick-final': function () { if (state.run || state.wc) return; var ids = (state.meta.squadPick || []).slice(); if (ids.length !== P.FINAL_SQUAD) { toast('決戦メンバーを 5 人選ぶ', 'warn'); return; } ui.pick = { kind: 'final', gradIds: ids, arc: LAST }; ui.modal = { type: 'advisor' }; render(); },
    'choose-advisor': function (arg) {
      if (!ui.pick) return; ui.pick.advisorId = arg;
      if (ui.pick.kind === 'final') { startPicked(null); return; }
      ui.modal = { type: 'partner' }; render();
    },
    'choose-partner': function (arg) { startPicked(arg === 'none' ? null : arg); },
    'start-run': function (arg) { /* 旧 UI 互換：アドバイザー選択と同時に相棒なしで開始 */ if (!ui.pick) return; ui.pick.advisorId = arg; startPicked(null); },
    'buy-upgrade': function (arg) { var res = BL.buyUpgrade(state, arg); if (!res.ok) { toast({ gems: 'Ego Gems が足りない', max: '最大 Lv' }[res.reason] || '購入できない', 'warn'); return; } sfx('buy'); toast(res.def.name + ' Lv.' + res.lv + '（💎 -' + res.cost + '）', 'ok'); render(); },
    'star-up': function (arg) { var res = BL.starUp(state, arg); if (!res.ok) { toast({ pieces: 'ピースが足りない', max: 'このカードの星上げは上限', top: '既に ★8' }[res.reason] || '星上げできない', 'warn'); return; } sfx('rare'); toast('星上げ → ' + stars(res.rar) + '（🧩 -' + res.cost + '）', 'ok'); render(); },
    'story-next': function () { BL.continueStory(state); sfx('click'); afterWeekAction(); },
    'choose-story': function (arg) { var res = BL.chooseStory(state, parseInt(arg, 10)); if (!res.ok) return; sfx(res.rollWin === false ? 'lost' : 'event'); ui.modal = { type: 'choiceResult', result: res }; render(); },
    'close-choice': function () { ui.modal = null; afterWeekAction(); },
    'open-export': function (arg) { ui.modal = { type: 'export', kind: arg }; render(); },
    'copy-text': function () { var ta = document.querySelector('.modal textarea'); if (!ta) return; var done = function () { toast('コピーした', 'ok'); }; var fb = function () { ta.focus(); ta.select(); toast('選択したテキストをコピーしてください', 'warn'); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fb); else fb(); },
    'choose-club': function (arg) { BL.chooseClub(state, arg); sfx('click'); afterWeekAction(); },
    'train': function (arg) {
      if (ui.busy || !clickGuard()) return; var res = BL.train(state, arg); if (!res.ok) return;
      if (res.injured && (!state.run || state.run.phase === 'gameover')) { afterWeekAction(); return; }
      sfx('train'); ui.flash = { gains: res.gains, stat: arg, per: res.per }; afterWeekAction();
    },
    'rest': function () { if (ui.busy || !clickGuard()) return; var res = BL.rest(state); if (!res.ok) return; sfx('rest'); afterWeekAction(); },
    'open-store': function () { if (!state.run || state.run.phase !== 'training') return; ui.modal = { type: 'store' }; render(); },
    'buy': function (arg) { var res = BL.buy(state, arg); if (!res.ok) { toast({ cash: 'Cash 不足', full: 'HP は既に100%', dup: '適用済み（買いだめ不可）' }[res.reason] || '購入できない', 'warn'); return; } sfx('buy'); toast(res.item.name + '：' + res.msg, 'ok'); render(); },
    'event-choice': function (arg) { var res = BL.resolveEvent(state, parseInt(arg, 10)); if (!res.ok) return; sfx('click'); ui.modal = { type: 'event', result: res }; render(); },
    'close-event': function () { ui.modal = null; afterWeekAction(); },
    'climax': function (arg, el) {
      if (ui.busy) return; var pidx = el ? el.getAttribute('data-player') : null;
      var res = BL.chooseClimax(state, arg, pidx === null ? undefined : pidx); if (!res) return;
      sfx('whistle');
      judge(res, function () { sfx(res.success ? 'goal' : 'lost'); if (res.skill || res.sig) setTimeout(function () { sfx('awaken'); }, 500); render(); });
    },
    'climax-next': function () {
      BL.dismissResult(state);
      var run = state.run;
      if (run && run.phase === 'match' && run.match.current && (run.match.current.flow || (run.match.current.players && run.match.current.players.some(function (pe) { return pe.flow && pe.avail; })))) sfx('flow');
      render();
    },
    'match-next': function () {
      var res = BL.nextAfterMatch(state); if (!res.ok) return;
      var run = state.run;
      if (run.phase === 'gameover') { blackout('除籍', 1200, function () { sfx('elim'); render(); }); return; }
      if (run.phase === 'match') { render(); blackout('公式戦 — ' + run.match.enemy, 1500, function () { sfx('whistle'); render(); }); return; }
      if (run.phase === 'evaluation') { sfx('whistle'); }
      render();
    },
    'eval-next': function () {
      var res = BL.advance(state); if (!res.ok) return; var run = state.run;
      if (run.phase === 'graduated') { sfx('clear'); render(); confetti(); }
      else if (run.phase === 'gameover') blackout('除籍', 1200, function () { sfx('elim'); render(); });
      else if (run.phase === 'clear') { sfx('clear'); render(); confetti(); }
      else render();
    },
    'close-run': function () { var wasGrad = state.run && state.run.phase === 'graduated'; var wasClear = state.run && state.run.phase === 'clear'; BL.closeRun(state); ui.lobbyTab = wasGrad ? 'grads' : (wasClear ? 'hof' : 'roster'); ui.inLobby = false; render(); },
    'portrait-remove': function (arg) { BL.setPortrait(state, arg, null); toast('画像を削除した', 'ok'); render(); },
    'open-naming': function () { ui.modal = { type: 'naming' }; render(); },
    'open-exchange': function () { ui.modal = { type: 'exchange' }; render(); },
    'exchange-filter': function (arg) { ui.rosterFilter = arg; render(); },
    'exchange': function (arg) { var res = BL.exchange(state, arg); if (!res.ok) { toast(res.reason === 'pieces' ? 'ピースが足りない' : '交換できない', 'warn'); return; } sfx('rare'); toast((res.isNew ? '新規獲得' : '限界突破 +' + res.dupes) + '（🧩 -' + res.cost + '）', 'ok'); render(); },
    'choose-policy': function (arg) { BL.choosePolicy(state, arg); sfx('click'); afterWeekAction(); },
    'auto-train': function () { if (!state.run || state.run.phase !== 'training') return; actions.train(BL.recommendStat(state.run)); },
    'copy-summary': function () {
      if (!state.run) return; var text = BL.runSummary(state.run);
      var done = function () { toast('結果をクリップボードにコピーした', 'ok'); };
      var fallback = function () { ui.modal = { type: 'summary', text: text }; render(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    },
    'wc-start': function (arg) { var res = BL.startWorldCup(state, arg); if (!res.ok) { toast({ active: 'W杯出撃中の選手がいる', used: 'この選手は既に出撃済み' }[res.reason] || '出撃できない', 'warn'); return; } ui.inLobby = false; render(); },
    'wc-resume': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'wc-begin': function () { BL.wcBeginMatch(state); render(); blackout('FIFA WORLD CUP — ' + D.WORLD_CUP.stages[state.wc.stage].team, 1400, function () { sfx('whistle'); render(); }); },
    'wc-climax': function (arg) { if (ui.busy) return; var r = BL.wcChooseClimax(state, arg); if (!r) return; judge(r, function () { sfx(r.success ? 'goal' : 'lost'); render(); }); },
    'wc-next': function () { BL.wcDismissResult(state); render(); if (state.wc.phase === 'end' && state.wc.champion) { sfx('clear'); confetti(); } },
    'wc-stage-next': function () { BL.wcNextStage(state); render(); },
    'wc-close': function () { BL.wcClose(state); ui.lobbyTab = 'hof'; ui.inLobby = false; render(); }
  };
  function onClick(e) {
    var el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
    var act = el.getAttribute('data-action'); var arg = el.getAttribute('data-arg');
    if (actions[act]) { e.preventDefault(); actions[act](arg, el); }
  }
  document.addEventListener('click', onClick);
  /* ポートレート画像の取り込み：端末内で 160×200 に縮小して保存 */
  function importPortraitFile(charId, file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement('canvas'); var W = 160, H = 200; cv.width = W; cv.height = H; var cx = cv.getContext('2d');
          var s = Math.max(W / img.width, H / img.height); var dw = img.width * s, dh = img.height * s;
          cx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          var q = 0.82, url = cv.toDataURL('image/jpeg', q);
          while (url.length > 60 * 1024 && q > 0.3) { q -= 0.1; url = cv.toDataURL('image/jpeg', q); }
          done(BL.setPortrait(state, charId, url));
        } catch (err) { done({ ok: false, reason: 'decode' }); }
      };
      img.onerror = function () { done({ ok: false, reason: 'decode' }); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function charIdFromFilename(name) {
    var base = name.replace(/\.[^.]+$/, '').trim();
    if (D.CHARACTERS[base]) return base;
    for (var id in D.CHARACTERS) if (D.CHARACTERS[id].name === base || D.CHARACTERS[id].name.replace(/[・ ]/g, '') === base.replace(/[・ ]/g, '')) return id;
    return null;
  }
  function readTextFile(file, cb) { var r = new FileReader(); r.onload = function () { cb(String(r.result || '')); }; r.onerror = function () { cb(null); }; r.readAsText(file); }
  document.addEventListener('change', function (e) {
    var imp = e.target; if (imp && imp.matches && imp.matches('input[type=file][data-import-save]')) {
      var f0 = imp.files && imp.files[0]; if (!f0) return;
      readTextFile(f0, function (txt) {
        if (txt === null) { toast('ファイルを読めない', 'warn'); return; }
        var res = BL.importSave(txt); if (!res.ok) { toast(res.reason === 'parse' ? 'JSON として読めない' : 'セーブデータの形式ではない', 'warn'); return; }
        state = res.state; BL.SFX.setEnabled(state.meta.sfx !== false); ui.modal = null; ui.inLobby = !!(state.run || state.wc); ui.screen = 'game'; ui.lobbyTab = 'records';
        toast('セーブデータを読み込んだ', 'ok'); render();
      });
      return;
    }
    if (imp && imp.matches && imp.matches('input[type=file][data-import-portraits]')) {
      var f1 = imp.files && imp.files[0]; if (!f1) return;
      readTextFile(f1, function (txt) {
        if (txt === null) { toast('ファイルを読めない', 'warn'); return; }
        var res = BL.importPortraits(state, txt); if (!res.ok) { toast('画像パックの形式ではない', 'warn'); return; }
        toast('画像 ' + res.count + ' 件を読み込んだ', 'ok'); render();
      });
      return;
    }
    var bulk = e.target; if (bulk && bulk.matches && bulk.matches('input[type=file][data-portrait-bulk]')) {
      var files = Array.prototype.slice.call(bulk.files || []); var okN = 0, ngN = 0, pending = files.length;
      if (!pending) return;
      var finish = function () { if (--pending === 0) { toast('取り込み ' + okN + ' 件 / 不一致・失敗 ' + ngN + ' 件', okN ? 'ok' : 'warn'); render(); } };
      files.forEach(function (f) {
        var cid = charIdFromFilename(f.name);
        if (!cid) { ngN++; finish(); return; }
        importPortraitFile(cid, f, function (res) { if (res.ok) okN++; else ngN++; finish(); });
      });
      return;
    }
    var input = e.target; if (!input || !input.matches || !input.matches('input[type=file][data-portrait]')) return;
    var charId = input.getAttribute('data-portrait'); var file = input.files && input.files[0]; if (!file) return;
    importPortraitFile(charId, file, function (res) {
      if (!res.ok) { toast({ size: '画像が大きすぎる', quota: '保存容量の上限', char: '不明なキャラ', decode: '画像を処理できない' }[res.reason] || '保存できない', 'warn'); return; }
      toast('画像を設定した（このキャラの全カードに表示）', 'ok'); render();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.modal && ui.modal.type !== 'event') { ui.modal = null; render(); return; }
    if (ui.modal || ui.screen === 'title' || ui.inLobby || !state.run) return;
    var run = state.run; var k = e.key.toUpperCase();
    if (run.phase === 'storyChoice') { var ci = ['1', '2', '3', '4'].indexOf(e.key); if (ci >= 0) actions['choose-story'](String(ci)); return; }
    if (run.phase === 'training') {
      var idx = ['1', '2', '3', '4', '5'].indexOf(e.key); if (idx >= 0) { actions.train(D.STATS[idx]); return; }
      if (k === 'R') { actions.rest(); return; } if (k === 'S') { actions['open-store'](); return; }
    }
    if (run.phase === 'match' && run.match) {
      if (run.match.showResult) { if (e.key === 'Enter' || e.key === ' ') actions['climax-next'](); return; }
      if (run.match.current && !run.match.current.players && ['A', 'B', 'C', 'D'].indexOf(k) >= 0) { var ok = run.match.current.options.some(function (o) { return o.key === k; }); if (ok) actions.climax(k, null); }
    }
  });
  render();
  root.BL_UI = { state: function () { return state; }, render: render, ui: ui };
})(typeof globalThis !== 'undefined' ? globalThis : this);
