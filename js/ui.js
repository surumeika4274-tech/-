/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  UI layer (vanilla DOM, no framework)
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL;
  var D = BL.DATA;
  var P = D.PARAMS;

  var state = BL.load();
  var ui = {
    screen: 'title',          /* 'title' | 'lobby' | 'game' (game = run/wc に従う) */
    lobbyTab: 'roster',
    inLobby: false,           /* 育成中にロビーへ一時退避しているか */
    modal: null,              /* { type:'store'|'event'|'gacha'|'skills'|'char', ... } */
    flash: null,              /* 直近の練習結果（獲得量ポップ用） */
    matchIntroDone: false,
    busy: false
  };

  /* ------------------------------------------------------------ utils */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(r) { var s = ''; for (var i = 0; i < r; i++) s += '★'; return s; }
  function num(v) { return Math.round(v).toLocaleString(); }
  function pct(v) { return Math.round(v) + '%'; }
  function yen(v) { return BL.fmtYen(v); }
  function cash(v) { return '¥' + Math.round(v).toLocaleString(); }
  function rarityColor(r) { return D.RARITY[r].color; }
  function charOf(id) { return BL.charById(id); }

  function toast(msg, kind) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2700);
  }

  function disclaimerBar() {
    return '<div class="disclaimer">' + esc(D.DISCLAIMER) + '</div>';
  }

  /* ------------------------------------------------------------ render root */
  function render() {
    var app = $('#app');
    var html = '';
    /* 保留中の突発イベントはゲーム画面表示時に必ずモーダルで前面に出す（タイトル画面では出さない） */
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
  }

  function isFlowActive() {
    var m = state.wc ? (state.wc.match) : (state.run && state.run.match);
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
      case 'char': inner = renderCharDetail(); break;
      case 'skills': inner = renderSkillList(); break;
      case 'rules': inner = renderRules(); break;
      default: inner = '';
    }
    ov.innerHTML = '<div class="modal-backdrop"><div class="modal">' + inner + '</div></div>';
    ov.hidden = false;
  }

  /* ------------------------------------------------------------ title */
  function renderTitle() {
    var hasRun = !!state.run;
    return '' +
      '<section class="screen title-screen" data-action="title-start">' +
        disclaimerBar() +
        '<div class="title-body">' +
          '<div class="title-kicker">PROJECT : WORLD CHAMPION — MODIFIED</div>' +
          '<h1 class="title-logo"><span>BLUE</span> <span class="accent">LOCK</span><small>PWC : EGOIST ROGUELITE</small></h1>' +
          '<p class="title-tag">敗者は即刻除籍。能力は青天井。エゴを覚醒させ、世界一のストライカーを撃ち抜け。</p>' +
          '<div class="title-cta">' + (hasRun ? '育成中のデータがあります — TAP TO RESUME' : 'TAP TO START') + '</div>' +
          '<div class="title-meta">Ego Gems ' + num(state.meta.gems) + ' / 周回 ' + state.meta.records.runs + ' / 殿堂入り ' + state.meta.hof.length + '</div>' +
        '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------ lobby */
  function renderLobby() {
    var m = state.meta;
    var tabs = [['roster', '所持選手'], ['gacha', 'スカウト'], ['hof', '殿堂入り / W杯'], ['records', '戦績・ルール']];
    var tabHtml = tabs.map(function (t) {
      return '<button class="tab' + (ui.lobbyTab === t[0] ? ' active' : '') + '" data-action="lobby-tab" data-arg="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var body = '';
    if (ui.lobbyTab === 'roster') body = renderRoster();
    else if (ui.lobbyTab === 'gacha') body = renderGacha();
    else if (ui.lobbyTab === 'hof') body = renderHof();
    else body = renderRecords();
    return '' +
      '<section class="screen lobby">' +
        disclaimerBar() +
        '<header class="lobby-head">' +
          '<div class="lobby-title"><span class="accent">BLUE LOCK</span> PWC — ロビー</div>' +
          '<div class="gems">💎 <b>' + num(m.gems) + '</b> Ego Gems</div>' +
        '</header>' +
        '<nav class="tabs">' + tabHtml + '</nav>' +
        '<div class="lobby-body">' + body + '</div>' +
      '</section>';
  }

  function renderRoster() {
    var ids = Object.keys(state.meta.roster);
    var chars = ids.map(charOf).filter(Boolean).sort(function (a, b) { return b.rarity - a.rarity || a.name.localeCompare(b.name, 'ja'); });
    var cards = chars.map(function (c) {
      var own = state.meta.roster[c.id];
      var base = BL.effectiveBase(c, own.dupes);
      var statLine = D.STATS.map(function (s) {
        return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(base[s]) + '</span>';
      }).join('');
      return '' +
        '<article class="card char-card r' + c.rarity + '" style="--rc:' + rarityColor(c.rarity) + '">' +
          '<div class="card-top">' +
            '<div class="rarity">' + stars(c.rarity) + '</div>' +
            '<div class="lb">' + (own.dupes ? '限界突破 +' + own.dupes + ' (基礎+' + Math.round(own.dupes * P.LB_STEP * 100) + '% / 成長+' + Math.round(own.dupes * P.LB_GROWTH * 100) + '%)' : '限界突破 なし') + '</div>' +
          '</div>' +
          '<h3>' + esc(c.name) + '<small>' + esc(c.tag) + ' — ' + esc(D.RARITY[c.rarity].label) + '</small></h3>' +
          '<div class="stat-line">' + statLine + '<span class="st total"><i>合計</i>' + num(BL.sumStats(base)) + '</span></div>' +
          '<div class="passive"><b>' + esc(c.passive.name) + '</b> ' + esc(c.passive.desc) + '</div>' +
          '<div class="card-actions">' +
            '<button class="btn ghost" data-action="char-detail" data-arg="' + c.id + '">詳細</button>' +
            '<button class="btn primary" data-action="start-run" data-arg="' + c.id + '"' + (state.run ? ' disabled' : '') + '>この選手で育成開始</button>' +
          '</div>' +
        '</article>';
    }).join('');
    var note = state.run ? '<div class="notice warn">育成中の選手がいます。RUN を終えるまで新規育成は開始できません（リセット・放棄は不可）。<button class="btn primary sm" data-action="resume-run">育成を再開</button></div>' :
               state.wc ? '<div class="notice warn">FIFAワールドカップに出撃中の選手がいます。<button class="btn gold sm" data-action="wc-resume">W杯を再開</button></div>' : '';
    return note + '<div class="grid">' + cards + '</div>';
  }

  function renderCharDetail() {
    var c = charOf(ui.modal.charId); if (!c) return '';
    var own = state.meta.roster[c.id];
    var base = BL.effectiveBase(c, own ? own.dupes : 0);
    var rows = D.STATS.map(function (s) {
      return '<tr><td style="color:' + D.STAT_META[s].color + '"><b>' + s + '</b> ' + D.STAT_META[s].jp + '</td><td>' + num(base[s]) + '</td><td>×' + c.growth[s].toFixed(2) + '</td><td class="muted">' + esc(D.STAT_META[s].desc) + '</td></tr>';
    }).join('');
    return '' +
      '<div class="modal-head"><h2 style="color:' + rarityColor(c.rarity) + '">' + stars(c.rarity) + ' ' + esc(c.name) + '</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<p class="muted">' + esc(D.RARITY[c.rarity].label) + ' / ' + esc(c.tag) + '</p>' +
      '<table class="tbl"><thead><tr><th>能力</th><th>初期値</th><th>成長補正</th><th>説明</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="passive big"><b>固有エゴ：' + esc(c.passive.name) + '</b><br>' + esc(c.passive.desc) + '</div>' +
      (own ? '<p class="muted">限界突破 +' + own.dupes + '（同一キャラ再排出で自動加算。初期値+5%・成長+3%/回、周回を跨いで永続）</p>' : '<p class="muted">未所持</p>');
  }

  function renderGacha() {
    var m = state.meta;
    var rateRows = [8, 7, 6, 5, 4, 3, 2, 1].map(function (r) {
      var names = D.CHARACTERS.filter(function (c) { return c.rarity === r; }).map(function (c) { return esc(c.name); }).join('、');
      return '<tr><td style="color:' + rarityColor(r) + '">' + stars(r) + '</td><td>' + esc(D.RARITY[r].label) + '</td><td class="num">' + D.RARITY[r].rate.toFixed(1) + '%</td><td class="muted">' + names + '</td></tr>';
    }).join('');
    return '' +
      '<div class="gacha-panel">' +
        '<div class="gacha-cta">' +
          '<div><div class="muted">所持 Ego Gems</div><div class="big-num">💎 ' + num(m.gems) + '</div></div>' +
          '<div class="gacha-btns">' +
            '<button class="btn primary" data-action="gacha" data-arg="1"' + (m.gems < P.GACHA_SINGLE ? ' disabled' : '') + '>単発スカウト<small>' + P.GACHA_SINGLE + ' Gems</small></button>' +
            '<button class="btn gold" data-action="gacha" data-arg="10"' + (m.gems < P.GACHA_TEN ? ' disabled' : '') + '>10連スカウト<small>' + P.GACHA_TEN + ' Gems</small></button>' +
          '</div>' +
        '</div>' +
        '<p class="muted">天井・確定枠は存在しない。所持済みキャラの再排出は自動的に「限界突破」となり、全基礎ステータス+5%と成長補正+3%が永続的に加算される。</p>' +
        '<table class="tbl"><thead><tr><th>レア</th><th>クラス</th><th>排出率</th><th>対象</th></tr></thead><tbody>' + rateRows + '</tbody></table>' +
      '</div>';
  }

  function renderGacha10Card(r) {
    var c = charOf(r.id);
    return '<div class="pull r' + r.rarity + (r.rarity >= 6 ? ' hi' : '') + '" style="--rc:' + rarityColor(r.rarity) + '; animation-delay:' + (r._i * 90) + 'ms">' +
      '<div class="pull-r">' + stars(r.rarity) + '</div><div class="pull-n">' + esc(c.name) + '</div>' +
      '<div class="pull-t">' + (r.isNew ? '<b class="new">NEW</b>' : '限界突破 +' + r.dupes) + '</div></div>';
  }
  function renderGachaResult() {
    var res = ui.modal.results.map(function (r, i) { r._i = i; return renderGacha10Card(r); }).join('');
    return '<div class="modal-head"><h2>スカウト結果</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<div class="pulls">' + res + '</div>' +
      '<div class="modal-foot"><span class="muted">残り 💎 ' + num(state.meta.gems) + '</span>' +
      '<button class="btn primary" data-action="gacha" data-arg="' + ui.modal.n + '"' + (state.meta.gems < (ui.modal.n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE) ? ' disabled' : '') + '>もう一度（' + (ui.modal.n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE) + '）</button></div>';
  }

  function renderHof() {
    var hof = state.meta.hof;
    if (!hof.length) return '<div class="notice">殿堂入り選手はまだいない。第5章「U-20 W杯決勝」を 3対0 の完全勝利で制した選手だけがここに刻まれ、FIFAワールドカップ（成人A代表・世界決戦モード）への出撃権を得る。</div>';
    var list = hof.slice().reverse().map(function (e) {
      var c = charOf(e.charId);
      var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(e.stats[s]) + '</span>'; }).join('');
      var wc = e.wc || { status: 'none' };
      var wcLabel = wc.status === 'none' ? '<span class="tag">W杯 未出撃</span>' :
                    wc.status === 'inprogress' ? '<span class="tag warn">W杯 出撃中</span>' :
                    wc.status === 'champion' ? '<span class="tag gold">🏆 FIFA W杯 優勝</span>' :
                    '<span class="tag danger">W杯 ' + esc(D.WORLD_CUP.stages[Math.min(wc.stage, D.WORLD_CUP.stages.length - 1)].name) + ' 敗退</span>';
      var btn = wc.status === 'none' ? '<button class="btn gold" data-action="wc-start" data-arg="' + e.id + '"' + (state.wc ? ' disabled' : '') + '>FIFAワールドカップに出撃（一発勝負）</button>' :
                wc.status === 'inprogress' ? '<button class="btn primary" data-action="wc-resume">W杯を再開</button>' : '';
      return '<article class="card hof-card" style="--rc:' + rarityColor(e.rarity) + '">' +
        '<div class="card-top"><div class="rarity">' + stars(e.rarity) + '</div>' + wcLabel + '</div>' +
        '<h3>' + esc(e.name) + '<small>' + esc(c ? c.tag : '') + ' — ' + new Date(e.clearedAt).toLocaleDateString('ja-JP') + ' 世界一達成</small></h3>' +
        '<div class="stat-line">' + st + '<span class="st total"><i>合計</i>' + num(BL.sumStats(e.stats)) + '</span></div>' +
        '<div class="muted">最終年俸 ' + yen(e.bid) + ' / スキル ' + BL.skillCount(e.skills) + ' / ゴール ' + e.totals.goals + '</div>' +
        '<div class="card-actions">' + btn + '</div></article>';
    }).join('');
    return '<div class="notice">FIFAワールドカップは殿堂入り選手ごとに<b>一度きり</b>の挑戦。4回の Climax で3勝以上（2-2 の引き分けは即時敗北）を4連戦。敗退した選手は再挑戦できない。</div><div class="grid">' + list + '</div>';
  }

  function renderRecords() {
    var r = state.meta.records;
    return '<div class="records">' +
      '<div class="kpis">' +
        '<div class="kpi"><i>周回数</i><b>' + r.runs + '</b></div>' +
        '<div class="kpi"><i>除籍回数</i><b>' + r.eliminations + '</b></div>' +
        '<div class="kpi"><i>世界一達成</i><b>' + r.clears + '</b></div>' +
        '<div class="kpi"><i>最高到達章</i><b>' + (r.bestChapter ? '第' + r.bestChapter + '章 突破' : '—') + '</b></div>' +
        '<div class="kpi"><i>スカウト回数</i><b>' + r.gachaPulls + '</b></div>' +
        '<div class="kpi"><i>FIFA W杯 優勝</i><b>' + r.wcTitles + '</b></div>' +
      '</div>' +
      '<button class="btn ghost" data-action="open-rules">ルール・仕様を読む</button>' +
      '</div>';
  }

  function renderRules() {
    var chRows = D.CHAPTERS.map(function (c) {
      var req = [];
      if (c.statReq) req.push('合計ステータス ' + c.statReq + ' 以上');
      if (c.goalReq) req.push('公式戦で ' + c.goalReq + ' ゴール以上');
      if (c.winReq) req.push('Climax ' + c.winReq + ' 勝以上 ＆ 試合勝利');
      if (c.bidReq) req.push('年俸評価 ' + yen(c.bidReq) + ' 以上');
      return '<tr><td>第' + c.n + '章 ' + esc(c.title) + '</td><td>' + c.weeks + '週</td><td>' + esc(c.enemy.name) + '</td><td>' + req.join(' / ') + '</td></tr>';
    }).join('');
    return '<div class="modal-head"><h2>ルール</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<div class="rules">' +
      '<h4>進行</h4><ul>' +
      '<li>練習・休養ボタンは1クリックで即座に1週を消費する。確認ダイアログは存在しない。</li>' +
      '<li>すべての行動はクリックした瞬間に LocalStorage へ上書き保存される。リロードしてもやり直しは不可能。</li>' +
      '<li>「あと0週」になった瞬間、強制的に公式戦へ突入する。</li></ul>' +
      '<h4>肉体健全度（HP）</h4><ul>' +
      '<li>練習でHPを約15%消費。休養で+40%回復。</li>' +
      '<li>HP 50%以上：万全（効率100%）／30〜49%：疲労（効率50%）／30%未満：危険水域（効率35%、練習強行で40%の確率で靭帯断裂＝即除籍）。</li></ul>' +
      '<h4>成長</h4><ul>' +
      '<li>獲得量 = (基礎値×章環境倍率 + 現在値×複利率) × スキル乗数(1.05^所持数) × 成長補正 × HP効率。上限なし、デバフなし。</li></ul>' +
      '<h4>試合（Climax）</h4><ul>' +
      '<li>成功率 = 対応2ステータス合計 ÷ 敵レート の比率をシグモイド関数で変換。比率 0.7 未満は容赦なく 0%（補正無効）。</li>' +
      '<li>スキル・固有エゴ・アナライズノートは失敗率を割合で削る乗算補正。FLOW は +20pt 加算。</li>' +
      '<li>最良選択肢の成功率が 25〜40% の絶望的局面では 25% の確率で FLOW に突入し、成功すればスキルが確定覚醒する。</li>' +
      '<li>失敗はカウンターを浴びて失点。勝利条件の達成が数学的に不可能になった瞬間、残りの Climax を行わずコールド負けで除籍。同点は延長なしの即時敗北。</li></ul>' +
      '<h4>章と足切り</h4><table class="tbl"><thead><tr><th>章</th><th>週</th><th>敵</th><th>生存条件</th></tr></thead><tbody>' + chRows + '</tbody></table>' +
      '<h4>ローグライト</h4><ul>' +
      '<li>章生存で Ego Gems +500、第5章制覇でさらに +2000。除籍時は到達章×300 の補償ジェム。</li>' +
      '<li>同一キャラの再排出は限界突破（初期値+5%・成長+3%）として周回を跨いで蓄積。新規 RUN へのステータス持ち越しは無い。</li></ul>' +
      '</div>';
  }

  /* ------------------------------------------------------------ run */
  function renderRun() {
    var run = state.run;
    switch (run.phase) {
      case 'training':
      case 'event': return renderTraining();
      case 'match': return renderMatch(run.match, runMatchCtx());
      case 'evaluation': return (run.match && run.match.showResult) ? renderMatch(run.match, runMatchCtx()) : renderEvaluation();
      case 'gameover': return renderGameover();
      case 'clear': return renderClear();
    }
    return '';
  }

  function runMatchCtx() {
    var run = state.run; var ch = BL.chapterByN(run.chapter);
    return { kind: 'run', title: '第' + ch.n + '章 ' + ch.title, sub: ch.sub, enemy: ch.enemy.name, lead: ch.enemy.lead, highlights: ch.highlights,
             intro: ch.intro, needText: needText(ch.winReq, ch.goalReq, run.match.n), player: run, charName: charOf(run.charId).name };
  }
  function needText(winReq, goalReq, n) {
    if (winReq >= n) return n + '回すべての Climax に勝利する「' + n + '対0の完全勝利」のみ生存';
    if (winReq > 0) return n + '回の Climax で ' + winReq + ' 勝以上 ＆ 試合勝利';
    if (goalReq > 0) return n + '回の Climax で ' + goalReq + ' ゴール以上';
    return '';
  }

  function hpClass(hp) { return hp >= 50 ? 'ok' : (hp >= 30 ? 'tired' : 'danger'); }
  function hpLabel(hp) { return hp >= 50 ? '万全' : (hp >= 30 ? '疲労（効率50%）' : '危険水域（効率35%・故障率' + Math.round(BL.injuryChance(state.run) * 100) + '%）'); }

  function renderTraining() {
    var run = state.run;
    var ch = BL.chapterByN(run.chapter);
    var c = charOf(run.charId);
    var preview = BL.previewOptions(run);
    var gains = BL.previewGain(run, null);
    var total = BL.sumStats(run.stats);
    var agg = BL.aggregateSkills(run.skills);
    var flash = ui.flash; ui.flash = null;

    var statRows = D.STATS.map(function (s) {
      var g = BL.previewGain(run, s)[s];
      var pop = (flash && flash.gains && flash.gains[s]) ? '<span class="gain-pop' + (flash.stat === s ? ' main' : '') + '">+' + flash.gains[s] + '</span>' : '';
      return '<div class="stat-row" style="--c:' + D.STAT_META[s].color + '">' +
        '<div class="stat-name"><b>' + s + '</b><i>' + D.STAT_META[s].en + '</i></div>' +
        '<div class="stat-val">' + num(run.stats[s]) + pop + '</div>' +
        '<button class="btn train" data-action="train" data-arg="' + s + '"><span>' + D.STAT_META[s].jp + '練習</span><small>主 +' + g + ' / 副 +' + gains[s] + '</small></button>' +
      '</div>';
    }).join('');

    var optPrev = preview.map(function (o) {
      return '<div class="opt-prev' + (o.wall ? ' wall' : '') + '"><b>' + o.key + '</b><span class="bar"><i style="width:' + Math.round(o.p) + '%;background:' + D.OPTIONS[o.key].color + '"></i></span><em>' + (o.wall ? '0%（壁）' : pct(o.p)) + '</em><small>' + num(o.power) + '/' + num(o.rate) + '</small></div>';
    }).join('');

    var reqs = [];
    if (ch.statReq) reqs.push({ label: '合計ステータス ' + num(ch.statReq), ok: total >= ch.statReq, cur: num(total) });
    if (ch.goalReq) reqs.push({ label: '公式戦 ' + ch.goalReq + ' ゴール以上', ok: null, cur: '試合で判定' });
    if (ch.winReq) reqs.push({ label: 'Climax ' + ch.winReq + ' 勝以上 ＆ 勝利', ok: null, cur: '試合で判定' });
    if (ch.bidReq) reqs.push({ label: '年俸 ' + yen(ch.bidReq) + ' 以上', ok: run.bid >= ch.bidReq, cur: yen(run.bid) });
    var reqHtml = reqs.map(function (r) {
      return '<li class="' + (r.ok === null ? 'pending' : (r.ok ? 'ok' : 'ng')) + '"><span>' + r.label + '</span><b>' + r.cur + '</b></li>';
    }).join('');

    var skillsHtml = skillChips(run.skills);
    var logHtml = run.log.slice(-6).reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
    var weeksCls = run.weeksLeft <= 2 ? ' urgent' : '';

    return '' +
      '<section class="screen training">' +
        '<header class="chapter-head' + weeksCls + '">' +
          '<div class="ch-title">第' + ch.n + '章：' + esc(ch.title) + '</div>' +
          '<div class="weeks">公式戦まで <b>あと ' + run.weeksLeft + ' 週</b></div>' +
          '<div class="ch-sub">' + esc(ch.sub) + '</div>' +
          '<button class="btn ghost sm lobby-link" data-action="to-lobby">ロビー（スカウト等）</button>' +
        '</header>' +
        '<div class="train-grid">' +
          '<div class="col">' +
            '<div class="panel player">' +
              '<div class="player-name" style="--rc:' + rarityColor(c.rarity) + '"><span class="rarity">' + stars(c.rarity) + '</span><b>' + esc(c.name) + '</b><small>' + esc(c.passive.name) + '：' + esc(c.passive.desc) + '</small></div>' +
              '<div class="hp ' + hpClass(run.hp) + '"><div class="hp-label"><span>肉体健全度 HP</span><b>' + run.hp + '%</b><em>' + hpLabel(run.hp) + '</em></div><div class="hp-bar"><i style="width:' + run.hp + '%"></i></div></div>' +
              '<div class="money"><span>年俸 <b>' + yen(run.bid) + '</b></span><span>Cash <b>' + cash(run.cash) + '</b></span><span>💎 <b>' + num(state.meta.gems) + '</b></span></div>' +
              (run.protein || run.note ? '<div class="buffs">' + (run.protein ? '<span class="tag gold">🥤 次回練習×2</span>' : '') + (run.note ? '<span class="tag gold">📓 次試合 +10%</span>' : '') + '</div>' : '') +
            '</div>' +
            '<div class="panel stats">' + statRows +
              '<div class="stat-total">合計 <b>' + num(total) + '</b> <small>スキル乗数 ×' + Math.pow(P.SKILL_MULT, agg.count).toFixed(2) + ' / 環境倍率 ×' + ch.envMult + ' / HP効率 ×' + BL.hpEfficiency(run.hp) + '</small></div>' +
            '</div>' +
            '<div class="cmd-row">' +
              '<button class="btn rest" data-action="rest"><span>休養</span><small>1週消費・HP +' + P.REST_HEAL + '%</small></button>' +
              '<button class="btn store" data-action="open-store"><span>購買部</span><small>週消費なし・Cash ' + cash(run.cash) + '</small></button>' +
            '</div>' +
            '<p class="hint">練習：HP 約' + BL.expectedHpCost(run) + '% 消費。HP30%未満で練習を強行すると ' + Math.round(BL.injuryChance(run) * 100) + '% の確率で選手生命が終了する。</p>' +
          '</div>' +
          '<div class="col">' +
            '<div class="panel next-match">' +
              '<h4>次の公式戦：' + esc(ch.enemy.name) + '</h4><div class="muted">' + esc(ch.enemy.lead) + '</div>' +
              '<div class="muted">' + esc(needText(ch.winReq, ch.goalReq, 3)) + '</div>' +
              '<div class="opt-prevs">' + optPrev + '</div>' +
              '<div class="muted small">A=SHT+PHY / B=INT+TEC / C=SPD+INT / D=メタビジョン（INT系上位スキルで解放）。比率0.7未満は0%の壁。</div>' +
            '</div>' +
            '<div class="panel reqs"><h4>足切り条件</h4><ul class="req-list">' + reqHtml + '</ul></div>' +
            '<div class="panel skills"><h4>覚醒スキル <small>' + agg.count + ' 個</small> <button class="btn ghost sm" data-action="open-skills">一覧</button></h4>' + (skillsHtml || '<div class="muted">なし（Climax 成功時に該当ステータスが閾値を超えていれば覚醒）</div>') + '</div>' +
            '<div class="panel log"><h4>ログ</h4><ul>' + logHtml + '</ul></div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function skillChips(skills) {
    var ids = Object.keys(skills).filter(function (id) { return skills[id] > 0; });
    ids.sort(function (a, b) { var sa = BL.skillById(a), sb = BL.skillById(b); return sb.tier - sa.tier || sa.family.localeCompare(sb.family); });
    return ids.map(function (id) {
      var sk = BL.skillById(id);
      return '<span class="chip" style="--c:' + D.STAT_META[sk.family].color + '" title="' + esc(sk.desc) + '">' + esc(sk.name) + '<b>Lv.' + skills[id] + '</b></span>';
    }).join('');
  }

  function renderSkillList() {
    var player = state.wc ? BL.hofById(state, state.wc.hofId) : state.run;
    var skills = player ? player.skills : {};
    var fams = ['SHT', 'SPD', 'TEC', 'INT', 'PHY'];
    var body = fams.map(function (f) {
      var rows = D.SKILLS.filter(function (s) { return s.family === f; }).map(function (s) {
        var lv = skills[s.id] || 0;
        return '<tr class="' + (lv ? 'have' : '') + '"><td>T' + s.tier + '</td><td><b>' + esc(s.name) + '</b></td><td>' + f + ' ≥ ' + s.th + '</td><td>' + esc(s.desc) + '</td><td>' + (lv ? 'Lv.' + lv : '—') + '</td></tr>';
      }).join('');
      return '<h4 style="color:' + D.STAT_META[f].color + '">' + esc(D.FAMILY_JP[f]) + '</h4><table class="tbl"><tbody>' + rows + '</tbody></table>';
    }).join('');
    return '<div class="modal-head"><h2>スキル一覧</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<p class="muted">Climax 成功時、選択肢に対応する系統のうち閾値を満たした最上位スキルが覚醒する（上限なし・同一スキルは Lv として重複）。所持数が増えるほど練習獲得倍率が相乗的に上昇する。</p>' + body;
  }

  function renderStore() {
    var run = state.run;
    var items = D.ITEMS.map(function (it) {
      var price = BL.itemPrice(it, run.chapter);
      var dis = run.cash < price || (it.id === 'capsule' && run.hp >= 100) || (it.id === 'protein' && run.protein) || (it.id === 'note' && run.note);
      var why = run.cash < price ? 'Cash 不足' : (it.id === 'capsule' && run.hp >= 100) ? 'HP は既に100%' : ((it.id === 'protein' && run.protein) || (it.id === 'note' && run.note)) ? '適用済み（買いだめ不可）' : '';
      return '<div class="item"><div class="item-icon">' + it.icon + '</div><div class="item-body"><b>' + esc(it.name) + '</b><div class="muted">' + esc(it.desc) + '</div></div>' +
        '<button class="btn primary" data-action="buy" data-arg="' + it.id + '"' + (dis ? ' disabled' : '') + '>' + cash(price) + (why ? '<small>' + why + '</small>' : '<small>即時適用</small>') + '</button></div>';
    }).join('');
    return '<div class="modal-head"><h2>購買部</h2><button class="btn ghost sm" data-action="close-modal">閉じる</button></div>' +
      '<div class="muted">所持 Cash <b>' + cash(run.cash) + '</b> ／ 価格は章数に比例。購入と同時に即時消費され、週は消費しない。</div>' +
      '<div class="items">' + items + '</div>';
  }

  function renderEventModal() {
    var run = state.run;
    var m = ui.modal;
    if (m.result) {
      var r = m.result;
      return '<div class="event"><div class="ev-kicker">突発化学反応イベント</div><h2>' + esc(r.title) + '</h2>' +
        '<div class="ev-choice">▶ ' + esc(r.label) + '</div>' +
        '<p class="ev-text ' + (r.rollWin === false ? 'bad' : '') + '">' + esc(r.text) + '</p>' +
        (r.effects.length ? '<div class="ev-fx">' + r.effects.map(function (e) { return '<span class="tag">' + esc(e) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="modal-foot"><button class="btn primary" data-action="close-event">続ける</button></div></div>';
    }
    var ev = BL.eventById(run.event.id);
    var choices = ev.choices.map(function (ch, i) {
      var risk = ch.fx.roll ? '<small class="risk">成功率 ' + Math.round(ch.fx.roll.p * 100) + '% のギャンブル</small>' : '';
      return '<button class="btn choice" data-action="event-choice" data-arg="' + i + '"><span>' + esc(ch.label) + '</span>' + risk + '</button>';
    }).join('');
    return '<div class="event"><div class="ev-kicker">突発化学反応イベント — 即断せよ（選択と同時に保存）</div><h2>' + esc(ev.title) + '</h2><p class="ev-text">' + esc(ev.text) + '</p><div class="choices">' + choices + '</div></div>';
  }

  /* ------------------------------------------------------------ match */
  function renderMatch(m, ctx) {
    var dots = '';
    for (var i = 0; i < m.n; i++) {
      var r = m.results[i];
      dots += '<span class="dot' + (r ? (r.success ? ' win' : ' lose') : (i === m.idx && !m.ended ? ' now' : '')) + '"></span>';
    }
    var body = '';
    if (m.showResult && m.lastResult) body = renderClimaxResult(m, ctx);
    else if (m.current) body = renderClimax(m, ctx);
    var flow = (m.current && m.current.flow && !m.showResult);
    return '' +
      '<section class="screen match' + (flow ? ' in-flow' : '') + '">' +
        '<header class="match-head">' +
          '<div class="mh-title">' + esc(ctx.title) + '<small>' + esc(ctx.sub) + '</small></div>' +
          '<div class="score"><div class="side me"><i>' + esc(ctx.charName) + '</i><b>' + m.me + '</b></div><div class="vs">-</div><div class="side en"><b>' + m.en + '</b><i>' + esc(ctx.enemy) + '</i></div></div>' +
          '<div class="dots">' + dots + '</div>' +
          '<div class="need">' + esc(ctx.needText) + '</div>' +
        '</header>' +
        body +
      '</section>';
  }

  function renderClimax(m, ctx) {
    var cur = m.current;
    var hl = ctx.highlights[Math.min(m.idx, ctx.highlights.length - 1)];
    var opts = cur.options.map(function (o) {
      var def = D.OPTIONS[o.key];
      var bd = o.breakdown.map(function (b) { return '<span>' + esc(b.label) + ' +' + b.v + '</span>'; }).join('');
      return '<button class="btn climax' + (o.wall ? ' wall' : '') + (o.key === 'D' ? ' meta' : '') + '" style="--oc:' + def.color + '" data-action="' + (ctx.kind === 'wc' ? 'wc-climax' : 'climax') + '" data-arg="' + o.key + '">' +
        '<div class="cl-key">' + o.key + '</div>' +
        '<div class="cl-body"><b>' + esc(o.name) + '</b><small>' + esc(def.flavor) + '</small>' +
          '<div class="cl-calc">' + o.stats.join('+') + ' ' + num(o.power) + ' vs 敵レート ' + num(o.rate) + ' （比率 ' + o.ratio.toFixed(2) + '）' + (bd ? '<span class="bd">' + bd + '</span>' : '') + '</div></div>' +
        '<div class="cl-pct' + (o.p >= 70 ? ' hi' : (o.p >= 40 ? ' mid' : ' lo')) + '">' + (o.wall ? '<b>0%</b><small>完全ゼロの壁</small>' : '<b>' + o.pct + '%</b><small>成功率</small>') + '</div>' +
      '</button>';
    }).join('');
    return '<div class="climax-wrap">' +
      (cur.flow ? '<div class="flow-banner">FLOW — 覚醒。全選択肢 +20% / 成功時スキル確定覚醒</div>' : '') +
      '<div class="highlight"><span class="hl-kicker">Climax ' + (m.idx + 1) + ' / ' + m.n + '</span><p>' + esc(hl) + '</p></div>' +
      '<div class="climax-opts">' + opts + '</div>' +
      '<p class="hint">選択した瞬間に判定・保存される。運による最低保証は無い。</p>' +
      '</div>';
  }

  function renderClimaxResult(m, ctx) {
    var r = m.lastResult;
    var text = r.success ?
      (r.flow ? '世界がスローモーションになる。全ての選択肢が見えた——ゴォォォル！！' : ['DFを置き去りにしてゴールネットを揺らす——ゴォォォル！！', 'GKの逆を突いた。完璧なフィニッシュ——ゴール！', '軌道は読めない。ボールはゴールへ吸い込まれた——ゴール！'][r.idx % 3]) :
      ['ボールロスト——カウンターを浴び、失点。', '読まれていた。ボールを奪われ、一瞬で失点。', 'シュートは枠を外れ、カウンターから失点。'][r.idx % 3];
    var endInfo = '';
    if (m.ended) {
      if (m.cold) endInfo = '<div class="cold">コールド負け — 勝利条件の達成が数学的に不可能。試合は打ち切られた。</div>';
      else if (m.draw) endInfo = '<div class="cold">同点 — 延長戦なし。即時敗北。</div>';
      else endInfo = '<div class="end ' + (m.won ? 'won' : 'lost') + '">試合終了 ' + m.me + ' - ' + m.en + ' ' + (m.won ? '勝利' : '敗北') + '</div>';
    }
    var skill = r.skill ? '<div class="awaken" style="--c:' + D.STAT_META[r.skill.family].color + '"><i>スキル覚醒</i><b>' + esc(r.skill.name) + ' Lv.' + r.skill.lv + '</b><small>' + esc(r.skill.desc) + '</small></div>' : '';
    var nextAction = ctx.kind === 'wc' ? 'wc-next' : 'climax-next';
    var nextLabel = m.ended ? (ctx.kind === 'wc' ? '結果へ' : '査定へ') : '次の局面へ';
    return '<div class="result-wrap ' + (r.success ? 'success' : 'fail') + '">' +
      '<div class="res-kicker">Climax ' + (r.idx + 1) + ' — ' + r.key + ' ' + esc(r.name) + ' (' + r.p + '%)' + (r.flow ? ' [FLOW]' : '') + '</div>' +
      '<div class="res-big">' + (r.success ? 'GOAL' : 'LOST') + '</div>' +
      '<p class="res-text">' + esc(text) + '</p>' + skill + endInfo +
      '<div class="modal-foot center"><button class="btn primary lg" data-action="' + nextAction + '">' + nextLabel + '</button></div>' +
      '</div>';
  }

  /* ------------------------------------------------------------ evaluation */
  function renderEvaluation() {
    var run = state.run; var ev = run.evalResult; var ch = BL.chapterByN(ev.chapter);
    var checks = ev.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'ng') + '"><span>' + esc(c.label) + '</span><b>' + esc(String(c.value)) + '</b></li>'; }).join('');
    var verdict = ev.survived ?
      '<div class="verdict survive">' + (ev.isFinal ? '世界一達成 — 殿堂入り' : '生存 — 次章へ') + '<small>Ego Gems +' + ev.gems + '</small></div>' :
      '<div class="verdict elim">除籍<small>補償 Ego Gems +' + ev.gems + '（到達章×300）</small></div>';
    return '<section class="screen evaluation">' +
      '<header class="eval-head"><div class="ch-title">第' + ch.n + '章 査定・選別</div><div class="muted">' + esc(ch.enemy.name) + ' 戦 ' + ev.me + ' - ' + ev.en + (ev.cold ? '（コールド）' : '') + '</div></header>' +
      '<div class="eval-grid">' +
        '<div class="panel bid"><h4>年俸（Bid）査定</h4><div class="bid-num" data-count="' + ev.bidTotal + '" data-from="' + (ev.bidTotal - ev.bidGain) + '">' + yen(ev.bidTotal - ev.bidGain) + '</div><div class="muted">今回 +' + yen(ev.bidGain) + '（ゴール ' + ev.goals + ' × 査定倍率 ×' + BL.bidMultiplier(run).toFixed(2) + (ev.wins === 3 ? ' × MVP1.5' : '') + (ev.flows ? ' × FLOW1.2' : '') + '）</div>' +
          '<div class="money"><span>Cash 報酬 <b>+' + cash(ev.cashGain) + '</b></span><span>所持 <b>' + cash(ev.cashTotal) + '</b></span></div></div>' +
        '<div class="panel"><h4>足切りサバイバル判定</h4><ul class="req-list big">' + checks + '</ul></div>' +
      '</div>' + verdict +
      '<div class="modal-foot center"><button class="btn ' + (ev.survived ? 'primary' : 'danger') + ' lg" data-action="eval-next">' + (ev.survived ? (ev.isFinal ? '殿堂へ' : '第' + (ch.n + 1) + '章へ') : '除籍処分を受ける') + '</button></div>' +
      '</section>';
  }

  function renderGameover() {
    var run = state.run; var g = run.gameover; var c = charOf(run.charId);
    var reason = { injury: '故障 — 選手生命の終了', cold: 'コールド負け', cutoff: '足切り' }[g.reason] || '除籍';
    return '<section class="screen gameover">' +
      '<div class="go-big">除籍</div><div class="go-sub">ELIMINATED</div>' +
      '<div class="go-box"><div class="go-reason">' + esc(reason) + '</div><p>' + esc(g.detail) + '</p>' +
        '<div class="muted">' + esc(c.name) + ' ／ 第' + g.chapter + '章で脱落 ／ 合計ステータス ' + num(g.total) + ' ／ スキル ' + g.skills + ' ／ 年俸 ' + yen(g.bid) + '</div>' +
        '<div class="go-gems">補償 Ego Gems <b>+' + g.gems + '</b> → 所持 ' + num(state.meta.gems) + '</div>' +
        '<p class="muted">育成データは完全に抹消される。やり直しは存在しない。</p></div>' +
      '<div class="modal-foot center"><button class="btn danger lg" data-action="close-run">ロビーへ強制送還</button></div>' +
      '</section>';
  }

  function renderClear() {
    var run = state.run; var c = charOf(run.charId);
    var st = D.STATS.map(function (s) { return '<span class="st" style="--c:' + D.STAT_META[s].color + '"><i>' + s + '</i>' + num(run.stats[s]) + '</span>'; }).join('');
    return '<section class="screen clear">' +
      '<div class="clear-kicker">U-20 WORLD CUP CHAMPION</div><div class="clear-big">世界一</div>' +
      '<div class="go-box gold"><h3>' + stars(c.rarity) + ' ' + esc(c.name) + ' — 殿堂入り</h3>' +
        '<div class="stat-line">' + st + '</div>' +
        '<div class="muted">最終年俸 ' + yen(run.bid) + ' ／ スキル ' + BL.skillCount(run.skills) + ' ／ 通算ゴール ' + run.totals.goals + '</div>' +
        '<p>この選手は殿堂入りとして永続保存され、メインメニューから「FIFAワールドカップ（成人A代表・世界決戦モード）」へ出撃できる。</p></div>' +
      '<div class="modal-foot center"><button class="btn gold lg" data-action="close-run">ロビーへ</button></div>' +
      '</section>';
  }

  /* ------------------------------------------------------------ world cup */
  function renderWorldCup() {
    var wc = state.wc; var entry = BL.hofById(state, wc.hofId); var st = D.WORLD_CUP.stages[wc.stage];
    if (wc.phase === 'intro') {
      var rate = BL.wcRate(wc.stage);
      var opts = BL.computeOptions({ stats: entry.stats, skills: entry.skills, charId: entry.charId }, rate, {});
      var prev = opts.map(function (o) { return '<div class="opt-prev' + (o.wall ? ' wall' : '') + '"><b>' + o.key + '</b><span class="bar"><i style="width:' + Math.round(o.p) + '%;background:' + D.OPTIONS[o.key].color + '"></i></span><em>' + (o.wall ? '0%（壁）' : pct(o.p)) + '</em><small>' + num(o.power) + '/' + num(o.rate) + '</small></div>'; }).join('');
      return '<section class="screen wc-intro">' + disclaimerBar() +
        '<div class="wc-kicker">FIFA WORLD CUP — 成人A代表・世界決戦モード</div>' +
        '<h2>' + esc(st.name) + '：' + st.flag + ' ' + esc(st.team) + '</h2><p class="muted">' + esc(st.intro) + '</p>' +
        '<div class="panel"><h4>' + stars(entry.rarity) + ' ' + esc(entry.name) + '</h4><div class="muted">' + skillChips(entry.skills) + '</div><div class="opt-prevs">' + prev + '</div>' +
        '<div class="muted small">4回の Climax で3勝以上。2-2 の同点は延長なしの即時敗北。敗退すればこの選手の挑戦権は永久に失われる。</div></div>' +
        '<div class="modal-foot center"><button class="btn gold lg" data-action="wc-begin">キックオフ</button></div></section>';
    }
    if (wc.phase === 'match' || (wc.phase === 'stageResult' || wc.phase === 'end') && wc.match && wc.match.showResult) {
      var ctx = { kind: 'wc', title: 'FIFA W杯 ' + st.name, sub: st.flag + ' ' + st.team, enemy: st.team, lead: '', highlights: D.WORLD_CUP.highlights, needText: needText(wc.match.winReq, 0, wc.match.n), charName: entry.name };
      return renderMatch(wc.match, ctx);
    }
    if (wc.phase === 'stageResult') {
      var last = wc.results[wc.results.length - 1];
      return '<section class="screen wc-intro"><div class="wc-kicker">FIFA WORLD CUP</div><h2>' + esc(last.stage) + ' 勝利！ ' + last.me + ' - ' + last.en + '</h2><p class="muted">' + esc(last.team) + ' を撃破。次のステージへ進む。</p>' +
        '<div class="modal-foot center"><button class="btn gold lg" data-action="wc-stage-next">次のステージへ</button></div></section>';
    }
    /* end */
    var res = wc.results.map(function (r) { return '<li class="' + (r.won ? 'ok' : 'ng') + '"><span>' + esc(r.stage) + ' vs ' + esc(r.team) + '</span><b>' + r.me + ' - ' + r.en + '</b></li>'; }).join('');
    return '<section class="screen ' + (wc.champion ? 'clear' : 'gameover') + '">' +
      (wc.champion ? '<div class="clear-kicker">FIFA WORLD CUP CHAMPION</div><div class="clear-big">真の世界一</div>' : '<div class="go-big">敗退</div><div class="go-sub">ELIMINATED — ' + esc(st.name) + '</div>') +
      '<div class="go-box' + (wc.champion ? ' gold' : '') + '"><h3>' + esc(entry.name) + '</h3><ul class="req-list big">' + res + '</ul>' +
      (wc.champion ? '<p>Ego Gems +' + P.GEMS_CLEAR_BONUS + '。殿堂に「FIFA W杯優勝」が刻まれた。</p>' : '<p class="muted">この選手のワールドカップ挑戦権は失われた。記録は殿堂に残る。</p>') + '</div>' +
      '<div class="modal-foot center"><button class="btn ' + (wc.champion ? 'gold' : 'danger') + ' lg" data-action="wc-close">ロビーへ</button></div></section>';
  }

  /* ------------------------------------------------------------ effects */
  function blackout(text, ms, cb) {
    var fx = $('#fx');
    fx.innerHTML = '<div class="blackout"><div class="blackout-text">' + esc(text) + '</div></div>';
    fx.hidden = false;
    ui.busy = true;
    setTimeout(function () {
      fx.hidden = true; fx.innerHTML = ''; ui.busy = false;
      if (cb) cb();
    }, ms);
  }

  function countUp() {
    var el = $('.bid-num'); if (!el) return;
    var to = parseFloat(el.getAttribute('data-count')); var from = parseFloat(el.getAttribute('data-from'));
    var start = null; var dur = 1200;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur); var e = 1 - Math.pow(1 - t, 3);
      el.textContent = yen(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step); else el.classList.add('done');
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------ actions */
  function afterWeekAction() {
    var run = state.run;
    if (!run) { render(); return; }
    if (run.phase === 'event') { ui.modal = { type: 'event' }; render(); return; }
    if (run.phase === 'gameover') { blackout('選手生命、終了。', 1400, render); return; }
    if (run.phase === 'match' && run.match && run.match.results.length === 0) {
      render();
      blackout('公式戦 — ' + BL.chapterByN(run.chapter).enemy.name, 1500, render);
      return;
    }
    render();
  }

  /* 誤連打ガード（確認ダイアログは置かない。180ms 以内の連続クリックのみ無視） */
  var lastWeekClick = 0;
  function clickGuard() {
    var now = Date.now();
    if (now - lastWeekClick < 180) return false;
    lastWeekClick = now; return true;
  }

  var actions = {
    'title-start': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'to-lobby': function () { ui.inLobby = true; ui.lobbyTab = 'roster'; render(); },
    'lobby-tab': function (arg) { ui.lobbyTab = arg; render(); },
    'close-modal': function () { ui.modal = null; render(); },
    'open-rules': function () { ui.modal = { type: 'rules' }; render(); },
    'char-detail': function (arg) { ui.modal = { type: 'char', charId: arg }; render(); },
    'open-skills': function () { ui.modal = { type: 'skills' }; render(); },
    'resume-run': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'gacha': function (arg) {
      var n = parseInt(arg, 10) === 10 ? 10 : 1;
      var res = BL.gacha(state, n);
      if (!res.ok) { toast('Ego Gems が足りない', 'warn'); return; }
      ui.modal = { type: 'gacha', results: res.results, n: n };
      render();
    },
    'start-run': function (arg) {
      var res = BL.startRun(state, arg);
      if (!res.ok) { toast(res.reason === 'active' ? '育成中の選手がいる' : '所持していない', 'warn'); return; }
      ui.modal = null; ui.inLobby = false;
      var c = charOf(arg);
      render();
      blackout(c.name + ' — 第1章 一次選考 開始', 1300, render);
    },
    'train': function (arg) {
      if (ui.busy || !clickGuard()) return;
      var res = BL.train(state, arg);
      if (!res.ok) return;
      if (res.injured) { afterWeekAction(); return; }
      ui.flash = { gains: res.gains, stat: arg };
      afterWeekAction();
    },
    'rest': function () {
      if (ui.busy || !clickGuard()) return;
      var res = BL.rest(state);
      if (!res.ok) return;
      afterWeekAction();
    },
    'open-store': function () { ui.modal = { type: 'store' }; render(); },
    'buy': function (arg) {
      var res = BL.buy(state, arg);
      if (!res.ok) { toast({ cash: 'Cash 不足', full: 'HP は既に100%', dup: '適用済み（買いだめ不可）' }[res.reason] || '購入できない', 'warn'); return; }
      toast(res.item.name + '：' + res.msg, 'ok');
      render();
    },
    'event-choice': function (arg) {
      var res = BL.resolveEvent(state, parseInt(arg, 10));
      if (!res.ok) return;
      ui.modal = { type: 'event', result: res };
      render();
    },
    'close-event': function () {
      ui.modal = null;
      afterWeekAction();
    },
    'climax': function (arg) {
      if (ui.busy) return;
      var res = BL.chooseClimax(state, arg);
      if (!res) return;
      render();
    },
    'climax-next': function () {
      BL.dismissResult(state);
      render();
    },
    'eval-next': function () {
      var res = BL.advance(state);
      if (!res.ok) return;
      var run = state.run;
      if (run.phase === 'training') { render(); blackout('第' + run.chapter + '章 ' + BL.chapterByN(run.chapter).title + ' — 突入', 1300, render); }
      else if (run.phase === 'gameover') { blackout('除籍', 1200, render); }
      else render();
    },
    'close-run': function () { BL.closeRun(state); ui.lobbyTab = 'roster'; ui.inLobby = false; render(); },
    'wc-start': function (arg) {
      var res = BL.startWorldCup(state, arg);
      if (!res.ok) { toast({ active: 'W杯出撃中の選手がいる', used: 'この選手は既に出撃済み' }[res.reason] || '出撃できない', 'warn'); return; }
      ui.inLobby = false;
      render();
    },
    'wc-resume': function () { ui.screen = 'game'; ui.inLobby = false; render(); },
    'wc-begin': function () { BL.wcBeginMatch(state); render(); blackout('FIFA WORLD CUP — ' + D.WORLD_CUP.stages[state.wc.stage].team, 1400, render); },
    'wc-climax': function (arg) { if (ui.busy) return; var r = BL.wcChooseClimax(state, arg); if (!r) return; render(); },
    'wc-next': function () { BL.wcDismissResult(state); render(); },
    'wc-stage-next': function () { BL.wcNextStage(state); render(); },
    'wc-close': function () { BL.wcClose(state); ui.lobbyTab = 'hof'; ui.inLobby = false; render(); }
  };

  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.disabled) return;
    var act = el.getAttribute('data-action'); var arg = el.getAttribute('data-arg');
    if (actions[act]) { e.preventDefault(); actions[act](arg, el); }
  }
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.modal && ui.modal.type !== 'event') { ui.modal = null; render(); }
  });

  render();
  root.BL_UI = { state: function () { return state; }, render: render, ui: ui };
})(typeof globalThis !== 'undefined' ? globalThis : this);
