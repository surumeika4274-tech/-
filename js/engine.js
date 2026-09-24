/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  game engine (pure logic, no DOM)
 *  - すべての状態遷移関数は state を直接変異させ、直後に BL.save(state) を呼ぶ。
 *  - 乱数は BL.setRng で差し替え可能（バランス検証用）。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  var D = BL.DATA;
  var P = D.PARAMS;
  var SAVE_KEY = 'bl_pwc_egoist_save_v1';
  var SAVE_VERSION = 1;

  var rng = Math.random;
  BL.setRng = function (fn) { rng = fn; };
  BL.rand = function () { return rng(); };

  /* ------------------------------------------------------------ storage */
  var storage = {
    get: function () {
      try { return (typeof localStorage !== 'undefined') ? localStorage.getItem(SAVE_KEY) : null; } catch (e) { return null; }
    },
    set: function (v) {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, v); } catch (e) { /* quota / private mode */ }
    }
  };
  BL.setStorage = function (s) { storage = s; };

  /* ------------------------------------------------------------ helpers */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
  function charById(id) {
    for (var i = 0; i < D.CHARACTERS.length; i++) if (D.CHARACTERS[i].id === id) return D.CHARACTERS[i];
    return null;
  }
  function skillById(id) {
    for (var i = 0; i < D.SKILLS.length; i++) if (D.SKILLS[i].id === id) return D.SKILLS[i];
    return null;
  }
  function chapterByN(n) { return D.CHAPTERS[n - 1]; }
  function sumStats(stats) { var t = 0; for (var i = 0; i < D.STATS.length; i++) t += stats[D.STATS[i]]; return t; }
  function skillCount(skills) { var n = 0; for (var k in skills) if (skills.hasOwnProperty(k)) n += skills[k]; return n; }
  function pushLog(run, msg) { run.log.push(msg); if (run.log.length > 40) run.log.splice(0, run.log.length - 40); }

  BL.charById = charById; BL.skillById = skillById; BL.chapterByN = chapterByN;
  BL.sumStats = sumStats; BL.skillCount = skillCount; BL.clamp = clamp;

  /* ------------------------------------------------------------ meta / save */
  function newState() {
    var roster = {}; roster[D.STARTER_CHAR] = { dupes: 0, obtainedAt: Date.now() };
    return {
      v: SAVE_VERSION,
      meta: {
        gems: P.INITIAL_GEMS,
        roster: roster,
        hof: [],
        records: { runs: 0, eliminations: 0, clears: 0, bestChapter: 0, gachaPulls: 0, wcTitles: 0 },
        createdAt: Date.now()
      },
      run: null,
      wc: null
    };
  }

  BL.load = function () {
    var raw = storage.get();
    if (!raw) { var s = newState(); BL.save(s); return s; }
    try {
      var st = JSON.parse(raw);
      if (!st || st.v !== SAVE_VERSION || !st.meta) { var n = newState(); BL.save(n); return n; }
      if (!st.meta.records) st.meta.records = newState().meta.records;
      if (!st.meta.hof) st.meta.hof = [];
      if (!st.meta.roster || !Object.keys(st.meta.roster).length) st.meta.roster = newState().meta.roster;
      return st;
    } catch (e) { var f = newState(); BL.save(f); return f; }
  };
  BL.save = function (state) { storage.set(JSON.stringify(state)); };
  BL.newState = newState;

  /* ------------------------------------------------------------ character */
  function effectiveBase(ch, dupes) {
    var mult = 1 + P.LB_STEP * (dupes || 0);
    var out = {};
    for (var i = 0; i < D.STATS.length; i++) out[D.STATS[i]] = r1(ch.base[D.STATS[i]] * mult);
    return out;
  }
  BL.effectiveBase = effectiveBase;

  /* ------------------------------------------------------------ skill effects */
  function aggregateSkills(skills) {
    var agg = { opt: { A: 0, B: 0, C: 0, D: 0 }, all: 0, bid: 0, hpCost: 0, unlockD: false, count: 0 };
    for (var id in skills) {
      if (!skills.hasOwnProperty(id)) continue;
      var lv = skills[id]; var sk = skillById(id); if (!sk || !lv) continue;
      agg.count += lv;
      var fx = sk.fx;
      if (fx.opt) for (var k in fx.opt) agg.opt[k] += fx.opt[k] * lv;
      if (fx.all) agg.all += fx.all * lv;
      if (fx.bid) agg.bid += fx.bid * lv;
      if (fx.hpCost) agg.hpCost += fx.hpCost * lv;
      if (fx.unlockD) agg.unlockD = true;
    }
    return agg;
  }
  BL.aggregateSkills = aggregateSkills;

  /* ------------------------------------------------------------ training */
  function skillGrowthMult(skills) { return Math.pow(P.SKILL_MULT, skillCount(skills)); }

  function hpEfficiency(hp) {
    if (hp >= 50) return 1.0;
    if (hp >= 30) return P.HP_EFF_TIRED;
    return P.HP_EFF_DANGER;
  }
  BL.hpEfficiency = hpEfficiency;
  BL.hpState = function (hp) { return hp >= 50 ? 'full' : (hp >= 30 ? 'tired' : 'danger'); };

  /**
   * 練習1回あたりの理論獲得量（HP効率・プロテイン除外）
   *   gain = (基礎値 × 章環境倍率 + 現在値 × 複利率) × スキル乗数 × キャラ成長補正
   *   複利率は小さく保ち、章環境倍率で段階的（指数的）にインフレさせる。
   */
  function baseGain(run, stat, isMain) {
    var ch = chapterByN(run.chapter);
    var c = charById(run.charId);
    var cur = run.stats[stat];
    var base = (isMain ? P.BASE_MAIN : P.BASE_SUB) * ch.envMult;
    var comp = cur * (isMain ? P.COMP_MAIN : P.COMP_SUB);
    var lb = 1 + P.LB_GROWTH * (run.lb || 0);
    return (base + comp) * skillGrowthMult(run.skills) * c.growth[stat] * lb;
  }
  BL.previewGain = function (run, stat) {
    var eff = hpEfficiency(run.hp) * (run.protein ? 2 : 1);
    var out = {};
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i];
      out[s] = r1(baseGain(run, s, s === stat) * eff);
    }
    return out;
  };

  function trainingHpCost(run) {
    var c = charById(run.charId);
    var agg = aggregateSkills(run.skills);
    var cost = P.HP_COST + Math.round((rng() * 2 - 1) * P.HP_COST_VAR) + (c.passive.hpCost || 0) + agg.hpCost;
    return Math.max(5, cost);
  }
  BL.expectedHpCost = function (run) {
    var c = charById(run.charId); var agg = aggregateSkills(run.skills);
    return Math.max(5, P.HP_COST + (c.passive.hpCost || 0) + agg.hpCost);
  };
  function injuryChance(run) {
    var c = charById(run.charId);
    return clamp(P.INJURY_P + (c.passive.injuryP || 0), 0, 1);
  }
  BL.injuryChance = injuryChance;

  /**
   * 練習コマンド。戻り値: { ok, injured, gains, hpBefore, hpAfter, event(bool), eff }
   * 1クリック=即時1週消化。即座に save。
   */
  BL.train = function (state, stat) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false, reason: 'phase' };
    if (D.STATS.indexOf(stat) < 0) return { ok: false, reason: 'stat' };
    var c = charById(run.charId);
    var res = { ok: true, stat: stat, hpBefore: run.hp, injured: false, gains: {}, event: false };

    /* 危険水域: 故障判定（能力上昇より先に判定、故障なら即除籍） */
    if (run.hp < 30) {
      var pInj = injuryChance(run);
      if (rng() < pInj) {
        res.injured = true;
        run.weeksLeft = Math.max(0, run.weeksLeft - 1);
        pushLog(run, '【故障】危険水域での練習強行——靭帯断裂。選手生命が終了した。');
        finishRunEliminated(state, 'injury', '靭帯断裂：HP' + run.hp + '%での練習強行により選手生命が終了');
        BL.save(state);
        return res;
      }
    }

    var eff = hpEfficiency(run.hp) * (run.protein ? 2 : 1);
    res.eff = eff; res.protein = !!run.protein;
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i];
      var g = r1(baseGain(run, s, s === stat) * eff);
      run.stats[s] = r1(run.stats[s] + g);
      res.gains[s] = g;
    }
    run.protein = false;
    var cost = trainingHpCost(run);
    run.hp = clamp(run.hp - cost, 0, 100);
    res.hpAfter = run.hp; res.hpCost = cost;
    run.weeksLeft -= 1;
    run.totals.weeksTrained += 1;
    pushLog(run, '第' + run.chapter + '章 残' + run.weeksLeft + '週：' + D.STAT_META[stat].en + ' 練習 (+' + res.gains[stat] + ')' + (res.protein ? ' [プロテイン×2]' : ''));

    /* 突発化学反応イベント */
    var evRate = P.EVENT_RATE + (c.passive.eventRate || 0);
    if (rng() < evRate) {
      var ev = pickEvent(run);
      if (ev) {
        run.phase = 'event';
        run.event = { id: ev.id, trainedStat: stat, mainGain: res.gains[stat] };
        res.event = true;
      }
    }
    if (!res.event) afterWeek(state);
    BL.save(state);
    return res;
  };

  function pickEvent(run) {
    var pool = [];
    for (var i = 0; i < D.EVENTS.length; i++) {
      var e = D.EVENTS[i];
      if (e.rival && e.rival === run.charId) continue;
      if (run.lastEventId === e.id) continue;
      pool.push(e);
    }
    return pool.length ? pick(pool) : null;
  }
  BL.eventById = function (id) { for (var i = 0; i < D.EVENTS.length; i++) if (D.EVENTS[i].id === id) return D.EVENTS[i]; return null; };

  /** 休養：1週消費、HP+40 */
  BL.rest = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false };
    var before = run.hp;
    run.hp = clamp(run.hp + P.REST_HEAL, 0, 100);
    run.weeksLeft -= 1;
    run.totals.weeksRested += 1;
    pushLog(run, '第' + run.chapter + '章 残' + run.weeksLeft + '週：休養 (HP ' + before + '→' + run.hp + ')');
    afterWeek(state);
    BL.save(state);
    return { ok: true, hpBefore: before, hpAfter: run.hp };
  };

  /** 週消化後の共通処理：0週で試合へ強制遷移 */
  function afterWeek(state) {
    var run = state.run;
    if (run.weeksLeft <= 0) beginMatch(state);
  }

  /* ------------------------------------------------------------ events */
  function applyFx(state, run, fx, ctx) {
    var out = [];
    var i, s;
    var ch = chapterByN(run.chapter);
    if (fx.stat) {
      for (s in fx.stat) if (fx.stat.hasOwnProperty(s)) {
        var g = r1(baseGain(run, s, true) * fx.stat[s]);
        run.stats[s] = r1(run.stats[s] + g); out.push(D.STAT_META[s].en + ' +' + g);
      }
    }
    if (fx.trained && ctx && ctx.trainedStat) {
      var tg = r1(baseGain(run, ctx.trainedStat, true) * fx.trained);
      run.stats[ctx.trainedStat] = r1(run.stats[ctx.trainedStat] + tg); out.push(D.STAT_META[ctx.trainedStat].en + ' +' + tg);
    }
    if (fx.allStat) {
      for (i = 0; i < D.STATS.length; i++) {
        s = D.STATS[i];
        var ag = r1(baseGain(run, s, true) * fx.allStat);
        run.stats[s] = r1(run.stats[s] + ag);
      }
      out.push('全能力 +' + (fx.allStat * 100) + '%相当');
    }
    if (fx.hp) { var hb = run.hp; run.hp = clamp(run.hp + fx.hp, 0, 100); out.push('HP ' + hb + '→' + run.hp); }
    if (fx.cashPerCh) { var cg = fx.cashPerCh * ch.n; run.cash += cg; out.push('Cash +¥' + cg.toLocaleString()); }
    if (fx.bidPerCh) { var bg = fx.bidPerCh * ch.n; run.bid += bg; out.push('年俸 +' + BL.fmtYen(bg)); }
    if (fx.protein) { run.protein = true; out.push('次回練習 獲得量×2'); }
    return out;
  }

  /** イベント選択肢の決定（クリック瞬間に確定・保存） */
  BL.resolveEvent = function (state, idx) {
    var run = state.run;
    if (!run || run.phase !== 'event' || !run.event) return { ok: false };
    var ev = BL.eventById(run.event.id);
    var choice = ev.choices[idx];
    if (!choice) return { ok: false };
    var res = { ok: true, title: ev.title, label: choice.label, text: '', effects: [] };
    var fx = choice.fx;
    if (fx.roll) {
      var win = rng() < fx.roll.p;
      res.text = win ? fx.roll.winText : fx.roll.loseText;
      res.rollWin = win;
      res.effects = applyFx(state, run, win ? fx.roll.win : fx.roll.lose, run.event);
    } else {
      res.text = choice.result;
      res.effects = applyFx(state, run, fx, run.event);
    }
    run.lastEventId = ev.id;
    run.totals.events += 1;
    pushLog(run, '【イベント】' + ev.title + ' → ' + choice.label + (res.effects.length ? '（' + res.effects.join(' / ') + '）' : ''));
    run.event = null;
    run.phase = 'training';
    afterWeek(state);
    BL.save(state);
    return res;
  };

  /* ------------------------------------------------------------ store */
  BL.itemPrice = function (item, chapter) { return item.price * chapter; };
  BL.buy = function (state, itemId) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false, reason: 'phase' };
    var item = null;
    for (var i = 0; i < D.ITEMS.length; i++) if (D.ITEMS[i].id === itemId) item = D.ITEMS[i];
    if (!item) return { ok: false, reason: 'item' };
    var price = BL.itemPrice(item, run.chapter);
    if (run.cash < price) return { ok: false, reason: 'cash' };
    if (itemId === 'capsule' && run.hp >= 100) return { ok: false, reason: 'full' };
    if (itemId === 'protein' && run.protein) return { ok: false, reason: 'dup' };
    if (itemId === 'note' && run.note) return { ok: false, reason: 'dup' };
    run.cash -= price;
    var msg = '';
    if (itemId === 'capsule') { run.hp = 100; msg = 'HP 100% まで全回復した。'; }
    if (itemId === 'protein') { run.protein = true; msg = '次の練習1回の獲得量が2倍になる。'; }
    if (itemId === 'note') { run.note = true; msg = '次の試合の全選択肢成功率 +10%。'; }
    run.totals.purchases += 1;
    pushLog(run, '【購買部】' + item.name + ' 購入 (-¥' + price.toLocaleString() + ')');
    BL.save(state);
    return { ok: true, msg: msg, item: item };
  };

  /* ------------------------------------------------------------ match core */
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /**
   * 選択肢と成功率を算出（プレイヤー抽象 player = {stats, skills, charId}）
   * rate: {A,B,C,D} / extra: {note:bool, flow:bool}
   */
  function computeOptions(player, rate, extra) {
    var s = player.stats;
    var c = charById(player.charId);
    var agg = aggregateSkills(player.skills);
    var passive = c.passive || {};
    var list = [];
    var keys = ['A', 'B', 'C'];
    if (agg.unlockD) keys.push('D');
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var def = D.OPTIONS[k];
      var power = (k === 'D') ? (s.INT + s.TEC) * P.D_POWER_MULT : (s[def.stats[0]] + s[def.stats[1]]);
      var ratio = power / rate[k];
      var o = { key: k, name: def.name, stats: def.stats, power: Math.round(power), rate: rate[k], ratio: ratio, wall: false, base: 0, bonus: 0, p: 0, breakdown: [] };
      if (ratio < P.WALL) {
        /* 完全ゼロの壁：能力が決定的に届いていない場合、補正の一切を無視して 0% */
        o.wall = true; o.p = 0;
      } else {
        var base = sigmoid(P.SIG_K * (ratio - 1)) * 100;
        var skillBonus = Math.min(P.SKILL_BONUS_CAP, agg.opt[k] + agg.all);
        var passiveBonus = (passive.all || 0) + ((passive.opt && passive.opt[k]) || 0);
        var noteBonus = (extra && extra.note) ? P.NOTE_BONUS : 0;
        var flowBonus = (extra && extra.flow) ? P.FLOW_BONUS : 0;
        o.base = base;
        if (skillBonus) o.breakdown.push({ label: 'スキル', v: skillBonus });
        if (passiveBonus) o.breakdown.push({ label: '固有エゴ', v: passiveBonus });
        if (noteBonus) o.breakdown.push({ label: 'アナライズ', v: noteBonus });
        if (flowBonus) o.breakdown.push({ label: 'FLOW', v: flowBonus });
        /* スキル・固有エゴ・ノートは「失敗率を割合で削る」乗算補正（上位での100%飽和を防ぐ）。
         * FLOW は仕様どおり成功率へ +20pt の加算。 */
        var mult = skillBonus + passiveBonus + noteBonus;
        var p = base + (100 - base) * (mult / 100);
        p = p + flowBonus;
        o.bonus = Math.round(p - base);
        o.p = clamp(p, 0, 100);
      }
      o.pct = Math.round(o.p);
      list.push(o);
    }
    return list;
  }
  BL.computeOptions = computeOptions;

  /** 育成画面用プレビュー（FLOW無し） */
  BL.previewOptions = function (run) {
    var ch = chapterByN(run.chapter);
    return computeOptions(run, ch.enemy.rate, { note: run.note, flow: false });
  };

  function newMatchState(cfg) {
    return {
      kind: cfg.kind, n: cfg.n, winReq: cfg.winReq, goalReq: cfg.goalReq, rate: cfg.rate, note: !!cfg.note,
      idx: 0, me: 0, en: 0, wins: 0, losses: 0, results: [], current: null, showResult: false, ended: false,
      cold: false, draw: false, won: false, flows: 0, flowSuccess: 0
    };
  }

  function presentClimax(player, match) {
    var c = charById(player.charId);
    var opts = computeOptions(player, match.rate, { note: match.note, flow: false });
    var best = 0;
    for (var i = 0; i < opts.length; i++) if (opts[i].p > best) best = opts[i].p;
    var flow = false;
    if (best >= P.FLOW_LO * 100 && best <= P.FLOW_HI * 100) {
      var fp = P.FLOW_P + ((c.passive && c.passive.flowP) || 0);
      if (rng() < fp) flow = true;
    }
    if (flow) { opts = computeOptions(player, match.rate, { note: match.note, flow: true }); match.flows += 1; }
    match.current = { options: opts, flow: flow, idx: match.idx };
  }

  /** スキル覚醒判定 */
  function awakenSkill(player, optKey, flow) {
    var c = charById(player.charId);
    var thMult = (c.passive && c.passive.thMult) || 1;
    var families = { A: ['SHT', 'PHY'], B: ['TEC', 'INT'], C: ['SPD', 'INT'], D: ['INT', 'TEC'] }[optKey];
    var best = null;
    for (var f = 0; f < families.length; f++) {
      var fam = families[f];
      var val = player.stats[fam];
      var cand = null;
      for (var i = 0; i < D.SKILLS.length; i++) {
        var sk = D.SKILLS[i];
        if (sk.family !== fam) continue;
        if (val >= sk.th * thMult && (!cand || sk.tier > cand.tier)) cand = sk;
      }
      if (cand && (!best || cand.tier > best.sk.tier || (cand.tier === best.sk.tier && val > best.val))) best = { sk: cand, val: val };
    }
    if (!best && flow) {
      /* FLOW 成功時は確定覚醒：主属性の Tier1 */
      for (var j = 0; j < D.SKILLS.length; j++) if (D.SKILLS[j].family === families[0] && D.SKILLS[j].tier === 1) { best = { sk: D.SKILLS[j], val: player.stats[families[0]] }; break; }
    }
    if (!best) return null;
    player.skills[best.sk.id] = (player.skills[best.sk.id] || 0) + 1;
    return { id: best.sk.id, name: best.sk.name, family: best.sk.family, tier: best.sk.tier, lv: player.skills[best.sk.id], desc: best.sk.desc };
  }

  /** 選択肢クリック → 即判定・即保存。戻り値 result */
  function resolveClimax(player, match, optKey) {
    var cur = match.current;
    if (!cur || match.ended) return null;
    var opt = null;
    for (var i = 0; i < cur.options.length; i++) if (cur.options[i].key === optKey) opt = cur.options[i];
    if (!opt) return null;
    var roll = rng() * 100;
    var success = roll < opt.p && opt.p > 0;
    var result = { idx: match.idx, key: optKey, name: opt.name, p: opt.pct, flow: cur.flow, success: success, skill: null };
    if (success) {
      match.me += 1; match.wins += 1;
      if (cur.flow) match.flowSuccess += 1;
      result.skill = awakenSkill(player, optKey, cur.flow);
    } else {
      match.en += 1; match.losses += 1;
    }
    match.results.push(result);
    match.showResult = true;
    match.lastResult = result;

    var remaining = match.n - (match.idx + 1);
    var need = Math.max(match.winReq, match.goalReq);
    /* コールド負け：必要成功数の達成が数学的に不可能 */
    var impossible = (match.wins + remaining) < need;
    /* 勝利要求がある場合、敵に追いつけない状況もコールド */
    if (match.winReq > 0 && (match.me + remaining) <= match.en) impossible = true;
    if (impossible) { match.cold = remaining > 0; match.ended = true; }
    else if (match.idx + 1 >= match.n) { match.ended = true; }

    if (match.ended) {
      match.draw = (match.me === match.en);
      match.won = match.me > match.en;
      match.current = null;
      result.matchEnd = true;
    } else {
      match.idx += 1;
      presentClimax(player, match);
    }
    /* 結果パネルは「次へ」で閉じるまで表示（リロードしても再表示される） */
    match.showResult = true;
    return result;
  }

  /* ------------------------------------------------------------ run match */
  function beginMatch(state) {
    var run = state.run;
    var ch = chapterByN(run.chapter);
    run.phase = 'match';
    run.match = newMatchState({ kind: 'run', n: 3, winReq: ch.winReq, goalReq: ch.goalReq, rate: ch.enemy.rate, note: run.note });
    run.note = false;
    presentClimax(run, run.match);
  }

  BL.chooseClimax = function (state, optKey) {
    var run = state.run;
    if (!run || run.phase !== 'match' || !run.match || run.match.showResult) return null;
    var res = resolveClimax(run, run.match, optKey);
    if (!res) return null;
    if (res.skill) pushLog(run, '【覚醒】' + res.skill.name + ' Lv.' + res.skill.lv);
    pushLog(run, 'Climax ' + (res.idx + 1) + '：' + res.name + ' ' + res.p + '% → ' + (res.success ? '成功' : '失敗') + (res.flow ? ' [FLOW]' : ''));
    if (run.match.ended) evaluate(state);
    BL.save(state);
    return res;
  };

  /** 結果パネル → 次へ（表示状態のみ切替・保存） */
  BL.dismissResult = function (state) {
    var run = state.run;
    if (!run || !run.match) return;
    run.match.showResult = false;
    BL.save(state);
  };

  /* ------------------------------------------------------------ evaluation */
  BL.fmtYen = function (v) {
    v = Math.round(v);
    if (v >= 1e8) { var oku = Math.floor(v / 1e8); var man = Math.round((v % 1e8) / 1e4); return oku + '億' + (man ? man.toLocaleString() + '万' : '') + '円'; }
    if (v >= 1e4) return Math.round(v / 1e4).toLocaleString() + '万円';
    return v.toLocaleString() + '円';
  };

  function bidMultiplier(run) {
    var c = charById(run.charId);
    var agg = aggregateSkills(run.skills);
    return (1 + P.BID_SKILL_STEP * agg.count + agg.bid) * ((c.passive && c.passive.bidMult) || 1);
  }
  BL.bidMultiplier = bidMultiplier;

  function evaluate(state) {
    var run = state.run;
    var m = run.match;
    var ch = chapterByN(run.chapter);
    var c = charById(run.charId);
    var goals = m.me;
    var bidGain = goals * ch.bidPerGoal * bidMultiplier(run) * (m.wins === m.n && m.n > 0 ? P.MVP_BID_MULT : 1) * (m.flowSuccess > 0 ? P.FLOW_BID_MULT : 1);
    bidGain = Math.round(bidGain);
    var cashGain = Math.round((goals * ch.cashPerGoal + (m.won ? ch.cashWin : 0)) * ((c.passive && c.passive.cashMult) || 1));
    run.bid += bidGain;
    run.cash += cashGain;
    run.totals.goals += goals;
    run.totals.climaxWins += m.wins;
    run.totals.flows += m.flows;

    var total = sumStats(run.stats);
    var checks = [];
    if (ch.statReq > 0) checks.push({ label: '合計ステータス ' + ch.statReq + ' 以上', value: Math.round(total), ok: total >= ch.statReq });
    if (ch.goalReq > 0) checks.push({ label: '公式戦で ' + ch.goalReq + ' ゴール以上', value: goals + ' ゴール', ok: goals >= ch.goalReq });
    if (ch.winReq > 0) {
      checks.push({ label: 'Climax ' + ch.winReq + ' 勝以上', value: m.wins + ' 勝 ' + m.losses + ' 敗', ok: m.wins >= ch.winReq });
      checks.push({ label: '試合勝利（引き分けは即時敗北）', value: m.me + ' - ' + m.en, ok: m.won });
    } else {
      checks.push({ label: '引き分け即死ルール', value: m.me + ' - ' + m.en, ok: !m.draw });
    }
    if (ch.bidReq > 0) checks.push({ label: '年俸評価 ' + BL.fmtYen(ch.bidReq) + ' 以上', value: BL.fmtYen(run.bid), ok: run.bid >= ch.bidReq });
    var survived = true;
    for (var i = 0; i < checks.length; i++) if (!checks[i].ok) survived = false;

    var ev = { chapter: ch.n, goals: goals, wins: m.wins, losses: m.losses, me: m.me, en: m.en, cold: m.cold, draw: m.draw, won: m.won,
               bidGain: bidGain, bidTotal: run.bid, cashGain: cashGain, cashTotal: run.cash, checks: checks, survived: survived,
               gems: 0, isFinal: ch.n === D.CHAPTERS.length, flows: m.flows, skills: skillCount(run.skills), total: Math.round(total) };
    if (survived) {
      ev.gems = P.GEMS_SURVIVE;
      if (ev.isFinal) { ev.gems += P.GEMS_CLEAR_BONUS; registerHof(state); state.meta.records.clears += 1; }
      state.meta.gems += ev.gems;
      if (ch.n > state.meta.records.bestChapter) state.meta.records.bestChapter = ch.n;
      pushLog(run, '【査定】第' + ch.n + '章 生存。年俸 ' + BL.fmtYen(run.bid) + '。Ego Gems +' + ev.gems);
    } else {
      ev.gems = P.GEMS_ELIM_PER_CH * ch.n;
      state.meta.gems += ev.gems;
      state.meta.records.eliminations += 1;
      if (ch.n - 1 > state.meta.records.bestChapter) state.meta.records.bestChapter = ch.n - 1;
      pushLog(run, '【査定】第' + ch.n + '章 足切り。除籍。補償ジェム +' + ev.gems);
    }
    run.evalResult = ev;
    run.phase = 'evaluation';
  }

  function registerHof(state) {
    var run = state.run;
    var c = charById(run.charId);
    var entry = {
      id: 'hof_' + Date.now() + '_' + Math.floor(rng() * 1e6),
      charId: run.charId, name: c.name, rarity: c.rarity,
      stats: JSON.parse(JSON.stringify(run.stats)), skills: JSON.parse(JSON.stringify(run.skills)),
      bid: run.bid, totals: JSON.parse(JSON.stringify(run.totals)), clearedAt: Date.now(),
      wc: { status: 'none', stage: 0, wins: 0 }
    };
    state.meta.hof.push(entry);
    run.hofId = entry.id;
  }

  /** 査定画面 → 分岐 */
  BL.advance = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'evaluation' || !run.evalResult) return { ok: false };
    var ev = run.evalResult;
    if (ev.survived) {
      if (ev.isFinal) {
        run.phase = 'clear';
      } else {
        var next = chapterByN(run.chapter + 1);
        run.chapter = next.n; run.weeksLeft = next.weeks;
        run.match = null; run.evalResult = null; run.phase = 'training';
        pushLog(run, '第' + next.n + '章「' + next.title + '」開始。公式戦まで ' + next.weeks + ' 週。');
      }
    } else {
      finishRunEliminated(state, ev.cold ? 'cold' : 'cutoff', ev.cold ? 'コールド負け：勝利条件の達成が数学的に不可能となり試合打ち切り' : '足切り条件未達');
    }
    BL.save(state);
    return { ok: true, phase: run.phase };
  };

  function finishRunEliminated(state, reason, detail) {
    var run = state.run;
    var reached = run.chapter;
    var gems = 0;
    if (reason === 'injury') {
      gems = P.GEMS_ELIM_PER_CH * reached;
      state.meta.gems += gems;
      state.meta.records.eliminations += 1;
      if (reached - 1 > state.meta.records.bestChapter) state.meta.records.bestChapter = reached - 1;
    } else if (run.evalResult) {
      gems = run.evalResult.gems; /* 既に付与済み */
    }
    run.phase = 'gameover';
    run.gameover = { reason: reason, detail: detail, gems: gems, chapter: reached, total: Math.round(sumStats(run.stats)), skills: skillCount(run.skills), bid: run.bid };
  }

  /** ゲームオーバー / クリア画面を閉じてロビーへ（育成データ抹消） */
  BL.closeRun = function (state) {
    var run = state.run;
    if (!run) return;
    if (run.phase !== 'gameover' && run.phase !== 'clear') return;
    state.run = null;
    BL.save(state);
  };

  /* ------------------------------------------------------------ lobby */
  BL.startRun = function (state, charId) {
    if (state.run) return { ok: false, reason: 'active' };
    var c = charById(charId);
    var owned = state.meta.roster[charId];
    if (!c || !owned) return { ok: false, reason: 'notowned' };
    var ch = chapterByN(1);
    state.run = {
      charId: charId, chapter: 1, weeksLeft: ch.weeks,
      stats: effectiveBase(c, owned.dupes), lb: owned.dupes || 0, hp: 100, skills: {}, bid: 0, cash: 0,
      phase: 'training', protein: false, note: false, event: null, lastEventId: null,
      match: null, evalResult: null, gameover: null, log: [],
      totals: { goals: 0, climaxWins: 0, flows: 0, events: 0, purchases: 0, weeksTrained: 0, weeksRested: 0 },
      startedAt: Date.now(), runNo: state.meta.records.runs + 1
    };
    state.meta.records.runs += 1;
    pushLog(state.run, c.name + ' の育成を開始。第1章「一次選考」公式戦まで ' + ch.weeks + ' 週。');
    BL.save(state);
    return { ok: true };
  };

  function rollRarity() {
    var r = rng() * 100, acc = 0;
    var order = [8, 7, 6, 5, 4, 3, 2, 1];
    for (var i = 0; i < order.length; i++) { acc += D.RARITY[order[i]].rate; if (r < acc) return order[i]; }
    return 1;
  }
  BL.gacha = function (state, n) {
    var cost = n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE;
    if (state.meta.gems < cost) return { ok: false, reason: 'gems' };
    state.meta.gems -= cost;
    var results = [];
    for (var i = 0; i < n; i++) {
      var rar = rollRarity();
      var pool = [];
      for (var j = 0; j < D.CHARACTERS.length; j++) if (D.CHARACTERS[j].rarity === rar) pool.push(D.CHARACTERS[j]);
      var c = pick(pool);
      var entry = state.meta.roster[c.id];
      var isNew = !entry;
      if (isNew) state.meta.roster[c.id] = { dupes: 0, obtainedAt: Date.now() };
      else entry.dupes += 1;
      results.push({ id: c.id, name: c.name, rarity: rar, isNew: isNew, dupes: state.meta.roster[c.id].dupes });
    }
    state.meta.records.gachaPulls += n;
    BL.save(state);
    return { ok: true, results: results, cost: cost };
  };

  /* ------------------------------------------------------------ World Cup */
  function wcPlayer(state) {
    var wc = state.wc; var entry = hofById(state, wc.hofId);
    return { stats: entry.stats, skills: entry.skills, charId: entry.charId, entry: entry };
  }
  function hofById(state, id) { for (var i = 0; i < state.meta.hof.length; i++) if (state.meta.hof[i].id === id) return state.meta.hof[i]; return null; }
  BL.hofById = hofById;
  function wcRate(stageIdx) {
    var st = D.WORLD_CUP.stages[stageIdx];
    var base = chapterByN(D.CHAPTERS.length).enemy.rate;
    return { A: Math.round(base.A * st.rateMult.A), B: Math.round(base.B * st.rateMult.B), C: Math.round(base.C * st.rateMult.C), D: Math.round(base.D * st.rateMult.D) };
  }
  BL.wcRate = wcRate;

  BL.startWorldCup = function (state, hofId) {
    if (state.wc) return { ok: false, reason: 'active' };
    var entry = hofById(state, hofId);
    if (!entry) return { ok: false, reason: 'nohof' };
    if (entry.wc.status !== 'none') return { ok: false, reason: 'used' };
    entry.wc.status = 'inprogress';
    state.wc = { hofId: hofId, stage: 0, phase: 'intro', match: null, results: [], champion: false };
    BL.save(state);
    return { ok: true };
  };
  BL.wcBeginMatch = function (state) {
    var wc = state.wc;
    if (!wc || wc.phase !== 'intro') return;
    var n = D.WORLD_CUP.climaxes;
    wc.match = newMatchState({ kind: 'wc', n: n, winReq: Math.floor(n / 2) + 1, goalReq: 0, rate: wcRate(wc.stage), note: false });
    wc.phase = 'match';
    presentClimax(wcPlayer(state), wc.match);
    BL.save(state);
  };
  BL.wcChooseClimax = function (state, optKey) {
    var wc = state.wc;
    if (!wc || wc.phase !== 'match' || !wc.match || wc.match.showResult) return null;
    var player = wcPlayer(state);
    var res = resolveClimax(player, wc.match, optKey);
    if (!res) return null;
    if (wc.match.ended) {
      var entry = player.entry;
      var stage = D.WORLD_CUP.stages[wc.stage];
      wc.results.push({ stage: stage.name, team: stage.team, me: wc.match.me, en: wc.match.en, won: wc.match.won });
      if (wc.match.won) {
        entry.wc.wins += 1;
        entry.wc.stage = wc.stage + 1;
        if (wc.stage + 1 >= D.WORLD_CUP.stages.length) {
          wc.champion = true; wc.phase = 'end';
          entry.wc.status = 'champion';
          state.meta.records.wcTitles += 1;
          state.meta.gems += P.GEMS_CLEAR_BONUS;
        } else {
          wc.phase = 'stageResult';
        }
      } else {
        wc.phase = 'end';
        entry.wc.status = 'out';
        entry.wc.stage = wc.stage;
      }
    }
    BL.save(state);
    return res;
  };
  BL.wcDismissResult = function (state) { if (state.wc && state.wc.match) { state.wc.match.showResult = false; BL.save(state); } };
  BL.wcNextStage = function (state) {
    var wc = state.wc;
    if (!wc || wc.phase !== 'stageResult') return;
    wc.stage += 1; wc.match = null; wc.phase = 'intro';
    BL.save(state);
  };
  BL.wcClose = function (state) {
    if (!state.wc || state.wc.phase !== 'end') return;
    state.wc = null;
    BL.save(state);
  };

  /* ------------------------------------------------------------ misc exports */
  BL.rarityOf = function (charId) { var c = charById(charId); return c ? c.rarity : 1; };
  BL.SAVE_KEY = SAVE_KEY;
})(typeof globalThis !== 'undefined' ? globalThis : this);
