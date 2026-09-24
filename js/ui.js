/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  UI layer v2 (vanilla DOM, no framework)
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL; var D = BL.DATA; var P = D.PARAMS; var ARCS = BL.STORY.arcs;

  var state = BL.load();
  var ui = { screen: 'title', lobbyTab: 'roster', rosterFilter: 'all', inLobby: false, modal: null, flash: null, busy: false, pickCard: null };
  BL.SFX.setEnabled(state.meta.sfx !== false);

  /* ------------------------------------------------------------ utils */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(r) { var n = D.RARITY[r].stars; var s = ''; for (var i = 0; i < n; i++) s += '★'; return s + (r === '4F' ? ' FLOW' : ''); }
  function num(v) { return Math.round(v).toLocaleString(); }
  function pct(v) { return Math.round(v) + '%'; }
  function yen(v) { return BL.fmtYen(v); }
  function cash(v) { return '¥' + Math.round(v).toLocaleString(); }
  function rc(r) { return D.RARITY[r].color; }
  function sfx(n) { if (state.meta.sfx !== false) BL.SFX.play(n); }
  function typeIcon(t) { return (D.TYPE_MAP[t] || {}).icon || ''; }
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
    window.scrollTo(0, 0);
    if ($('.bid-num')) countUp();
    flushAchievements();
  }
  function isFlowActive() {
    var m = state.wc ? state.wc.match : (state.run && state.run.match);
    var phase = state.wc ? state.wc.phase : (state.run && state.run.phase);
    return !!(m && phase === 'match' && m.current && m.current.flow && !m.showResult);
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
      case 'story': inner = renderStoryModal(); break;
    }
    ov.innerHTML = '<div class="modal-backdrop"><div class="modal">' + inner + '</div></div>'; ov.hidden = false;
  }

  /* ------------------------------------------------------------ title */
  function renderTitle() {
    return '<section class="screen title-screen" data-action="title-start">' + disclaimerBar() +
      '<div class="title-body"><div class="title-kicker">PROJECT : WORLD CHAMPION — MODIFIED / 原作準拠ローグライト</div>' +
      '<h1 class="title-logo"><span>BLUE</span> <span class="accent">LOCK</span><small>PWC : EGOIST ROGUELITE</small></h1>' +
      '<p class="title-tag">入寮テストから一次・二次・三次選考、新英雄大戦、U-20ワールドカップまで。敗者は即刻除籍。能力は青天井。エゴを覚醒させ、世界一を撃ち抜け。</p>' +
      '<div class="title-cta">' + (state.run ? '育成中のデータがあります — TAP TO RESUME' : 'TAP TO START') + '</div>' +
      '<div class="title-meta">Ego Gems ' + num(state.meta.gems) + ' / 周回 ' + state.meta.records.runs + ' / 殿堂入り ' + state.meta.hof.length + ' / 所持カード ' + Object.keys(state.meta.roster).length + '/' + BL.CARDS.length + '</div>' +
      '</div></section>';
  }

  /* ------------------------------------------------------------ lobby */
  function renderLobby() {
    var m = state.meta;
    var tabs = [['roster', '所持選手'], ['gacha', 'スカウト'], ['dex', '図鑑'], ['hof', '殿堂 / W杯'], ['ach', '実績'], ['records', '戦績・ルール']];
    var tabHtml = tabs.map(function (t) { return '<button class="tab' + (ui.lobbyTab === t[0] ? ' active' : '') + '" data-action="lobby-tab" data-arg="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var body = { roster: renderRoster, gacha: renderGacha, dex: renderDex, hof: renderHof, ach: renderAchievements, records: renderRecords }[ui.lobbyTab]();
    return '<section class="screen lobby">' + disclaimerBar() +
      '<header class="lobby-head"><div class="lobby-title"><span class="accent">BLUE LOCK</span> PWC — ロビー</div>' +
      '<div class="head-right"><button class="btn ghost sm" data-action="toggle-sfx">' + (m.sfx !== false ? '🔊 SE ON' : '🔇 SE OFF') + '</button><div class="gems">💎 <b>' + num(m.gems) + '</b> Ego Gems</div></div></header>' +
      '<nav class="tabs">' + tabHtml + '</nav><div class="lobby-body">' + body + '</div></section>';
  }

  function cardCardHtml(card, own, opts) {
    var c = D.CHARACTERS[card.char]; var prof = BL.cardProfile(card, own ? own.dupes : 0);
    var statLine = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(prof.stats[s]) + '</span>'; }).join('');
    var actions = '';
    if (opts && opts.owned) {
      actions = '<button class="btn ghost sm" data-action="card-detail" data-arg="' + card.id + '">詳細</button>' +
        '<button class="btn primary" data-action="pick-card" data-arg="' + card.id + '"' + (state.run || state.wc ? ' disabled' : '') + '>この選手で育成開始</button>';
    } else actions = '<button class="btn ghost sm" data-action="card-detail" data-arg="' + card.id + '">詳細</button>';
    return '<article class="card char-card' + (own ? '' : ' unowned') + '" style="--rc:' + rc(card.rar) + '">' +
      '<div class="card-top"><div class="rarity">' + stars(card.rar) + '</div><div class="lb">' + typeIcon(card.type) + ' ' + esc(card.type) + (own ? (own.dupes ? ' / 限界突破 +' + own.dupes : '') : ' / 未所持') + '</div></div>' +
      '<h3>' + esc(c.name) + '<small>【' + esc(card.title) + '】 ' + esc(card.pos.join('/')) + ' — ' + esc(c.tag) + '</small></h3>' +
      '<div class="stat-line">' + statLine + '<span class="st total"><i>合計</i>' + num(BL.sumStats(prof.stats)) + '</span></div>' +
      '<div class="passive"><b>' + esc(c.passive.name) + '</b> ' + esc(c.passive.desc) + '</div>' +
      '<div class="card-actions">' + actions + '</div></article>';
  }
  function rarityFilterBar(current, action) {
    var opts = [['all', '全て']].concat(D.RARITY_ORDER.map(function (r) { return [r, D.RARITY[r].label]; }));
    return '<div class="filters">' + opts.map(function (o) { return '<button class="chipbtn' + (current === o[0] ? ' active' : '') + '" data-action="' + action + '" data-arg="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function renderRoster() {
    var ids = Object.keys(state.meta.roster);
    var cards = ids.map(BL.cardById).filter(Boolean).filter(function (c) { return ui.rosterFilter === 'all' || c.rar === ui.rosterFilter; })
      .sort(function (a, b) { return D.RARITY_ORDER.indexOf(a.rar) - D.RARITY_ORDER.indexOf(b.rar) || a.char.localeCompare(b.char); });
    var note = state.run ? '<div class="notice warn">育成中の選手がいます。RUN を終えるまで新規育成は開始できません（リセット・放棄は不可）。<button class="btn primary sm" data-action="resume-run">育成を再開</button></div>' :
               state.wc ? '<div class="notice warn">FIFAワールドカップに出撃中の選手がいます。<button class="btn gold sm" data-action="wc-resume">W杯を再開</button></div>' : '';
    return note + '<div class="muted small">所持 ' + ids.length + ' / ' + BL.CARDS.length + ' 枚（PWC 全カード準拠）。同一カード再排出で限界突破（初期値 +5% / 成長 +3%）が周回を跨いで蓄積。</div>' +
      rarityFilterBar(ui.rosterFilter, 'roster-filter') + '<div class="grid">' + cards.map(function (c) { return cardCardHtml(c, state.meta.roster[c.id], { owned: true }); }).join('') + '</div>';
  }
  function renderDex() {
    var cards = BL.CARDS.filter(function (c) { return ui.rosterFilter === 'all' || c.rar === ui.rosterFilter; });
    var owned = cards.filter(function (c) { return !!state.meta.roster[c.id]; }).length;
    var rows = cards.map(function (c) {
      var own = state.meta.roster[c.id]; var ch = D.CHARACTERS[c.char];
      return '<tr class="' + (own ? 'have' : 'nohave') + '" data-action="card-detail" data-arg="' + c.id + '"><td style="color:' + rc(c.rar) + '">' + stars(c.rar) + '</td><td><b>' + esc(ch.name) + '</b> 【' + esc(c.title) + '】</td><td>' + typeIcon(c.type) + esc(c.type) + '</td><td>' + esc(c.pos.join('/')) + '</td><td>' + (own ? '所持' + (own.dupes ? ' +' + own.dupes : '') : '—') + '</td></tr>';
    }).join('');
    return '<div class="muted small">図鑑 ' + owned + ' / ' + cards.length + '。行をクリックで詳細。</div>' + rarityFilterBar(ui.rosterFilter, 'roster-filter') +
      '<table class="tbl dex"><thead><tr><th>レア</th><th>カード</th><th>タイプ</th><th>ポジション</th><th>所持</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function renderCardDetail() {
    var card = BL.cardById(ui.modal.cardId); if (!card) return '';
    var c = D.CHARACTERS[card.char]; var own = state.meta.roster[card.id]; var prof = BL.cardProfile(card, own ? own.dupes : 0);
    var rows = D.STATS.map(function (s) { return '<tr><td style="color:' + D.STAT_META[s].color + '"><b>' + s + '</b> ' + D.STAT_META[s].jp + '</td><td>' + num(prof.stats[s]) + '</td><td>×' + prof.growth[s].toFixed(2) + '</td></tr>'; }).join('');
    var others = BL.CARDS.filter(function (x) { return x.char === card.char && x.id !== card.id; }).map(function (x) { return '<span class="tag" style="border-color:' + rc(x.rar) + '">' + stars(x.rar) + ' ' + esc(x.title) + (state.meta.roster[x.id] ? ' ✓' : '') + '</span>'; }).join(' ');
    return '<div class="modal-head"><h2 style="color:' + rc(card.rar) + '">' + stars(card.rar) + ' ' + esc(c.name) + '【' + esc(card.title) + '】</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<p class="muted">' + typeIcon(card.type) + ' ' + esc(card.type) + 'タイプ（' + esc(D.TYPE_MAP[card.type].desc) + '） / ' + esc(card.pos.join(' / ')) + ' / ' + esc(D.RARITY[card.rar].tier) + '</p>' +
      '<table class="tbl"><thead><tr><th>能力</th><th>初期値</th><th>成長補正</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="passive big"><b>固有エゴ：' + esc(c.passive.name) + '</b><br>' + esc(c.passive.desc) + '</div>' +
      '<div class="passive big"><b>固有覚醒スキル：' + esc(c.sig.name) + '</b><br>' + esc(c.sig.desc) + '（主属性 ' + D.TYPE_MAP[card.type].stat + ' が ' + P.SIG_TH + ' 以上で Climax 成功、または FLOW 成功で覚醒）</div>' +
      (own ? '<p class="muted">限界突破 +' + own.dupes + '（初期値 +' + Math.round(own.dupes * P.LB_STEP * 100) + '% / 成長 +' + Math.round(own.dupes * P.LB_GROWTH * 100) + '%）</p>' : '<p class="muted">未所持</p>') +
      (others ? '<div class="muted small">同キャラの他カード：' + others + '</div>' : '') +
      (own && !state.run && !state.wc ? '<div class="modal-foot center"><button class="btn primary" data-action="pick-card" data-arg="' + card.id + '">この選手で育成開始</button></div>' : '');
  }
  function renderAdvisorPick() {
    var card = BL.cardById(ui.pickCard); if (!card) return '';
    var list = D.ADVISORS.map(function (a) {
      var ok = BL.advisorUnlocked(state, a); var ach = a.unlock ? D.ACHIEVEMENTS.filter(function (x) { return x.id === a.unlock; })[0] : null;
      return '<button class="btn choice adv' + (ok ? '' : ' locked') + '" data-action="start-run" data-arg="' + a.id + '"' + (ok ? '' : ' disabled') + '><span>' + esc(a.name) + ' <small>【' + esc(a.card) + '】</small></span><small>' + (ok ? esc(a.desc) : '🔒 解放条件：実績「' + esc(ach ? ach.name : '') + '」') + '</small></button>';
    }).join('');
    return '<div class="modal-head"><h2>アドバイザーを選択</h2><button class="btn ghost sm" data-action="close-modal">戻る</button></div>' +
      '<p class="muted">' + esc(BL.cardName(card)) + ' の育成に同行するアドバイザーを 1 名選ぶ（PWC のアドバイザー枠に対応）。選択と同時に RUN が開始され、以後の行動はすべて不可逆に保存される。</p><div class="choices">' + list + '</div>';
  }

  function renderGacha() {
    var m = state.meta;
    var rateRows = D.RARITY_ORDER.map(function (r) {
      var n = BL.CARDS.filter(function (c) { return c.rar === r; }).length;
      return '<tr><td style="color:' + rc(r) + '">' + stars(r) + '</td><td>' + esc(D.RARITY[r].tier) + '</td><td class="num">' + D.RARITY[r].rate.toFixed(1) + '%</td><td class="muted">' + n + ' 枚</td></tr>';
    }).join('');
    return '<div class="gacha-panel"><div class="gacha-cta"><div><div class="muted">所持 Ego Gems</div><div class="big-num">💎 ' + num(m.gems) + '</div></div>' +
      '<div class="gacha-btns"><button class="btn primary" data-action="gacha" data-arg="1"' + (m.gems < P.GACHA_SINGLE ? ' disabled' : '') + '>単発スカウト<small>' + P.GACHA_SINGLE + ' Gems</small></button>' +
      '<button class="btn gold" data-action="gacha" data-arg="10"' + (m.gems < P.GACHA_TEN ? ' disabled' : '') + '>10連スカウト<small>' + P.GACHA_TEN + ' Gems</small></button></div></div>' +
      '<p class="muted small">天井・確定枠は存在しない。提供割合の ★3/★2/★1 は PWC サービス開始時の公表値（3.5 / 30 / 66.5%）を基準とし、後年追加の ★4 / ★4FLOW / ★5 は公開情報が確認できないため推定値（js/data.js で調整可能）。</p>' +
      '<table class="tbl"><thead><tr><th>レア</th><th>クラス</th><th>提供割合</th><th>収録</th></tr></thead><tbody>' + rateRows + '</tbody></table></div>';
  }
  function renderGachaResult() {
    var res = ui.modal.results.map(function (r, i) {
      return '<div class="pull' + (D.RARITY[r.rar].stars >= 4 ? ' hi' : '') + '" style="--rc:' + rc(r.rar) + '; animation-delay:' + (i * 90) + 'ms"><div class="pull-r">' + stars(r.rar) + '</div><div class="pull-n">' + esc(r.name) + '</div><div class="pull-t">' + typeIcon(r.type) + ' ' + (r.isNew ? '<b class="new">NEW</b>' : '限界突破 +' + r.dupes) + '</div></div>';
    }).join('');
    var costN = ui.modal.n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE;
    return '<div class="modal-head"><h2>スカウト結果</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="pulls">' + res + '</div>' +
      '<div class="modal-foot"><span class="muted">残り 💎 ' + num(state.meta.gems) + '</span><button class="btn primary" data-action="gacha" data-arg="' + ui.modal.n + '"' + (state.meta.gems < costN ? ' disabled' : '') + '>もう一度（' + costN + '）</button></div>';
  }

  function renderHof() {
    var hof = state.meta.hof;
    if (!hof.length) return '<div class="notice">殿堂入り選手はまだいない。U-20ワールドカップ決勝を 3対0 の完全勝利で制した選手だけがここに刻まれ、FIFAワールドカップ（成人A代表・世界決戦モード）への出撃権を得る。</div>';
    var list = hof.slice().reverse().map(function (e) {
      var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(e.stats[s]) + '</span>'; }).join('');
      var wc = e.wc || { status: 'none' };
      var wcLabel = wc.status === 'none' ? '<span class="tag">W杯 未出撃</span>' : wc.status === 'inprogress' ? '<span class="tag warn">W杯 出撃中</span>' :
                    wc.status === 'champion' ? '<span class="tag gold">🏆 FIFA W杯 優勝</span>' : '<span class="tag danger">W杯 ' + esc(D.WORLD_CUP.stages[Math.min(wc.stage, D.WORLD_CUP.stages.length - 1)].name) + ' 敗退</span>';
      var btn = wc.status === 'none' ? '<button class="btn gold" data-action="wc-start" data-arg="' + e.id + '"' + (state.wc || state.run ? ' disabled' : '') + '>FIFAワールドカップに出撃（一発勝負）</button>' :
                wc.status === 'inprogress' ? '<button class="btn primary" data-action="wc-resume">W杯を再開</button>' : '';
      return '<article class="card hof-card" style="--rc:' + rc(e.rar) + '"><div class="card-top"><div class="rarity">' + stars(e.rar) + '</div>' + wcLabel + '</div>' +
        '<h3>' + esc(e.name) + '<small>' + new Date(e.clearedAt).toLocaleDateString('ja-JP') + ' 世界一達成 / アドバイザー ' + esc((BL.advisorById(e.advisorId) || {}).name || '') + (e.club ? ' / ' + esc(BL.clubById(e.club).name) : '') + '</small></h3>' +
        '<div class="stat-line">' + st + '<span class="st total"><i>合計</i>' + num(BL.sumStats(e.stats)) + '</span></div>' +
        '<div class="muted">最終年俸 ' + yen(e.bid) + ' / スキル ' + (BL.skillCount(e.skills) + (e.sig || 0)) + ' / ゴール ' + e.totals.goals + '</div><div class="card-actions">' + btn + '</div></article>';
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
    var hist = state.meta.history.map(function (h) { return '<tr><td>#' + h.runNo + '</td><td style="color:' + rc(h.rar) + '">' + esc(h.card) + '</td><td>' + (h.cleared ? '🏆 世界一' : '第' + ARCS[h.arc].n + '章 ' + esc(h.arcTitle) + ' で除籍') + '</td><td>' + num(h.total) + '</td><td>' + yen(h.bid) + '</td><td>' + h.rank + '位</td></tr>'; }).join('');
    return '<div class="records"><div class="kpis">' +
      '<div class="kpi"><i>周回数</i><b>' + r.runs + '</b></div><div class="kpi"><i>除籍回数</i><b>' + r.eliminations + '</b></div><div class="kpi"><i>世界一達成</i><b>' + r.clears + '</b></div>' +
      '<div class="kpi"><i>最高到達</i><b>' + (r.bestArc >= 0 ? '第' + ARCS[r.bestArc].n + '章 突破' : '—') + '</b></div><div class="kpi"><i>BLランキング最高</i><b>' + r.bestRank + '位</b></div><div class="kpi"><i>最高年俸</i><b>' + yen(r.bestBid) + '</b></div>' +
      '<div class="kpi"><i>最高合計ステータス</i><b>' + num(r.bestTotal) + '</b></div><div class="kpi"><i>スカウト回数</i><b>' + r.gachaPulls + '</b></div><div class="kpi"><i>FIFA W杯 優勝</i><b>' + r.wcTitles + '</b></div></div>' +
      '<button class="btn ghost" data-action="open-rules">ルール・仕様を読む</button>' +
      (hist ? '<h4 class="sect">RUN 履歴</h4><table class="tbl"><thead><tr><th>#</th><th>カード</th><th>結果</th><th>合計</th><th>年俸</th><th>順位</th></tr></thead><tbody>' + hist + '</tbody></table>' : '') + '</div>';
  }
  function renderRules() {
    var arcRows = ARCS.map(function (a) {
      var segs = a.segments.map(function (s) { return esc(s.name) + '（' + s.weeks + '週' + (s.match.rule === 'single' ? '・単発' : '') + '）'; }).join(' → ');
      var cut = []; if (a.cut.statReq) cut.push('合計 ' + a.cut.statReq); if (a.cut.leagueWins) cut.push('リーグ ' + a.cut.leagueWins + ' 勝'); if (a.cut.finalMustWin) cut.push('最終戦勝利'); if (a.cut.bidReq) cut.push('年俸 ' + yen(a.cut.bidReq));
      return '<tr><td>第' + a.n + '章 ' + esc(a.title) + '</td><td>' + segs + '</td><td>' + (cut.join(' / ') || '—') + '</td></tr>';
    }).join('');
    return '<div class="modal-head"><h2>ルール</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="rules">' +
      '<h4>進行</h4><ul><li>練習・休養は1クリックで即座に1週を消費。確認ダイアログは無い。すべての行動はクリックした瞬間に LocalStorage へ上書き保存され、リロードしてもやり直しは不可能。</li>' +
      '<li>「あと0週」で強制的に公式戦へ突入。章は複数の節（試合）で構成され、章末に足切り査定がある。</li></ul>' +
      '<h4>肉体健全度とコンディション</h4><ul><li>練習でHP約15%消費、休養で+40%。HP50%以上：万全／30〜49%：疲労（効率50%）／30%未満：危険水域（効率35%、練習強行で40%の確率で靭帯断裂＝即除籍）。</li>' +
      '<li>コンディション（絶好調 ×1.15 / 好調 ×1.05 / 普通 / 不調 ×0.85・HP消費+2）は練習で下がりやすく休養で上がりやすい。</li></ul>' +
      '<h4>成長</h4><ul><li>獲得量 = (基礎値×章環境倍率 + 現在値×複利率) × (1 + 0.05×所持スキル数) × 成長補正 × 限界突破 × HP効率 × コンディション。上限なし。</li></ul>' +
      '<h4>試合（Climax）</h4><ul><li>成功率 = 対応2ステータス合計 ÷ 敵レート の比率 r をシグモイド変換（r=1 で 50%）。r &lt; 0.7 は補正を無視して 0%（完全ゼロの壁）。</li>' +
      '<li>スキル・固有エゴ・アドバイザー・クラブ・アナライズノートは失敗率を割合で削る乗算補正。FLOW は +20pt 加算（最良選択肢が 25〜40% の局面で 25% で突入、成功時スキル確定覚醒）。</li>' +
      '<li>失敗はカウンターで失点。勝利必須の試合では勝利条件が数学的に不可能になった瞬間にコールド負け。同点は即時敗北。</li>' +
      '<li>試合ルール：単発（失敗＝除籍）／リーグ（章末判定）／勝利必須／二次選考3rd（敗北で蜂楽を奪われ2対2へ）／二次選考4th（敗北でも INT または2得点で凛の指名）／新英雄大戦（年俸判定）／グループ（3戦2勝）／決勝（3対0のみ）。</li></ul>' +
      '<h4>章構成</h4><table class="tbl"><thead><tr><th>章</th><th>節</th><th>章末足切り</th></tr></thead><tbody>' + arcRows + '</tbody></table>' +
      '<h4>ローグライト</h4><ul><li>章生存で Ego Gems +500、世界一でさらに +2000。除籍時は章番号×300 の補償（絵心アドバイザーで×1.5）。実績でもジェムとアドバイザーを獲得。</li>' +
      '<li>同一カードの再排出は限界突破（初期値+5%・成長+3%）として周回を跨いで蓄積。新規 RUN へのステータス持ち越しは無い。</li></ul></div>';
  }

  /* ------------------------------------------------------------ run */
  function renderRun() {
    var run = state.run;
    switch (run.phase) {
      case 'arcIntro': return renderArcIntro();
      case 'clubSelect': return renderClubSelect();
      case 'training': case 'event': return renderTraining();
      case 'match': return renderMatch(run.match, runMatchCtx());
      case 'matchResult': return (run.match && run.match.showResult) ? renderMatch(run.match, runMatchCtx()) : renderMatchResult();
      case 'evaluation': return renderEvaluation();
      case 'gameover': return renderGameover();
      case 'clear': return renderClear();
    }
    return '';
  }
  function runMatchCtx() {
    var run = state.run; var arc = BL.arcOf(run); var m = run.match;
    return { kind: 'run', title: '第' + arc.n + '章 ' + arc.title, sub: m.name, enemy: m.enemy, lead: m.lead, highlights: m.highlights, intro: m.intro,
             needText: ruleText(m), charName: charOfRun(run).name, canon: m.canon };
  }
  function ruleText(m) {
    switch (m.rule) {
      case 'single': return '単発の試練：失敗すればその場で脱落';
      case 'league': return '総当たり：試合単位の除籍なし（章末に2勝以上＆最終戦勝利を判定）' + (m.final ? ' — 最終戦は勝利必須' : '');
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

  function renderArcIntro() {
    var run = state.run; var arc = BL.arcOf(run);
    var paras = arc.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var segs = arc.segments.filter(function (s) { return !s.cond; }).map(function (s) { return '<li><b>' + esc(s.name) + '</b><small>' + (s.weeks ? '公式戦まで ' + s.weeks + ' 週' : '即時') + ' — ' + esc(s.match.canon || '') + '</small></li>'; }).join('');
    return '<section class="screen story"><div class="story-kicker">CHAPTER ' + arc.n + '</div><h2 class="story-title">' + esc(arc.title) + '<small>' + esc(arc.sub) + '</small></h2>' +
      '<div class="story-body">' + paras + '</div><div class="panel"><h4>この章の節</h4><ul class="seg-list">' + segs + '</ul></div>' +
      '<div class="modal-foot center"><button class="btn primary lg" data-action="story-next">' + (arc.chooseClub ? '所属クラブを選ぶ' : '進む') + '</button></div></section>';
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

  function renderTraining() {
    var run = state.run; var arc = BL.arcOf(run); var seg = BL.segOf(run); var card = BL.cardById(run.cardId); var c = charOfRun(run);
    var mdef = BL.currentMatchDef(run); var preview = BL.previewOptions(run); var gains = BL.previewGain(run, null);
    var total = BL.sumStats(run.stats); var agg = BL.aggregateSkills(run); var cond = D.CONDITIONS[run.cond];
    var flash = ui.flash; ui.flash = null;
    var statRows = D.STATS.map(function (s) {
      var g = BL.previewGain(run, s)[s];
      var pop = (flash && flash.gains && flash.gains[s]) ? '<span class="gain-pop' + (flash.stat === s ? ' main' : '') + '">+' + flash.gains[s] + '</span>' : '';
      return '<div class="stat-row" style="--c:' + D.STAT_META[s].color + '"><div class="stat-name"><b>' + s + '</b><i>' + D.STAT_META[s].en + '</i></div><div class="stat-val">' + num(run.stats[s]) + pop + '</div>' +
        '<button class="btn train" data-action="train" data-arg="' + s + '"><span>' + D.STAT_META[s].jp + '練習</span><small>主 +' + g + ' / 副 +' + gains[s] + '</small></button></div>';
    }).join('');
    var optPrev = preview.map(function (o) { return '<div class="opt-prev' + (o.wall ? ' wall' : '') + '"><b>' + o.key + '</b><span class="bar"><i style="width:' + Math.round(o.p) + '%;background:' + (D.OPTIONS[o.key] || { color: '#fff' }).color + '"></i></span><em>' + (o.wall ? '0%（壁）' : pct(o.p)) + '</em><small>' + o.stats.join('+') + ' ' + num(o.power) + '/' + num(o.rate) + '</small></div>'; }).join('');
    var cut = arc.cut || {}; var reqs = [];
    if (cut.statReq) reqs.push({ label: '合計ステータス ' + num(cut.statReq), ok: total >= cut.statReq, cur: num(total) });
    if (cut.leagueWins) reqs.push({ label: 'リーグ ' + cut.leagueWins + ' 勝以上', ok: run.arcState.wins >= cut.leagueWins ? true : null, cur: run.arcState.wins + '勝' + run.arcState.losses + '敗' });
    if (cut.finalMustWin) reqs.push({ label: '最終戦 vs チームV 勝利', ok: null, cur: '試合で判定' });
    if (cut.bidReq) reqs.push({ label: '年俸 ' + yen(cut.bidReq) + ' 以上', ok: run.bid >= cut.bidReq, cur: yen(run.bid) });
    if (arc.id === 'wc') reqs.push({ label: 'グループ 2勝以上', ok: run.arcState.wins >= 2 ? true : null, cur: run.arcState.wins + '勝' + run.arcState.losses + '敗' });
    var reqHtml = reqs.map(function (r) { return '<li class="' + (r.ok === null ? 'pending' : (r.ok ? 'ok' : 'ng')) + '"><span>' + r.label + '</span><b>' + r.cur + '</b></li>'; }).join('');
    var sigHtml = run.sig ? '<span class="chip sig" style="--c:' + D.STAT_META[D.TYPE_MAP[card.type].stat].color + '">★ ' + esc(c.sig.name) + '<b>Lv.' + run.sig + '</b></span>' : '';
    var logHtml = run.log.slice(-6).reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
    var adv = BL.advisorById(run.advisorId); var club = run.club ? BL.clubById(run.club) : null;
    return '<section class="screen training"><header class="chapter-head' + (run.weeksLeft <= 1 ? ' urgent' : '') + '">' +
      '<div class="ch-title">第' + arc.n + '章：' + esc(arc.title) + ' — ' + esc(seg.name) + '</div><div class="weeks">公式戦まで <b>あと ' + run.weeksLeft + ' 週</b></div><div class="ch-sub">' + esc(mdef.name) + '</div>' +
      '<div class="head-btns"><button class="btn ghost sm" data-action="open-story">ストーリー</button><button class="btn ghost sm" data-action="to-lobby">ロビー</button></div></header>' +
      '<div class="train-grid"><div class="col"><div class="panel player">' +
      '<div class="player-name" style="--rc:' + rc(card.rar) + '"><span class="rarity">' + stars(card.rar) + '</span><b>' + esc(c.name) + '</b><span class="muted">【' + esc(card.title) + '】' + typeIcon(card.type) + '</span><small>' + esc(c.passive.name) + '：' + esc(c.passive.desc) + ' ／ アドバイザー ' + esc(adv.name) + '：' + esc(adv.desc) + (club ? ' ／ ' + esc(club.passive.desc) : '') + '</small></div>' +
      '<div class="hp ' + hpClass(run.hp) + '"><div class="hp-label"><span>肉体健全度 HP</span><b>' + run.hp + '%</b><em>' + hpLabel(run.hp) + '</em></div><div class="hp-bar"><i style="width:' + run.hp + '%"></i></div></div>' +
      '<div class="money"><span class="cond" style="color:' + cond.color + '">' + cond.icon + ' ' + cond.label + '</span><span>BLランク <b>' + (run.rank || 300) + '位</b></span><span>年俸 <b>' + yen(run.bid) + '</b></span><span>Cash <b>' + cash(run.cash) + '</b></span><span>💎 <b>' + num(state.meta.gems) + '</b></span></div>' +
      (run.protein || run.note ? '<div class="buffs">' + (run.protein ? '<span class="tag gold">🥤 次回練習×2</span>' : '') + (run.note ? '<span class="tag gold">📓 次試合 +10%</span>' : '') + '</div>' : '') + '</div>' +
      '<div class="panel stats">' + statRows + '<div class="stat-total">合計 <b>' + num(total) + '</b> <small>スキル乗数 ×' + (1 + P.SKILL_STEP * agg.count).toFixed(2) + ' / 環境倍率 ×' + arc.envMult + ' / HP効率 ×' + BL.hpEfficiency(run.hp) + ' / コンディション ×' + cond.mult + '</small></div></div>' +
      '<div class="cmd-row"><button class="btn rest" data-action="rest"><span>休養</span><small>1週消費・HP +' + (P.REST_HEAL + BL.playerMods(run).restBonus) + '%</small></button><button class="btn store" data-action="open-store"><span>購買部</span><small>週消費なし・Cash ' + cash(run.cash) + '</small></button></div>' +
      '<p class="hint">練習：HP 約' + BL.expectedHpCost(run) + '% 消費。HP30%未満で練習を強行すると ' + Math.round(BL.injuryChance(run) * 100) + '% の確率で選手生命が終了する。ショートカット：1〜5 練習 / R 休養 / S 購買部</p></div>' +
      '<div class="col"><div class="panel next-match"><h4>次の試合：' + esc(mdef.enemy) + '</h4><div class="muted">' + esc(mdef.lead) + '</div><div class="muted small">' + esc(ruleText(mdef)) + '</div>' +
      '<div class="opt-prevs">' + optPrev + '</div><div class="muted small">原作：' + esc(mdef.canon || '') + '</div></div>' +
      '<div class="panel reqs"><h4>章末の足切り条件</h4><ul class="req-list">' + (reqHtml || '<li class="pending"><span>この章の足切りは試合結果のみ</span><b>—</b></li>') + '</ul></div>' +
      '<div class="panel skills"><h4>覚醒スキル <small>' + agg.count + ' 個</small> <button class="btn ghost sm" data-action="open-skills">一覧</button></h4>' + sigHtml + (skillChips(run.skills) || (run.sig ? '' : '<div class="muted">なし（Climax 成功時に該当ステータスが閾値を超えていれば覚醒）</div>')) + '</div>' +
      '<div class="panel log"><h4>ログ</h4><ul>' + logHtml + '</ul></div></div></div></section>';
  }
  function skillChips(skills) {
    var ids = Object.keys(skills).filter(function (id) { return skills[id] > 0; });
    ids.sort(function (a, b) { var sa = BL.skillById(a), sb = BL.skillById(b); return sb.tier - sa.tier || sa.family.localeCompare(sb.family); });
    return ids.map(function (id) { var sk = BL.skillById(id); return '<span class="chip" style="--c:' + D.STAT_META[sk.family].color + '" title="' + esc(sk.desc) + '">' + esc(sk.name) + '<b>Lv.' + skills[id] + '</b></span>'; }).join('');
  }
  function renderSkillList() {
    var player = state.wc ? BL.hofById(state, state.wc.hofId) : state.run; var skills = player ? player.skills : {};
    var body = ['SHT', 'SPD', 'TEC', 'INT', 'PHY'].map(function (f) {
      var rows = D.SKILLS.filter(function (s) { return s.family === f; }).map(function (s) { var lv = skills[s.id] || 0; return '<tr class="' + (lv ? 'have' : '') + '"><td>T' + s.tier + '</td><td><b>' + esc(s.name) + '</b></td><td>' + f + ' ≥ ' + s.th + '</td><td>' + esc(s.desc) + '</td><td>' + (lv ? 'Lv.' + lv : '—') + '</td></tr>'; }).join('');
      return '<h4 style="color:' + D.STAT_META[f].color + '">' + esc(D.FAMILY_JP[f]) + '</h4><table class="tbl"><tbody>' + rows + '</tbody></table>';
    }).join('');
    return '<div class="modal-head"><h2>スキル一覧</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><p class="muted">Climax 成功時、選択肢に対応する系統のうち閾値を満たした最上位スキルが覚醒（同スキル所持時の重複は35%、FLOW 成功時は確定）。所持数が増えるほど練習獲得倍率が上昇する。</p>' + body;
  }
  function renderStoryModal() {
    var run = state.run; var arc = BL.arcOf(run); var mdef = BL.currentMatchDef(run);
    return '<div class="modal-head"><h2>第' + arc.n + '章 ' + esc(arc.title) + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="story-body small">' + arc.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      (mdef ? '<div class="passive big"><b>次の試合：' + esc(mdef.name) + '</b><br>' + esc(mdef.intro || '') + '<br><small class="muted">' + esc(mdef.canon || '') + '</small></div>' : '');
  }
  function renderStore() {
    var run = state.run;
    var items = D.ITEMS.map(function (it) {
      var price = BL.itemPrice(it, run);
      var why = run.cash < price ? 'Cash 不足' : (it.id === 'capsule' && run.hp >= 100) ? 'HP は既に100%' : ((it.id === 'protein' && run.protein) || (it.id === 'note' && run.note)) ? '適用済み（買いだめ不可）' : '';
      return '<div class="item"><div class="item-icon">' + it.icon + '</div><div class="item-body"><b>' + esc(it.name) + '</b><div class="muted">' + esc(it.desc) + '</div></div><button class="btn primary" data-action="buy" data-arg="' + it.id + '"' + (why ? ' disabled' : '') + '>' + cash(price) + '<small>' + (why || '即時適用') + '</small></button></div>';
    }).join('');
    return '<div class="modal-head"><h2>購買部</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div><div class="muted">所持 Cash <b>' + cash(run.cash) + '</b> ／ 価格は章番号に比例。購入と同時に即時消費され、週は消費しない。</div><div class="items">' + items + '</div>';
  }
  function renderEventModal() {
    var run = state.run; var m = ui.modal;
    if (m.result) {
      var r = m.result;
      return '<div class="event"><div class="ev-kicker">突発化学反応イベント</div><h2>' + esc(r.title) + '</h2><div class="ev-choice">▶ ' + esc(r.label) + '</div><p class="ev-text ' + (r.rollWin === false ? 'bad' : '') + '">' + esc(r.text) + '</p>' +
        (r.effects.length ? '<div class="ev-fx">' + r.effects.map(function (e) { return '<span class="tag">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + '<div class="modal-foot"><button class="btn primary" data-action="close-event">続ける</button></div></div>';
    }
    var ev = BL.eventById(run.event.id);
    var choices = ev.choices.map(function (ch, i) { return '<button class="btn choice" data-action="event-choice" data-arg="' + i + '"><span>' + esc(ch.label) + '</span>' + (ch.fx.roll ? '<small class="risk">成功率 ' + Math.round(ch.fx.roll.p * 100) + '% のギャンブル</small>' : '') + '</button>'; }).join('');
    return '<div class="event"><div class="ev-kicker">突発化学反応イベント — 即断せよ（選択と同時に保存）</div><h2>' + esc(ev.title) + '</h2><p class="ev-text">' + esc(ev.text) + '</p><div class="choices">' + choices + '</div></div>';
  }

  /* ------------------------------------------------------------ match */
  function renderMatch(m, ctx) {
    var dots = ''; for (var i = 0; i < m.n; i++) { var r = m.results[i]; dots += '<span class="dot' + (r ? (r.success ? ' win' : ' lose') : (i === m.idx && !m.ended ? ' now' : '')) + '"></span>'; }
    var body = (m.showResult && m.lastResult) ? renderClimaxResult(m, ctx) : (m.current ? renderClimax(m, ctx) : '');
    var flow = (m.current && m.current.flow && !m.showResult);
    return '<section class="screen match' + (flow ? ' in-flow' : '') + '"><header class="match-head"><div class="mh-title">' + esc(ctx.title) + '<small>' + esc(ctx.sub) + '</small></div>' +
      '<div class="score"><div class="side me"><i>' + esc(ctx.charName) + '</i><b>' + m.me + '</b></div><div class="vs">-</div><div class="side en"><b>' + m.en + '</b><i>' + esc(ctx.enemy) + '</i></div></div>' +
      '<div class="dots">' + dots + '</div><div class="need">' + esc(ctx.needText) + '</div></header>' + body + '</section>';
  }
  function renderClimax(m, ctx) {
    var cur = m.current; var hl = ctx.highlights[Math.min(m.idx, ctx.highlights.length - 1)];
    var opts = cur.options.map(function (o) {
      var color = (D.OPTIONS[o.key] || { color: '#fff' }).color;
      var bd = o.breakdown.map(function (b) { return '<span>' + esc(b.label) + ' +' + b.v + '</span>'; }).join('');
      return '<button class="btn climax' + (o.wall ? ' wall' : '') + (o.key === 'D' ? ' meta' : '') + '" style="--oc:' + color + '" data-action="' + (ctx.kind === 'wc' ? 'wc-climax' : 'climax') + '" data-arg="' + o.key + '"><div class="cl-key">' + o.key + '</div>' +
        '<div class="cl-body"><b>' + esc(o.name) + '</b><small>' + esc(o.flavor) + '</small><div class="cl-calc">' + o.stats.join('+') + ' ' + num(o.power) + ' vs 敵レート ' + num(o.rate) + ' （比率 ' + o.ratio.toFixed(2) + '）' + (bd ? '<span class="bd">' + bd + '</span>' : '') + '</div></div>' +
        '<div class="cl-pct' + (o.p >= 70 ? ' hi' : (o.p >= 40 ? ' mid' : ' lo')) + '">' + (o.wall ? '<b>0%</b><small>完全ゼロの壁</small>' : '<b>' + o.pct + '%</b><small>成功率</small>') + '</div></button>';
    }).join('');
    return '<div class="climax-wrap">' + (m.idx === 0 && ctx.intro ? '<div class="match-intro">' + esc(ctx.intro) + '</div>' : '') +
      (cur.flow ? '<div class="flow-banner">FLOW — 覚醒。全選択肢 +20pt / 成功時スキル確定覚醒</div>' : '') +
      '<div class="highlight"><span class="hl-kicker">Climax ' + (m.idx + 1) + ' / ' + m.n + '</span><p>' + esc(hl) + '</p></div><div class="climax-opts">' + opts + '</div>' +
      '<p class="hint">選択した瞬間に判定・保存される。運による最低保証は無い。キー A/B/C/D でも選択可。</p></div>';
  }
  function renderClimaxResult(m, ctx) {
    var r = m.lastResult;
    var text = r.success ? (r.flow ? '世界がスローモーションになる。全ての選択肢が見えた——ゴォォォル！！' : ['DFを置き去りにしてゴールネットを揺らす——ゴォォォル！！', 'GKの逆を突いた。完璧なフィニッシュ——ゴール！', '軌道は読めない。ボールはゴールへ吸い込まれた——ゴール！'][r.idx % 3]) :
      ['ボールロスト——カウンターを浴び、失点。', '読まれていた。ボールを奪われ、一瞬で失点。', 'シュートは枠を外れ、カウンターから失点。'][r.idx % 3];
    if (m.rule === 'single') text = r.success ? '——切り抜けた。' : '——届かなかった。';
    var endInfo = '';
    if (m.ended) { if (m.cold) endInfo = '<div class="cold">コールド負け — 勝利条件の達成が数学的に不可能。試合は打ち切られた。</div>'; else if (m.draw) endInfo = '<div class="cold">同点 — 延長戦なし。即時敗北。</div>'; else endInfo = '<div class="end ' + (m.won ? 'won' : 'lost') + '">試合終了 ' + m.me + ' - ' + m.en + ' ' + (m.won ? '勝利' : '敗北') + '</div>'; }
    var skill = r.skill ? '<div class="awaken" style="--c:' + D.STAT_META[r.skill.family].color + '"><i>スキル覚醒</i><b>' + esc(r.skill.name) + ' Lv.' + r.skill.lv + '</b><small>' + esc(r.skill.desc) + '</small></div>' : '';
    var sig = r.sig ? '<div class="awaken sigaw" style="--c:' + D.STAT_META[r.sig.family].color + '"><i>固有エゴ覚醒</i><b>' + esc(r.sig.name) + ' Lv.' + r.sig.lv + '</b><small>' + esc(r.sig.desc) + '</small></div>' : '';
    var nextAction = ctx.kind === 'wc' ? 'wc-next' : 'climax-next';
    var nextLabel = m.ended ? (ctx.kind === 'wc' ? '結果へ' : '試合結果へ') : '次の局面へ';
    return '<div class="result-wrap ' + (r.success ? 'success' : 'fail') + '"><div class="res-kicker">Climax ' + (r.idx + 1) + ' — ' + r.key + ' ' + esc(r.name) + ' (' + r.p + '%)' + (r.flow ? ' [FLOW]' : '') + '</div>' +
      '<div class="res-big">' + (r.success ? (m.rule === 'single' ? 'CLEAR' : 'GOAL') : 'LOST') + '</div><p class="res-text">' + esc(text) + '</p>' + skill + sig + endInfo +
      '<div class="modal-foot center"><button class="btn primary lg" data-action="' + nextAction + '">' + nextLabel + '</button></div></div>';
  }
  function renderMatchResult() {
    var run = state.run; var mr = run.matchResult; var arc = BL.arcOf(run);
    var cls = mr.outcome === 'eliminated' ? 'elim' : (mr.won ? 'won' : 'lost');
    var label = { advance: mr.won ? '次へ' : '次へ（試合単位の除籍なし）', branch: '2ndステージへ（2対2）', nominated: '凛の指名で突破 — 次へ', eliminated: '除籍処分を受ける' }[mr.outcome];
    return '<section class="screen evaluation"><header class="eval-head"><div class="ch-title">第' + arc.n + '章 ' + esc(arc.title) + '</div><h2 class="mr-name">' + esc(mr.name) + '</h2></header>' +
      '<div class="mr-score ' + cls + '"><b>' + mr.me + ' - ' + mr.en + '</b><span>' + (mr.cold ? 'コールド負け' : mr.draw ? '引き分け＝敗北' : mr.won ? '勝利' : '敗北') + '</span></div>' +
      '<p class="res-text center">' + esc(mr.text || '') + '</p>' + (mr.detail ? '<div class="' + (mr.outcome === 'eliminated' ? 'cold' : 'notice') + '">' + esc(mr.detail) + '</div>' : '') +
      '<div class="eval-grid"><div class="panel bid"><h4>年俸（入札）査定</h4><div class="bid-num" data-count="' + mr.bidTotal + '" data-from="' + (mr.bidTotal - mr.bidGain) + '">' + yen(mr.bidTotal - mr.bidGain) + '</div><div class="muted">今回 +' + yen(mr.bidGain) + '（ゴール ' + mr.goals + ' × 査定倍率 ×' + BL.bidMultiplier(run).toFixed(2) + (mr.wins === mr.n && mr.n > 1 ? ' × MVP1.5' : '') + '）</div>' +
      '<div class="money"><span>Cash 報酬 <b>+' + cash(mr.cashGain) + '</b></span><span>所持 <b>' + cash(mr.cashTotal) + '</b></span><span>BLランキング <b>' + mr.rank + '位</b></span></div></div>' +
      '<div class="panel"><h4>原作では</h4><p class="muted">' + esc(mr.canon || '') + '</p><h4>章内戦績</h4><p class="muted">' + run.arcState.wins + '勝 ' + run.arcState.losses + '敗 / ' + run.arcState.goals + ' ゴール</p></div></div>' +
      '<div class="modal-foot center"><button class="btn ' + (mr.outcome === 'eliminated' ? 'danger' : 'primary') + ' lg" data-action="match-next">' + label + '</button></div></section>';
  }

  /* ------------------------------------------------------------ evaluation / end */
  function renderEvaluation() {
    var run = state.run; var ev = run.evalResult;
    var checks = ev.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'ng') + '"><span>' + esc(c.label) + '</span><b>' + esc(String(c.value)) + '</b></li>'; }).join('');
    var verdict = ev.survived ? '<div class="verdict survive">' + (ev.isFinal ? '世界一達成 — 殿堂入り' : '生存 — 次章へ') + '<small>Ego Gems +' + ev.gems + '</small></div>' : '<div class="verdict elim">除籍<small>補償 Ego Gems +' + ev.gems + '</small></div>';
    return '<section class="screen evaluation"><header class="eval-head"><div class="ch-title">第' + ARCS[ev.arc].n + '章 ' + esc(ev.title) + ' — 査定・選別</div><div class="muted">合計ステータス ' + num(ev.total) + ' / 年俸 ' + yen(ev.bid) + ' / BLランキング ' + ev.rank + '位</div></header>' +
      '<div class="panel"><h4>足切りサバイバル判定</h4><ul class="req-list big">' + checks + '</ul></div>' + verdict +
      '<div class="modal-foot center"><button class="btn ' + (ev.survived ? 'primary' : 'danger') + ' lg" data-action="eval-next">' + (ev.survived ? (ev.isFinal ? '殿堂へ' : '次章へ') : '除籍処分を受ける') + '</button></div></section>';
  }
  function renderGameover() {
    var run = state.run; var g = run.gameover; var card = BL.cardById(run.cardId);
    var reason = { injury: '故障 — 選手生命の終了', cold: 'コールド負け', lost: '敗北', cutoff: '足切り' }[g.reason] || '除籍';
    return '<section class="screen gameover"><div class="go-big">除籍</div><div class="go-sub">ELIMINATED</div><div class="go-box"><div class="go-reason">' + esc(reason) + '</div><p>' + esc(g.detail) + '</p>' +
      '<div class="muted">' + esc(BL.cardName(card)) + ' ／ 第' + ARCS[g.arc].n + '章「' + esc(ARCS[g.arc].title) + '」で脱落 ／ 合計 ' + num(g.total) + ' ／ スキル ' + g.skills + ' ／ 年俸 ' + yen(g.bid) + ' ／ BLランキング ' + (run.rank || 300) + '位</div>' +
      '<div class="go-gems">補償 Ego Gems <b>+' + g.gems + '</b> → 所持 ' + num(state.meta.gems) + '</div><p class="muted">育成データは完全に抹消される。やり直しは存在しない。</p></div>' +
      '<div class="modal-foot center"><button class="btn danger lg" data-action="close-run">ロビーへ強制送還</button></div></section>';
  }
  function renderClear() {
    var run = state.run; var card = BL.cardById(run.cardId);
    var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(run.stats[s]) + '</span>'; }).join('');
    return '<section class="screen clear"><div class="clear-kicker">U-20 WORLD CUP CHAMPION</div><div class="clear-big">世界一</div><div class="go-box gold"><h3>' + stars(card.rar) + ' ' + esc(BL.cardName(card)) + ' — 殿堂入り</h3><div class="stat-line">' + st + '</div>' +
      '<div class="muted">最終年俸 ' + yen(run.bid) + ' ／ スキル ' + BL.aggregateSkills(run).count + ' ／ 通算ゴール ' + run.totals.goals + ' ／ ' + run.totals.matchWins + '勝' + (run.totals.matches - run.totals.matchWins) + '敗</div>' +
      '<p>この選手は殿堂入りとして永続保存され、メインメニューから「FIFAワールドカップ（成人A代表・世界決戦モード）」へ出撃できる。</p></div><div class="modal-foot center"><button class="btn gold lg" data-action="close-run">ロビーへ</button></div></section>';
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
      var ctx = { kind: 'wc', title: 'FIFA W杯 ' + st.name, sub: st.flag + ' ' + st.team, enemy: st.team, lead: st.star, highlights: D.WORLD_CUP.highlights, intro: st.intro, needText: ruleText(wc.match), charName: entry.name };
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

  /* ------------------------------------------------------------ actions */
  var actions = {
    'title-start': function () { ui.screen = 'game'; ui.inLobby = false; sfx('click'); render(); },
    'lobby-tab': function (arg) { ui.lobbyTab = arg; render(); },
    'roster-filter': function (arg) { ui.rosterFilter = arg; render(); },
    'close-modal': function () { ui.modal = null; render(); },
    'open-rules': function () { ui.modal = { type: 'rules' }; render(); },
    'open-story': function () { ui.modal = { type: 'story' }; render(); },
    'card-detail': function (arg) { ui.modal = { type: 'card', cardId: arg }; render(); },
    'open-skills': function () { ui.modal = { type: 'skills' }; render(); },
    'to-lobby': function () { ui.inLobby = true; ui.lobbyTab = 'roster'; render(); },
    'resume-run': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'toggle-sfx': function () { var v = BL.toggleSfx(state); BL.SFX.setEnabled(v); render(); },
    'gacha': function (arg) {
      var n = parseInt(arg, 10) === 10 ? 10 : 1; var res = BL.gacha(state, n);
      if (!res.ok) { toast('Ego Gems が足りない', 'warn'); return; }
      var hi = res.results.some(function (r) { return D.RARITY[r.rar].stars >= 4; }); sfx(hi ? 'rare' : 'gacha');
      ui.modal = { type: 'gacha', results: res.results, n: n }; render();
    },
    'pick-card': function (arg) { if (state.run || state.wc) return; ui.pickCard = arg; ui.modal = { type: 'advisor' }; render(); },
    'start-run': function (arg) {
      var res = BL.startRun(state, ui.pickCard, arg);
      if (!res.ok) { toast({ active: '育成中の選手がいる', notowned: '所持していない', advisor: 'アドバイザーが未解放' }[res.reason] || '開始できない', 'warn'); return; }
      ui.modal = null; ui.inLobby = false; render();
      blackout(BL.cardName(BL.cardById(ui.pickCard)) + ' — 青い監獄 入寮', 1300, render);
    },
    'story-next': function () { BL.continueStory(state); sfx('click'); afterWeekAction(); },
    'choose-club': function (arg) { BL.chooseClub(state, arg); sfx('click'); afterWeekAction(); },
    'train': function (arg) {
      if (ui.busy || !clickGuard()) return; var res = BL.train(state, arg); if (!res.ok) return;
      if (res.injured) { afterWeekAction(); return; }
      sfx('train'); ui.flash = { gains: res.gains, stat: arg }; afterWeekAction();
    },
    'rest': function () { if (ui.busy || !clickGuard()) return; var res = BL.rest(state); if (!res.ok) return; sfx('rest'); afterWeekAction(); },
    'open-store': function () { if (!state.run || state.run.phase !== 'training') return; ui.modal = { type: 'store' }; render(); },
    'buy': function (arg) { var res = BL.buy(state, arg); if (!res.ok) { toast({ cash: 'Cash 不足', full: 'HP は既に100%', dup: '適用済み（買いだめ不可）' }[res.reason] || '購入できない', 'warn'); return; } sfx('buy'); toast(res.item.name + '：' + res.msg, 'ok'); render(); },
    'event-choice': function (arg) { var res = BL.resolveEvent(state, parseInt(arg, 10)); if (!res.ok) return; sfx('click'); ui.modal = { type: 'event', result: res }; render(); },
    'close-event': function () { ui.modal = null; afterWeekAction(); },
    'climax': function (arg) {
      if (ui.busy) return; var res = BL.chooseClimax(state, arg); if (!res) return;
      sfx(res.success ? 'goal' : 'lost'); if (res.skill || res.sig) setTimeout(function () { sfx('awaken'); }, 500); render();
    },
    'climax-next': function () {
      BL.dismissResult(state);
      var run = state.run;
      if (run && run.phase === 'match' && run.match.current && run.match.current.flow) sfx('flow');
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
      if (run.phase === 'arcIntro') { render(); blackout('第' + BL.arcOf(run).n + '章 ' + BL.arcOf(run).title + ' — 突入', 1300, render); }
      else if (run.phase === 'gameover') blackout('除籍', 1200, function () { sfx('elim'); render(); });
      else if (run.phase === 'clear') { sfx('clear'); render(); }
      else render();
    },
    'close-run': function () { BL.closeRun(state); ui.lobbyTab = 'roster'; ui.inLobby = false; render(); },
    'wc-start': function (arg) { var res = BL.startWorldCup(state, arg); if (!res.ok) { toast({ active: 'W杯出撃中の選手がいる', used: 'この選手は既に出撃済み' }[res.reason] || '出撃できない', 'warn'); return; } ui.inLobby = false; render(); },
    'wc-resume': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'wc-begin': function () { BL.wcBeginMatch(state); render(); blackout('FIFA WORLD CUP — ' + D.WORLD_CUP.stages[state.wc.stage].team, 1400, function () { sfx('whistle'); render(); }); },
    'wc-climax': function (arg) { if (ui.busy) return; var r = BL.wcChooseClimax(state, arg); if (!r) return; sfx(r.success ? 'goal' : 'lost'); render(); },
    'wc-next': function () { BL.wcDismissResult(state); if (state.wc.phase === 'end' && state.wc.champion) sfx('clear'); render(); },
    'wc-stage-next': function () { BL.wcNextStage(state); render(); },
    'wc-close': function () { BL.wcClose(state); ui.lobbyTab = 'hof'; ui.inLobby = false; render(); }
  };
  function onClick(e) {
    var el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
    var act = el.getAttribute('data-action'); var arg = el.getAttribute('data-arg');
    if (actions[act]) { e.preventDefault(); actions[act](arg, el); }
  }
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.modal && ui.modal.type !== 'event') { ui.modal = null; render(); return; }
    if (ui.modal || ui.screen === 'title' || ui.inLobby || !state.run) return;
    var run = state.run; var k = e.key.toUpperCase();
    if (run.phase === 'training') {
      var idx = ['1', '2', '3', '4', '5'].indexOf(e.key); if (idx >= 0) { actions.train(D.STATS[idx]); return; }
      if (k === 'R') { actions.rest(); return; } if (k === 'S') { actions['open-store'](); return; }
    }
    if (run.phase === 'match' && run.match) {
      if (run.match.showResult) { if (e.key === 'Enter' || e.key === ' ') actions['climax-next'](); return; }
      if (['A', 'B', 'C', 'D'].indexOf(k) >= 0) { var ok = run.match.current.options.some(function (o) { return o.key === k; }); if (ok) actions.climax(k); }
    }
  });
  render();
  root.BL_UI = { state: function () { return state; }, render: render, ui: ui };
})(typeof globalThis !== 'undefined' ? globalThis : this);
