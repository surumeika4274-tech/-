/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  game engine v2 (pure logic, no DOM)
 *  状態遷移関数は state を直接変異させ、直後に BL.save(state) を呼ぶ（不可逆オートセーブ）。
 *  乱数は BL.setRng で差し替え可能（tools/ のバランス検証用）。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  var D = BL.DATA;
  var P = D.PARAMS;
  var ARCS = BL.STORY.arcs;
  var SAVE_KEY = 'bl_pwc_egoist_save_v2';
  var SAVE_VERSION = 2;

  var rng = Math.random;
  BL.setRng = function (fn) { rng = fn; };
  BL.rand = function () { return rng(); };

  /* ------------------------------------------------------------ storage */
  var storage = {
    get: function () { try { return (typeof localStorage !== 'undefined') ? localStorage.getItem(SAVE_KEY) : null; } catch (e) { return null; } },
    set: function (v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, v); } catch (e) { /* quota / private mode */ } }
  };
  BL.setStorage = function (s) { storage = s; };

  /* ------------------------------------------------------------ helpers */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sumStats(stats) { var t = 0; for (var i = 0; i < D.STATS.length; i++) t += stats[D.STATS[i]]; return t; }
  function skillCount(skills) { var n = 0; for (var k in skills) if (skills.hasOwnProperty(k)) n += skills[k]; return n; }
  function pushLog(run, msg) { run.log.push(msg); if (run.log.length > 60) run.log.splice(0, run.log.length - 60); }

  var cardIndex = null;
  function cardById(id) {
    if (!cardIndex) { cardIndex = {}; for (var i = 0; i < BL.CARDS.length; i++) cardIndex[BL.CARDS[i].id] = BL.CARDS[i]; }
    return cardIndex[id] || null;
  }
  function charOf(card) { return D.CHARACTERS[card.char]; }
  function skillById(id) { for (var i = 0; i < D.SKILLS.length; i++) if (D.SKILLS[i].id === id) return D.SKILLS[i]; return null; }
  function advisorById(id) { for (var i = 0; i < D.ADVISORS.length; i++) if (D.ADVISORS[i].id === id) return D.ADVISORS[i]; return null; }
  function clubById(id) { for (var i = 0; i < D.NEL_CLUBS.length; i++) if (D.NEL_CLUBS[i].id === id) return D.NEL_CLUBS[i]; return null; }
  function achById(id) { for (var i = 0; i < D.ACHIEVEMENTS.length; i++) if (D.ACHIEVEMENTS[i].id === id) return D.ACHIEVEMENTS[i]; return null; }

  BL.cardById = cardById; BL.charOf = charOf; BL.skillById = skillById; BL.advisorById = advisorById; BL.clubById = clubById;
  BL.sumStats = sumStats; BL.skillCount = skillCount; BL.clamp = clamp;
  BL.starterCard = function () {
    for (var i = 0; i < BL.CARDS.length; i++) if (BL.CARDS[i].char === D.STARTER_CARD.char && BL.CARDS[i].title === D.STARTER_CARD.title) return BL.CARDS[i];
    return BL.CARDS[BL.CARDS.length - 1];
  };
  BL.cardName = function (card) { return charOf(card).name + '【' + card.title + '】'; };

  /* ------------------------------------------------------------ meta / save */
  function newState() {
    var roster = {}; roster[BL.starterCard().id] = { dupes: 0, obtainedAt: Date.now() };
    return {
      v: SAVE_VERSION,
      meta: {
        gems: P.INITIAL_GEMS, roster: roster, hof: [],
        achievements: {}, pendingAch: [],
        records: { runs: 0, eliminations: 0, clears: 0, bestArc: -1, gachaPulls: 0, wcTitles: 0, bestRank: 300, bestBid: 0, bestTotal: 0 },
        history: [], sfx: true, createdAt: Date.now()
      },
      run: null, wc: null
    };
  }
  BL.load = function () {
    var raw = storage.get();
    if (!raw) { var s = newState(); BL.save(s); return s; }
    try {
      var st = JSON.parse(raw);
      if (!st || st.v !== SAVE_VERSION || !st.meta) { var n = newState(); BL.save(n); return n; }
      var fresh = newState().meta;
      for (var k in fresh) if (fresh.hasOwnProperty(k) && st.meta[k] === undefined) st.meta[k] = fresh[k];
      if (!Object.keys(st.meta.roster).length) st.meta.roster = fresh.roster;
      return st;
    } catch (e) { var f = newState(); BL.save(f); return f; }
  };
  BL.save = function (state) { storage.set(JSON.stringify(state)); };
  BL.newState = newState;
  BL.SAVE_KEY = SAVE_KEY;

  /* ------------------------------------------------------------ achievements */
  function unlock(state, id) {
    if (state.meta.achievements[id]) return false;
    var a = achById(id); if (!a) return false;
    state.meta.achievements[id] = Date.now();
    state.meta.gems += a.gems;
    state.meta.pendingAch.push(id);
    return true;
  }
  BL.unlockAchievement = unlock;
  BL.drainPendingAch = function (state) { var l = state.meta.pendingAch.slice(); state.meta.pendingAch = []; if (l.length) BL.save(state); return l; };
  BL.advisorUnlocked = function (state, adv) { return !adv.unlock || !!state.meta.achievements[adv.unlock]; };

  /* ------------------------------------------------------------ card profile */
  function cardProfile(card, dupes) {
    var c = charOf(card), r = D.RARITY[card.rar], t = D.TYPE_MAP[card.type];
    var lb = 1 + P.LB_STEP * (dupes || 0);
    var stats = {}, growth = {};
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i], main = (s === t.stat);
      stats[s] = r1(r.base * c.ident[s] * (main ? 1.3 : 0.95) * lb);
      growth[s] = Math.round(r.growth * (0.7 + 0.3 * c.ident[s]) * (main ? 1.12 : 1.0) * 100) / 100;
    }
    return { stats: stats, growth: growth, mainStat: t.stat };
  }
  BL.cardProfile = cardProfile;

  /* 全補正の集約：キャラ固有エゴ + タイプ + レアリティ + アドバイザー + クラブ */
  function playerMods(player) {
    var m = { opt: { A: 0, B: 0, C: 0, D: 0 }, all: 0, flowP: 0, flowBonus: 0, hpCost: 0, injuryP: 0, cashMult: 1, bidMult: 1, thMult: 1,
              eventRate: 0, restBonus: 0, condFloor: false, growth: { SHT: 0, SPD: 0, TEC: 0, INT: 0, PHY: 0 }, elimGemMult: 1, priceMult: 1, flowBidMult: 1 };
    function merge(fx) {
      if (!fx) return;
      if (fx.opt) for (var k in fx.opt) m.opt[k] += fx.opt[k];
      if (fx.all) m.all += fx.all;
      if (fx.flowP) m.flowP += fx.flowP;
      if (fx.flowBonus) m.flowBonus += fx.flowBonus;
      if (fx.hpCost) m.hpCost += fx.hpCost;
      if (fx.injuryP) m.injuryP += fx.injuryP;
      if (fx.cashMult) m.cashMult *= fx.cashMult;
      if (fx.bidMult) m.bidMult *= fx.bidMult;
      if (fx.thMult) m.thMult *= fx.thMult;
      if (fx.eventRate) m.eventRate += fx.eventRate;
      if (fx.restBonus) m.restBonus += fx.restBonus;
      if (fx.condFloor) m.condFloor = true;
      if (fx.growth) for (var g in fx.growth) m.growth[g] += fx.growth[g];
      if (fx.elimGemMult) m.elimGemMult *= fx.elimGemMult;
      if (fx.priceMult) m.priceMult *= fx.priceMult;
      if (fx.flowBidMult) m.flowBidMult *= fx.flowBidMult;
    }
    var card = cardById(player.cardId);
    if (card) {
      merge(charOf(card).passive);
      merge(D.TYPE_MAP[card.type]);
      merge(D.RARITY[card.rar]);
    }
    if (player.advisorId) { var adv = advisorById(player.advisorId); if (adv) merge(adv.fx); }
    if (player.club) { var club = clubById(player.club); if (club) merge(club.passive); }
    return m;
  }
  BL.playerMods = playerMods;

  /* ------------------------------------------------------------ skill effects */
  function aggregateSkills(player) {
    var agg = { opt: { A: 0, B: 0, C: 0, D: 0 }, all: 0, bid: 0, hpCost: 0, injuryP: 0, cashMult: 1, unlockD: false, count: 0 };
    function add(fx, lv) {
      if (fx.opt) for (var k in fx.opt) agg.opt[k] += fx.opt[k] * lv;
      if (fx.all) agg.all += fx.all * lv;
      if (fx.bid) agg.bid += fx.bid * lv;
      if (fx.hpCost) agg.hpCost += fx.hpCost * lv;
      if (fx.injuryP) agg.injuryP += fx.injuryP * lv;
      if (fx.cashMult) agg.cashMult *= Math.pow(fx.cashMult, lv);
      if (fx.unlockD) agg.unlockD = true;
    }
    var skills = player.skills || {};
    for (var id in skills) {
      if (!skills.hasOwnProperty(id)) continue;
      var lv = skills[id]; var sk = skillById(id); if (!sk || !lv) continue;
      agg.count += lv; add(sk.fx, lv);
    }
    if (player.sig) { var card = cardById(player.cardId); if (card) { agg.count += player.sig; add(charOf(card).sig.fx, player.sig); } }
    return agg;
  }
  BL.aggregateSkills = aggregateSkills;

  /* ------------------------------------------------------------ arcs / segments */
  function arcOf(run) { return ARCS[run.arc]; }
  function segOf(run) { return arcOf(run).segments[run.seg]; }
  BL.arcOf = arcOf; BL.segOf = segOf;

  /** 節の試合定義を解決（NEL は所属クラブと対戦順から相手を決定） */
  function resolveMatch(run, arc, seg) {
    var m = clone(seg.match);
    if (m.rule === 'nel') {
      var club = clubById(run.club) || D.NEL_CLUBS[0];
      var oppIdx = arc.segments.filter(function (s) { return s.match.rule === 'nel'; }).indexOf(seg);
      var opp = clubById(club.order[oppIdx]);
      var text = arc.opponents[opp.id];
      m.name = '新英雄大戦 第' + (oppIdx + 1) + '戦 ' + club.name + ' vs ' + opp.name;
      m.enemy = opp.flag + ' ' + opp.name; m.lead = 'マスター ' + opp.master + (opp.stars !== opp.master ? ' / ' + opp.stars : '');
      m.rate = { A: Math.round(m.base * opp.profile.A), B: Math.round(m.base * opp.profile.B), C: Math.round(m.base * opp.profile.C), D: Math.round(m.base * opp.profile.D) };
      m.intro = text.intro; m.highlights = text.highlights; m.canon = opp.canon;
      m.win = opp.name + ' を破った。スカウトの入札額が跳ね上がる。'; m.lose = opp.name + ' に敗れた。それでも入札は続く——ゴールがすべてだ。';
      m.oppClub = opp.id;
    }
    return m;
  }
  BL.resolveMatch = resolveMatch;
  BL.currentMatchDef = function (run) { var seg = segOf(run); return seg ? resolveMatch(run, arcOf(run), seg) : null; };

  /* ------------------------------------------------------------ training */
  function skillGrowthMult(player) { return 1 + P.SKILL_STEP * aggregateSkills(player).count; }
  function hpEfficiency(hp) { return hp >= 50 ? 1.0 : (hp >= 30 ? P.HP_EFF_TIRED : P.HP_EFF_DANGER); }
  BL.hpEfficiency = hpEfficiency;
  BL.hpState = function (hp) { return hp >= 50 ? 'full' : (hp >= 30 ? 'tired' : 'danger'); };

  function baseGain(run, stat, isMain) {
    var arc = arcOf(run);
    var cur = run.stats[stat];
    var base = (isMain ? P.BASE_MAIN : P.BASE_SUB) * arc.envMult;
    var comp = cur * (isMain ? P.COMP_MAIN : P.COMP_SUB);
    var mods = playerMods(run);
    var g = run.growth[stat] * (1 + mods.growth[stat]) * (1 + P.LB_GROWTH * (run.lb || 0));
    return (base + comp) * skillGrowthMult(run) * g;
  }
  BL.previewGain = function (run, stat) {
    var eff = hpEfficiency(run.hp) * (run.protein ? 2 : 1) * D.CONDITIONS[run.cond].mult;
    var out = {};
    for (var i = 0; i < D.STATS.length; i++) { var s = D.STATS[i]; out[s] = r1(baseGain(run, s, s === stat) * eff); }
    return out;
  };
  function hpCostBase(run) {
    var mods = playerMods(run); var agg = aggregateSkills(run);
    return Math.max(5, P.HP_COST + mods.hpCost + agg.hpCost + D.CONDITIONS[run.cond].hpCost);
  }
  BL.expectedHpCost = hpCostBase;
  function injuryChance(run) {
    var mods = playerMods(run); var agg = aggregateSkills(run);
    return clamp(P.INJURY_P + mods.injuryP + agg.injuryP, 0.05, 1);
  }
  BL.injuryChance = injuryChance;

  function shiftCond(run, delta, floor) {
    var idx = D.COND_ORDER.indexOf(run.cond);
    idx = clamp(idx + delta, floor ? 1 : 0, D.COND_ORDER.length - 1);
    run.cond = D.COND_ORDER[idx];
  }

  BL.train = function (state, stat) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false, reason: 'phase' };
    if (D.STATS.indexOf(stat) < 0) return { ok: false, reason: 'stat' };
    var mods = playerMods(run);
    var res = { ok: true, stat: stat, hpBefore: run.hp, injured: false, gains: {}, event: false, condBefore: run.cond };

    if (run.hp < 30) {
      if (rng() < injuryChance(run)) {
        res.injured = true;
        run.weeksLeft = Math.max(0, run.weeksLeft - 1);
        pushLog(run, '【故障】危険水域での練習強行——靭帯断裂。選手生命が終了した。');
        unlock(state, 'injury');
        eliminate(state, 'injury', '靭帯断裂：HP' + run.hp + '%での練習強行により選手生命が終了');
        BL.save(state);
        return res;
      }
    }
    var eff = hpEfficiency(run.hp) * (run.protein ? 2 : 1) * D.CONDITIONS[run.cond].mult;
    res.eff = eff; res.protein = !!run.protein;
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i];
      var g = r1(baseGain(run, s, s === stat) * eff);
      run.stats[s] = r1(run.stats[s] + g); res.gains[s] = g;
    }
    run.protein = false;
    var cost = hpCostBase(run) + Math.round((rng() * 2 - 1) * P.HP_COST_VAR);
    run.hp = clamp(run.hp - Math.max(5, cost), 0, 100);
    res.hpAfter = run.hp; res.hpCost = cost;
    var cr = rng();
    if (cr < P.COND_DOWN_P) shiftCond(run, -1, mods.condFloor); else if (cr < P.COND_DOWN_P + P.COND_UP_P) shiftCond(run, 1, mods.condFloor);
    res.condAfter = run.cond;
    run.weeksLeft -= 1; run.totals.weeksTrained += 1;
    pushLog(run, arcOf(run).title + ' 残' + run.weeksLeft + '週：' + D.STAT_META[stat].en + ' 練習 (+' + res.gains[stat] + ')' + (res.protein ? ' [プロテイン×2]' : ''));
    checkStatAch(state);

    if (rng() < P.EVENT_RATE + mods.eventRate) {
      var ev = pickEvent(run);
      if (ev) { run.phase = 'event'; run.event = { id: ev.id, trainedStat: stat }; res.event = true; }
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

  BL.rest = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false };
    var mods = playerMods(run);
    var before = run.hp;
    run.hp = clamp(run.hp + P.REST_HEAL + mods.restBonus, 0, 100);
    if (rng() < P.COND_REST_UP_P) shiftCond(run, 1, mods.condFloor);
    run.weeksLeft -= 1; run.totals.weeksRested += 1;
    pushLog(run, arcOf(run).title + ' 残' + run.weeksLeft + '週：休養 (HP ' + before + '→' + run.hp + ')');
    afterWeek(state);
    BL.save(state);
    return { ok: true, hpBefore: before, hpAfter: run.hp };
  };

  function afterWeek(state) { var run = state.run; if (run.weeksLeft <= 0) beginMatch(state); }

  /* ------------------------------------------------------------ events */
  function applyFx(state, run, fx, ctx) {
    var out = []; var i, s; var arc = arcOf(run); var mods = playerMods(run);
    var nArc = Math.max(1, arc.n);
    if (fx.stat) for (s in fx.stat) if (fx.stat.hasOwnProperty(s)) {
      var g = r1(baseGain(run, s, true) * fx.stat[s]); run.stats[s] = r1(run.stats[s] + g); out.push(D.STAT_META[s].en + ' +' + g);
    }
    if (fx.trained && ctx && ctx.trainedStat) {
      var tg = r1(baseGain(run, ctx.trainedStat, true) * fx.trained); run.stats[ctx.trainedStat] = r1(run.stats[ctx.trainedStat] + tg); out.push(D.STAT_META[ctx.trainedStat].en + ' +' + tg);
    }
    if (fx.weakest) {
      var w = D.STATS[0]; for (i = 1; i < D.STATS.length; i++) if (run.stats[D.STATS[i]] < run.stats[w]) w = D.STATS[i];
      var wg = r1(baseGain(run, w, true) * fx.weakest); run.stats[w] = r1(run.stats[w] + wg); out.push(D.STAT_META[w].en + ' +' + wg);
    }
    if (fx.allStat) {
      for (i = 0; i < D.STATS.length; i++) { s = D.STATS[i]; run.stats[s] = r1(run.stats[s] + r1(baseGain(run, s, true) * fx.allStat)); }
      out.push('全能力 +' + Math.round(fx.allStat * 100) + '%相当');
    }
    if (fx.hp) { var hb = run.hp; run.hp = clamp(run.hp + fx.hp, 0, 100); out.push('HP ' + hb + '→' + run.hp); }
    if (fx.cond) { var cb = run.cond; shiftCond(run, fx.cond, mods.condFloor); if (cb !== run.cond) out.push('コンディション ' + D.CONDITIONS[cb].label + '→' + D.CONDITIONS[run.cond].label); }
    if (fx.cashPerArc) { var cg = Math.round(fx.cashPerArc * nArc * mods.cashMult); run.cash += cg; out.push('Cash +¥' + cg.toLocaleString()); }
    if (fx.bidPerArc) { var bg = fx.bidPerArc * nArc; run.bid += bg; out.push('年俸 +' + BL.fmtYen(bg)); }
    if (fx.protein) { run.protein = true; out.push('次回練習 獲得量×2'); }
    return out;
  }

  BL.resolveEvent = function (state, idx) {
    var run = state.run;
    if (!run || run.phase !== 'event' || !run.event) return { ok: false };
    var ev = BL.eventById(run.event.id); var choice = ev.choices[idx];
    if (!choice) return { ok: false };
    var res = { ok: true, title: ev.title, label: choice.label, text: '', effects: [] };
    var fx = choice.fx;
    if (fx.roll) {
      var win = rng() < fx.roll.p; res.rollWin = win;
      res.text = win ? fx.roll.winText : fx.roll.loseText;
      res.effects = applyFx(state, run, win ? fx.roll.win : fx.roll.lose, run.event);
    } else { res.text = choice.result; res.effects = applyFx(state, run, fx, run.event); }
    run.lastEventId = ev.id; run.totals.events += 1;
    pushLog(run, '【イベント】' + ev.title + ' → ' + choice.label + (res.effects.length ? '（' + res.effects.join(' / ') + '）' : ''));
    run.event = null; run.phase = 'training';
    checkStatAch(state);
    afterWeek(state);
    BL.save(state);
    return res;
  };

  /* ------------------------------------------------------------ store */
  BL.itemPrice = function (item, run) { return Math.round(item.price * Math.max(1, arcOf(run).n) * playerMods(run).priceMult); };
  BL.buy = function (state, itemId) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false, reason: 'phase' };
    var item = null; for (var i = 0; i < D.ITEMS.length; i++) if (D.ITEMS[i].id === itemId) item = D.ITEMS[i];
    if (!item) return { ok: false, reason: 'item' };
    var price = BL.itemPrice(item, run);
    if (run.cash < price) return { ok: false, reason: 'cash' };
    if (itemId === 'capsule' && run.hp >= 100) return { ok: false, reason: 'full' };
    if (itemId === 'protein' && run.protein) return { ok: false, reason: 'dup' };
    if (itemId === 'note' && run.note) return { ok: false, reason: 'dup' };
    run.cash -= price; var msg = '';
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

  /** 選択肢と成功率。player: {stats, skills, sig, cardId, advisorId, club} / mdef: {rate, options?} / extra: {note, flow} */
  function computeOptions(player, mdef, extra) {
    var s = player.stats; var mods = playerMods(player); var agg = aggregateSkills(player);
    var custom = mdef.options || null;
    var keys = custom ? Object.keys(custom) : ['A', 'B', 'C'];
    if (!custom && agg.unlockD) keys.push('D');
    var list = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; var def = custom ? custom[k] : D.OPTIONS[k];
      var power = (k === 'D' && !custom) ? (s.INT + s.TEC) * P.D_POWER_MULT : (s[def.stats[0]] + s[def.stats[1]]);
      var rate = mdef.rate[k] || mdef.rate.A;
      var ratio = power / rate;
      var o = { key: k, name: def.name, flavor: def.flavor || (D.OPTIONS[k] && D.OPTIONS[k].flavor) || '', stats: def.stats, power: Math.round(power), rate: rate, ratio: ratio, wall: false, base: 0, bonus: 0, p: 0, breakdown: [] };
      if (ratio < P.WALL) { o.wall = true; o.p = 0; }
      else {
        var base = sigmoid(P.SIG_K * (ratio - 1)) * 100;
        var skillBonus = Math.min(P.SKILL_BONUS_CAP, agg.opt[k] + agg.all);
        var modBonus = mods.all + mods.opt[k];
        var noteBonus = (extra && extra.note) ? P.NOTE_BONUS : 0;
        var flowBonus = (extra && extra.flow) ? (P.FLOW_BONUS + mods.flowBonus) : 0;
        o.base = base;
        if (skillBonus) o.breakdown.push({ label: 'スキル', v: skillBonus });
        if (modBonus) o.breakdown.push({ label: '固有エゴ/指導', v: modBonus });
        if (noteBonus) o.breakdown.push({ label: 'アナライズ', v: noteBonus });
        if (flowBonus) o.breakdown.push({ label: 'FLOW', v: flowBonus });
        var mult = skillBonus + modBonus + noteBonus;
        var p = base + (100 - base) * (mult / 100) + flowBonus;
        o.bonus = Math.round(p - base); o.p = clamp(p, 0, 100);
      }
      o.pct = Math.round(o.p);
      list.push(o);
    }
    return list;
  }
  BL.computeOptions = computeOptions;
  BL.previewOptions = function (run) { var m = BL.currentMatchDef(run); return m ? computeOptions(run, m, { note: run.note, flow: false }) : []; };

  function newMatchState(mdef, note) {
    return { name: mdef.name, enemy: mdef.enemy, lead: mdef.lead, rule: mdef.rule, n: mdef.n, rate: mdef.rate, options: mdef.options || null,
             intro: mdef.intro, highlights: mdef.highlights, canon: mdef.canon, winText: mdef.win, loseText: mdef.lose, nominateInt: mdef.nominateInt || 0, final: !!mdef.final,
             note: !!note, idx: 0, me: 0, en: 0, wins: 0, losses: 0, results: [], current: null, showResult: false, ended: false,
             cold: false, draw: false, won: false, flows: 0, flowSuccess: 0 };
  }
  function needWins(m) {
    if (m.rule === 'single') return 1;
    if (m.rule === 'perfect') return m.n;
    if (m.rule === 'mustWin' || m.rule === 'tryout') return Math.floor(m.n / 2) + 1;
    return 0; /* league / group / nel / stage3_rin / stage4_rin: 試合内コールドなし */
  }

  function presentClimax(player, match) {
    var mods = playerMods(player);
    var opts = computeOptions(player, match, { note: match.note, flow: false });
    var best = 0; for (var i = 0; i < opts.length; i++) if (opts[i].p > best) best = opts[i].p;
    var flow = false;
    if (best >= P.FLOW_LO * 100 && best <= P.FLOW_HI * 100) { if (rng() < P.FLOW_P + mods.flowP) flow = true; }
    if (flow) { opts = computeOptions(player, match, { note: match.note, flow: true }); match.flows += 1; }
    match.current = { options: opts, flow: flow, idx: match.idx };
  }

  function awakenSkill(player, optKey, flow, custom) {
    var mods = playerMods(player); var thMult = mods.thMult;
    var families = custom ? [custom.stats[0], custom.stats[1]] : ({ A: ['SHT', 'PHY'], B: ['TEC', 'INT'], C: ['SPD', 'INT'], D: ['INT', 'TEC'] })[optKey];
    var best = null;
    for (var f = 0; f < families.length; f++) {
      var fam = families[f]; var val = player.stats[fam]; var cand = null;
      for (var i = 0; i < D.SKILLS.length; i++) { var sk = D.SKILLS[i]; if (sk.family !== fam) continue; if (val >= sk.th * thMult && (!cand || sk.tier > cand.tier)) cand = sk; }
      if (cand && (!best || cand.tier > best.sk.tier || (cand.tier === best.sk.tier && val > best.val))) best = { sk: cand, val: val };
    }
    if (!best && flow) for (var j = 0; j < D.SKILLS.length; j++) if (D.SKILLS[j].family === families[0] && D.SKILLS[j].tier === 1) { best = { sk: D.SKILLS[j], val: player.stats[families[0]] }; break; }
    if (!best) return null;
    /* 既に同スキルを所持している場合の重複スタックは確率的（FLOW 成功時は確定） */
    if (player.skills[best.sk.id] && !flow && rng() >= P.SKILL_STACK_P) return null;
    player.skills[best.sk.id] = (player.skills[best.sk.id] || 0) + 1;
    return { id: best.sk.id, name: best.sk.name, family: best.sk.family, tier: best.sk.tier, lv: player.skills[best.sk.id], desc: best.sk.desc };
  }
  /** 固有覚醒スキル：主属性 ≥ SIG_TH×thMult で成功、または FLOW 成功で覚醒（既に覚醒済みなら FLOW 成功時のみ Lv+1） */
  function awakenSig(player, flow) {
    var card = cardById(player.cardId); if (!card) return null;
    var c = charOf(card); var mods = playerMods(player);
    var main = D.TYPE_MAP[card.type].stat;
    var cond = flow || player.stats[main] >= P.SIG_TH * mods.thMult;
    if (!cond) return null;
    if (player.sig > 0 && !flow) return null;
    player.sig = (player.sig || 0) + 1;
    return { name: c.sig.name, desc: c.sig.desc, lv: player.sig, sig: true, family: main };
  }

  function resolveClimax(player, match, optKey) {
    var cur = match.current; if (!cur || match.ended) return null;
    var opt = null; for (var i = 0; i < cur.options.length; i++) if (cur.options[i].key === optKey) opt = cur.options[i];
    if (!opt) return null;
    var success = (rng() * 100) < opt.p && opt.p > 0;
    var result = { idx: match.idx, key: optKey, name: opt.name, p: opt.pct, flow: cur.flow, success: success, skill: null, sig: null };
    if (success) {
      match.me += 1; match.wins += 1; if (cur.flow) match.flowSuccess += 1;
      result.skill = awakenSkill(player, optKey, cur.flow, match.options ? match.options[optKey] : null);
      result.sig = awakenSig(player, cur.flow);
    } else { match.en += 1; match.losses += 1; }
    match.results.push(result); match.lastResult = result;
    var remaining = match.n - (match.idx + 1);
    var need = needWins(match);
    var impossible = need > 0 && (match.wins + remaining) < need;
    if (impossible) { match.cold = remaining > 0; match.ended = true; }
    else if (match.idx + 1 >= match.n) match.ended = true;
    if (match.ended) { match.draw = (match.me === match.en); match.won = match.me > match.en; match.current = null; result.matchEnd = true; }
    else { match.idx += 1; presentClimax(player, match); }
    match.showResult = true;
    return result;
  }

  /* ------------------------------------------------------------ run flow */
  function beginMatch(state) {
    var run = state.run; var arc = arcOf(run); var seg = segOf(run);
    var mdef = resolveMatch(run, arc, seg);
    run.phase = 'match';
    run.match = newMatchState(mdef, run.note);
    run.note = false;
    presentClimax(run, run.match);
  }

  BL.chooseClimax = function (state, optKey) {
    var run = state.run;
    if (!run || run.phase !== 'match' || !run.match || run.match.showResult) return null;
    var res = resolveClimax(run, run.match, optKey);
    if (!res) return null;
    if (res.skill) { pushLog(run, '【覚醒】' + res.skill.name + ' Lv.' + res.skill.lv); unlock(state, 'first_skill'); }
    if (res.sig) { pushLog(run, '【固有覚醒】' + res.sig.name + ' Lv.' + res.sig.lv); unlock(state, 'first_sig'); }
    if (res.flow) unlock(state, 'first_flow');
    if (res.success) unlock(state, 'first_goal');
    pushLog(run, 'Climax ' + (res.idx + 1) + '：' + res.name + ' ' + res.p + '% → ' + (res.success ? '成功' : '失敗') + (res.flow ? ' [FLOW]' : ''));
    if (run.match.ended) finishMatch(state);
    BL.save(state);
    return res;
  };
  BL.dismissResult = function (state) {
    var run = state.run; if (!run || !run.match) return;
    run.match.showResult = false; BL.save(state);
  };

  function bidMultiplier(run) { var agg = aggregateSkills(run); var mods = playerMods(run); return (1 + P.BID_SKILL_STEP * agg.count + agg.bid) * mods.bidMult; }
  BL.bidMultiplier = bidMultiplier;

  var RANK_PAR = [90, 170, 630, 2300, 5600, 19000];
  function blRank(run) {
    var total = sumStats(run.stats); var par = RANK_PAR[Math.min(run.arc, RANK_PAR.length - 1)];
    return clamp(Math.round(300 * Math.pow(par / Math.max(1, total), 2)), 1, 300);
  }
  BL.blRank = blRank;

  /** 試合終了：報酬・章内累積・分岐／除籍の確定（この時点で保存されるためリロードで巻き戻らない） */
  function finishMatch(state) {
    var run = state.run; var m = run.match; var arc = arcOf(run);
    var mods = playerMods(run); var agg = aggregateSkills(run);
    var goals = m.me;
    var bidGain = Math.round(goals * arc.bidPerGoal * bidMultiplier(run) * (m.wins === m.n && m.n > 1 ? P.MVP_BID_MULT : 1) * (m.flowSuccess > 0 ? P.FLOW_BID_MULT * mods.flowBidMult : 1));
    var cashGain = Math.round((goals * arc.cashPerGoal + (m.won ? arc.cashWin : 0)) * mods.cashMult * agg.cashMult);
    run.bid += bidGain; run.cash += cashGain;
    run.totals.goals += goals; run.totals.climaxWins += m.wins; run.totals.flows += m.flows; run.totals.matches += 1;
    if (m.won) run.totals.matchWins += 1;
    if (m.cold) unlock(state, 'cold');
    if (run.bid >= 1e8) unlock(state, 'bid_1oku');
    if (run.bid > state.meta.records.bestBid) state.meta.records.bestBid = run.bid;

    var as = run.arcState;
    if (m.rule !== 'single') { as.matches += 1; if (m.won) as.wins += 1; else as.losses += 1; }
    as.goals += goals; if (m.final) as.finalWon = m.won;
    run.history.push({ arc: run.arc, seg: run.seg, name: m.name, enemy: m.enemy, me: m.me, en: m.en, won: m.won, cold: m.cold, rule: m.rule });

    var mr = { name: m.name, enemy: m.enemy, me: m.me, en: m.en, won: m.won, cold: m.cold, draw: m.draw, wins: m.wins, losses: m.losses, n: m.n, rule: m.rule,
               goals: goals, bidGain: bidGain, cashGain: cashGain, bidTotal: run.bid, cashTotal: run.cash, canon: m.canon,
               text: m.won ? m.winText : m.loseText, outcome: 'advance', detail: '', rank: blRank(run) };
    run.rank = mr.rank;
    if (mr.rank < state.meta.records.bestRank) state.meta.records.bestRank = mr.rank;
    if (mr.rank === 1) unlock(state, 'rank_1');

    /* ルール別の帰結 */
    var rule = m.rule;
    if (rule === 'single' && !m.won) { mr.outcome = 'eliminated'; mr.detail = '試練に失敗——脱落'; }
    else if ((rule === 'mustWin' || rule === 'tryout') && !m.won) { mr.outcome = 'eliminated'; mr.detail = m.cold ? 'コールド負け：勝利条件の達成が数学的に不可能となり試合打ち切り' : '敗北——除籍'; }
    else if (rule === 'perfect' && m.wins < m.n) { mr.outcome = 'eliminated'; mr.detail = '完全勝利ならず——世界一には届かなかった'; }
    else if (rule === 'stage3_rin' && !m.won) { mr.outcome = 'branch'; mr.detail = '蜂楽を奪われた。潔と凪、2人で2ndステージへ'; run.flags.rinLoss = true; }
    else if (rule === 'stage4_rin' && !m.won) {
      var nominated = run.stats.INT >= m.nominateInt || goals >= 2;
      if (nominated) { mr.outcome = 'nominated'; mr.detail = '敗北——だが糸師凛が指名した。「そいつが欲しい」。二次選考クリア。'; unlock(state, 'nomination'); }
      else { mr.outcome = 'eliminated'; mr.detail = '敗北。凛が指名したのは他の誰かだった。（指名条件：INT ' + m.nominateInt + ' 以上 または 2得点以上）'; }
    }
    else if (rule === 'league') {
      var cut = arc.cut; var remaining = arc.segments.filter(function (s, i) { return i > run.seg && s.match.rule === 'league'; }).length;
      var maxWins = as.wins + remaining;
      if (maxWins < (cut.leagueWins || 0)) { mr.outcome = 'eliminated'; mr.detail = 'リーグ' + cut.leagueWins + '勝の達成が数学的に不可能——除籍'; }
      else if (m.final && cut.finalMustWin && !m.won) { mr.outcome = 'eliminated'; mr.detail = '最終戦敗北——ブロック3位以下で全員脱落'; }
    }
    else if (rule === 'group') {
      var rem = arc.segments.filter(function (s, i) { return i > run.seg && s.match.rule === 'group'; }).length;
      if (as.wins + rem < 2) { mr.outcome = 'eliminated'; mr.detail = 'グループ2勝（上位2位以内）の達成が数学的に不可能——グループリーグ敗退'; }
    }
    run.matchResult = mr;
    run.phase = 'matchResult';
    if (mr.outcome === 'eliminated') eliminate(state, m.cold ? 'cold' : 'lost', mr.detail, true);
  }

  /** 試合結果画面 → 次へ */
  BL.nextAfterMatch = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'matchResult' || !run.matchResult) return { ok: false };
    var mr = run.matchResult;
    if (mr.outcome === 'eliminated') { run.phase = 'gameover'; BL.save(state); return { ok: true, phase: 'gameover' }; }
    run.match = null; run.matchResult = null;
    run.seg += 1;
    enterSegment(state);
    BL.save(state);
    return { ok: true, phase: run.phase };
  };

  function enterSegment(state) {
    var run = state.run; var arc = arcOf(run);
    while (run.seg < arc.segments.length) {
      var seg = arc.segments[run.seg];
      if (seg.cond && !run.flags[seg.cond]) { run.seg += 1; continue; }
      run.weeksLeft = seg.weeks; run.phase = 'training';
      pushLog(run, '【' + arc.title + '】' + seg.name + '——公式戦まで ' + seg.weeks + ' 週。');
      if (seg.weeks <= 0) beginMatch(state);
      return;
    }
    evaluateArc(state);
  }

  /* ------------------------------------------------------------ arc evaluation */
  function evaluateArc(state) {
    var run = state.run; var arc = arcOf(run); var cut = arc.cut || {}; var as = run.arcState;
    var total = sumStats(run.stats); var checks = [];
    if (cut.statReq) checks.push({ label: '合計ステータス ' + cut.statReq + ' 以上', value: Math.round(total), ok: total >= cut.statReq });
    if (cut.leagueWins) checks.push({ label: 'リーグ ' + cut.leagueWins + ' 勝以上', value: as.wins + '勝' + as.losses + '敗', ok: as.wins >= cut.leagueWins });
    if (cut.finalMustWin) checks.push({ label: '最終戦 vs チームV 勝利', value: as.finalWon ? '勝利' : '敗北', ok: !!as.finalWon });
    if (cut.bidReq) checks.push({ label: '年俸（入札）' + BL.fmtYen(cut.bidReq) + ' 以上（上位23名）', value: BL.fmtYen(run.bid), ok: run.bid >= cut.bidReq });
    if (arc.id === 'wc') checks.push({ label: 'グループ2勝以上 ＆ 決勝トーナメント制覇', value: as.wins + '勝', ok: true });
    if (!checks.length) checks.push({ label: arc.title + ' 突破', value: '達成', ok: true });
    var survived = true; for (var i = 0; i < checks.length; i++) if (!checks[i].ok) survived = false;
    var isFinal = run.arc === ARCS.length - 1;
    var ev = { arc: run.arc, title: arc.title, checks: checks, survived: survived, isFinal: isFinal, gems: 0, total: Math.round(total), bid: run.bid, wins: as.wins, goals: as.goals, rank: blRank(run) };
    if (survived) {
      ev.gems = arc.n === 0 ? 100 : P.GEMS_SURVIVE;
      if (isFinal) { ev.gems += P.GEMS_CLEAR_BONUS; registerHof(state); state.meta.records.clears += 1; unlock(state, 'clear'); }
      state.meta.gems += ev.gems;
      if (run.arc > state.meta.records.bestArc) state.meta.records.bestArc = run.arc;
      var achMap = { entry: 'pass_entry', first: 'pass_first', second: 'pass_second', third: 'pass_u20', nel: 'pass_nel' };
      if (achMap[arc.id]) unlock(state, achMap[arc.id]);
      pushLog(run, '【査定】' + arc.title + ' 生存。Ego Gems +' + ev.gems);
    } else {
      var mods = playerMods(run);
      ev.gems = Math.max(100, Math.round(P.GEMS_ELIM_PER_ARC * arc.n * mods.elimGemMult));
      state.meta.gems += ev.gems; state.meta.records.eliminations += 1;
      if (state.meta.records.eliminations >= 10) unlock(state, 'elim_10');
      pushLog(run, '【査定】' + arc.title + ' 足切り。除籍。補償ジェム +' + ev.gems);
    }
    run.evalResult = ev; run.phase = 'evaluation';
  }

  BL.advance = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'evaluation' || !run.evalResult) return { ok: false };
    var ev = run.evalResult;
    if (ev.survived) {
      if (ev.isFinal) run.phase = 'clear';
      else {
        run.arc += 1; run.seg = 0; run.match = null; run.matchResult = null; run.evalResult = null;
        run.arcState = { matches: 0, wins: 0, losses: 0, goals: 0, finalWon: false };
        run.phase = 'arcIntro';
        pushLog(run, '第' + arcOf(run).n + '章「' + arcOf(run).title + '」開始。');
      }
    } else {
      run.gameover = { reason: 'cutoff', detail: '足切り条件未達', gems: ev.gems, arc: run.arc, total: Math.round(sumStats(run.stats)), skills: aggregateSkills(run).count, bid: run.bid };
      run.phase = 'gameover';
    }
    BL.save(state);
    return { ok: true, phase: run.phase };
  };

  BL.continueStory = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'arcIntro') return { ok: false };
    var arc = arcOf(run);
    if (arc.chooseClub && !run.club) { run.phase = 'clubSelect'; BL.save(state); return { ok: true, phase: 'clubSelect' }; }
    enterSegment(state);
    BL.save(state);
    return { ok: true, phase: run.phase };
  };
  BL.chooseClub = function (state, clubId) {
    var run = state.run;
    if (!run || run.phase !== 'clubSelect') return { ok: false };
    if (!clubById(clubId)) return { ok: false, reason: 'club' };
    run.club = clubId;
    pushLog(run, '【新英雄大戦】' + clubById(clubId).name + ' に加入。');
    enterSegment(state);
    BL.save(state);
    return { ok: true, phase: run.phase };
  };

  function eliminate(state, reason, detail, deferred) {
    var run = state.run; var arc = arcOf(run); var mods = playerMods(run);
    var gems = Math.max(100, Math.round(P.GEMS_ELIM_PER_ARC * arc.n * mods.elimGemMult));
    state.meta.gems += gems; state.meta.records.eliminations += 1;
    if (state.meta.records.eliminations >= 10) unlock(state, 'elim_10');
    run.gameover = { reason: reason, detail: detail, gems: gems, arc: run.arc, total: Math.round(sumStats(run.stats)), skills: aggregateSkills(run).count, bid: run.bid };
    if (!deferred) run.phase = 'gameover';
  }

  function registerHof(state) {
    var run = state.run; var card = cardById(run.cardId);
    var entry = { id: 'hof_' + Date.now() + '_' + Math.floor(rng() * 1e6), cardId: run.cardId, charId: run.charId, name: BL.cardName(card), rar: card.rar,
                  advisorId: run.advisorId, club: run.club, stats: clone(run.stats), skills: clone(run.skills), sig: run.sig || 0, bid: run.bid,
                  totals: clone(run.totals), clearedAt: Date.now(), wc: { status: 'none', stage: 0, wins: 0 } };
    state.meta.hof.push(entry); run.hofId = entry.id;
  }

  function checkStatAch(state) {
    var run = state.run; var t = sumStats(run.stats);
    if (t >= 1000) unlock(state, 'stat_1000');
    if (t >= 10000) unlock(state, 'stat_10000');
    if (t > state.meta.records.bestTotal) state.meta.records.bestTotal = Math.round(t);
  }

  /** ゲームオーバー／クリア画面を閉じる（育成データ抹消・履歴記録） */
  BL.closeRun = function (state) {
    var run = state.run; if (!run) return;
    if (run.phase !== 'gameover' && run.phase !== 'clear') return;
    var card = cardById(run.cardId);
    state.meta.history.unshift({ card: BL.cardName(card), rar: card.rar, arc: run.arc, arcTitle: arcOf(run).title, cleared: run.phase === 'clear',
      reason: run.gameover ? run.gameover.reason : 'clear', total: Math.round(sumStats(run.stats)), bid: run.bid, rank: run.rank || 300, at: Date.now(), runNo: run.runNo });
    if (state.meta.history.length > 20) state.meta.history.length = 20;
    state.run = null; BL.save(state);
  };

  /* ------------------------------------------------------------ lobby */
  BL.startRun = function (state, cardId, advisorId) {
    if (state.run) return { ok: false, reason: 'active' };
    var card = cardById(cardId); var owned = state.meta.roster[cardId];
    if (!card || !owned) return { ok: false, reason: 'notowned' };
    var adv = advisorById(advisorId || 'ego');
    if (!adv || !BL.advisorUnlocked(state, adv)) return { ok: false, reason: 'advisor' };
    var prof = cardProfile(card, owned.dupes);
    state.meta.records.runs += 1;
    state.run = {
      cardId: cardId, charId: card.char, advisorId: adv.id, club: null,
      arc: 0, seg: 0, weeksLeft: 0,
      stats: prof.stats, growth: prof.growth, lb: owned.dupes || 0, hp: 100, cond: 'normal', skills: {}, sig: 0,
      bid: 0, cash: 0, phase: 'arcIntro', protein: false, note: false, event: null, lastEventId: null,
      match: null, matchResult: null, evalResult: null, gameover: null, log: [], flags: {}, history: [],
      arcState: { matches: 0, wins: 0, losses: 0, goals: 0, finalWon: false }, rank: 300,
      totals: { goals: 0, climaxWins: 0, flows: 0, events: 0, purchases: 0, weeksTrained: 0, weeksRested: 0, matches: 0, matchWins: 0 },
      startedAt: Date.now(), runNo: state.meta.records.runs
    };
    pushLog(state.run, BL.cardName(card) + ' の育成を開始（アドバイザー：' + adv.name + '）。');
    unlock(state, 'first_run');
    if (state.meta.records.runs >= 10) unlock(state, 'runs_10');
    BL.save(state);
    return { ok: true };
  };

  function rollRarity() {
    var r = rng() * 100, acc = 0;
    for (var i = 0; i < D.RARITY_ORDER.length; i++) { acc += D.RARITY[D.RARITY_ORDER[i]].rate; if (r < acc) return D.RARITY_ORDER[i]; }
    return '1';
  }
  BL.gacha = function (state, n) {
    var cost = n === 10 ? P.GACHA_TEN : P.GACHA_SINGLE;
    if (state.meta.gems < cost) return { ok: false, reason: 'gems' };
    state.meta.gems -= cost;
    var results = [];
    for (var i = 0; i < n; i++) {
      var rar = rollRarity(); var pool = [];
      for (var j = 0; j < BL.CARDS.length; j++) if (BL.CARDS[j].rar === rar) pool.push(BL.CARDS[j]);
      var card = pick(pool); var entry = state.meta.roster[card.id]; var isNew = !entry;
      if (isNew) state.meta.roster[card.id] = { dupes: 0, obtainedAt: Date.now() }; else entry.dupes += 1;
      if (state.meta.roster[card.id].dupes >= 10) unlock(state, 'lb_10');
      results.push({ id: card.id, name: BL.cardName(card), rar: rar, isNew: isNew, dupes: state.meta.roster[card.id].dupes, type: card.type });
    }
    state.meta.records.gachaPulls += n;
    if (state.meta.records.gachaPulls >= 50) unlock(state, 'gacha_50');
    if (Object.keys(state.meta.roster).length >= 50) unlock(state, 'collect_50');
    BL.save(state);
    return { ok: true, results: results, cost: cost };
  };

  /* ------------------------------------------------------------ World Cup (endgame) */
  function hofById(state, id) { for (var i = 0; i < state.meta.hof.length; i++) if (state.meta.hof[i].id === id) return state.meta.hof[i]; return null; }
  BL.hofById = hofById;
  function wcPlayer(state) { var e = hofById(state, state.wc.hofId); return { stats: e.stats, skills: e.skills, sig: e.sig, cardId: e.cardId, advisorId: e.advisorId, club: null, entry: e }; }
  BL.wcRate = function (stageIdx) {
    var st = D.WORLD_CUP.stages[stageIdx]; var last = ARCS[ARCS.length - 1]; var base = last.segments[last.segments.length - 1].match.rate;
    return { A: Math.round(base.A * st.rateMult.A), B: Math.round(base.B * st.rateMult.B), C: Math.round(base.C * st.rateMult.C), D: Math.round(base.D * st.rateMult.D) };
  };
  BL.wcPlayerOf = function (state) { return wcPlayer(state); };
  BL.startWorldCup = function (state, hofId) {
    if (state.wc) return { ok: false, reason: 'active' };
    var entry = hofById(state, hofId);
    if (!entry) return { ok: false, reason: 'nohof' };
    if (entry.wc.status !== 'none') return { ok: false, reason: 'used' };
    entry.wc.status = 'inprogress';
    state.wc = { hofId: hofId, stage: 0, phase: 'intro', match: null, results: [], champion: false };
    BL.save(state); return { ok: true };
  };
  BL.wcBeginMatch = function (state) {
    var wc = state.wc; if (!wc || wc.phase !== 'intro') return;
    var st = D.WORLD_CUP.stages[wc.stage]; var n = D.WORLD_CUP.climaxes;
    var mdef = { name: 'FIFA W杯 ' + st.name + ' vs ' + st.team, enemy: st.team, lead: st.star, rule: 'mustWin', n: n, rate: BL.wcRate(wc.stage),
                 intro: st.intro, highlights: D.WORLD_CUP.highlights, canon: 'if：殿堂入り選手による成人A代表世界決戦', win: st.team + ' を撃破。', lose: st.team + ' に敗れた。' };
    wc.match = newMatchState(mdef, false); wc.phase = 'match';
    presentClimax(wcPlayer(state), wc.match); BL.save(state);
  };
  BL.wcChooseClimax = function (state, optKey) {
    var wc = state.wc; if (!wc || wc.phase !== 'match' || !wc.match || wc.match.showResult) return null;
    var player = wcPlayer(state); var res = resolveClimax(player, wc.match, optKey); if (!res) return null;
    if (wc.match.ended) {
      var entry = player.entry; var stage = D.WORLD_CUP.stages[wc.stage];
      wc.results.push({ stage: stage.name, team: stage.team, me: wc.match.me, en: wc.match.en, won: wc.match.won });
      if (wc.match.won) {
        entry.wc.wins += 1; entry.wc.stage = wc.stage + 1;
        if (wc.stage + 1 >= D.WORLD_CUP.stages.length) { wc.champion = true; wc.phase = 'end'; entry.wc.status = 'champion'; state.meta.records.wcTitles += 1; state.meta.gems += P.GEMS_CLEAR_BONUS; unlock(state, 'wc_champion'); }
        else wc.phase = 'stageResult';
      } else { wc.phase = 'end'; entry.wc.status = 'out'; entry.wc.stage = wc.stage; }
    }
    BL.save(state); return res;
  };
  BL.wcDismissResult = function (state) { if (state.wc && state.wc.match) { state.wc.match.showResult = false; BL.save(state); } };
  BL.wcNextStage = function (state) { var wc = state.wc; if (!wc || wc.phase !== 'stageResult') return; wc.stage += 1; wc.match = null; wc.phase = 'intro'; BL.save(state); };
  BL.wcClose = function (state) { if (!state.wc || state.wc.phase !== 'end') return; state.wc = null; BL.save(state); };

  /* ------------------------------------------------------------ misc */
  BL.fmtYen = function (v) {
    v = Math.round(v);
    if (v >= 1e8) { var oku = Math.floor(v / 1e8); var man = Math.round((v % 1e8) / 1e4); return oku + '億' + (man ? man.toLocaleString() + '万' : '') + '円'; }
    if (v >= 1e4) return Math.round(v / 1e4).toLocaleString() + '万円';
    return v.toLocaleString() + '円';
  };
  BL.toggleSfx = function (state) { state.meta.sfx = !state.meta.sfx; BL.save(state); return state.meta.sfx; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
