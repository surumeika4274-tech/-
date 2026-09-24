/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  game engine v3 (pure logic, no DOM)
 *  状態遷移関数は state を直接変異させ、直後に BL.save(state) を呼ぶ（不可逆オートセーブ）。
 *  乱数は BL.setRng で差し替え可能（tools/ のバランス検証用）。
 *
 *  v3（第六版）の構造：
 *   - 1 編 = 1 回の育成（RUN）。編を生き残った選手は「卒業生」として meta.grads に保存され、次の編の RUN に持ち越せる。
 *   - 第五編・決戦は、第四編を卒業した 5 人の決戦メンバーで挑む（局面ごとに起用選手を選ぶ。同一選手の起用回数に上限）。
 *   - 永続強化（エゴ強化）・星上げ・熟練度・相棒（化学反応ペア）は RUN を跨いで蓄積する。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  var D = BL.DATA;
  var P = D.PARAMS;
  var ARCS = BL.STORY.arcs;
  var SAVE_KEY = 'bl_pwc_egoist_save_v5';
  var LEGACY_KEYS = ['bl_pwc_egoist_save_v4'];
  var SAVE_VERSION = 5;
  var LAST_ARC = ARCS.length - 1;

  var rng = Math.random;
  BL.setRng = function (fn) { rng = fn; };
  BL.rand = function () { return rng(); };

  /* ------------------------------------------------------------ storage */
  var storage = {
    get: function (key) { try { return (typeof localStorage !== 'undefined') ? localStorage.getItem(key || SAVE_KEY) : null; } catch (e) { return null; } },
    set: function (key, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, v); } catch (e) { /* quota / private mode */ } }
  };
  BL.setStorage = function (s) { storage = s; };

  /* ------------------------------------------------------------ helpers */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(rng() * 1e6).toString(36); }
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
  function upgradeDef(id) { for (var i = 0; i < D.UPGRADES.length; i++) if (D.UPGRADES[i].id === id) return D.UPGRADES[i]; return null; }
  function policyById(id) { for (var i = 0; i < D.POLICIES.length; i++) if (D.POLICIES[i].id === id) return D.POLICIES[i]; return null; }

  BL.cardById = cardById; BL.charOf = charOf; BL.skillById = skillById; BL.advisorById = advisorById; BL.clubById = clubById; BL.upgradeDef = upgradeDef; BL.policyById = policyById;
  BL.sumStats = sumStats; BL.skillCount = skillCount; BL.clamp = clamp;
  BL.starterCard = function () {
    for (var i = 0; i < BL.CARDS.length; i++) if (BL.CARDS[i].char === D.STARTER_CARD.char && BL.CARDS[i].title === D.STARTER_CARD.title) return BL.CARDS[i];
    return BL.CARDS[BL.CARDS.length - 1];
  };
  BL.cardName = function (card) { return charOf(card).name + '【' + card.title + '】'; };

  /* ------------------------------------------------------------ meta / save */
  function newState() {
    var roster = {}; roster[BL.starterCard().id] = { dupes: 0, tier: 0, obtainedAt: Date.now() };
    return {
      v: SAVE_VERSION,
      meta: {
        gems: P.INITIAL_GEMS, roster: roster, hof: [],
        achievements: {}, pendingAch: [],
        records: { runs: 0, eliminations: 0, clears: 0, bestArc: -1, gachaPulls: 0, wcTitles: 0, bestRank: 300, bestBid: 0, bestTotal: 0, grads: 0, finals: 0, choices: 0 },
        history: [], sfx: true, portraits: {}, pieces: 0,
        grads: [], upgrades: {}, mastery: {}, squadPick: [], difficulty: 'normal', daily: { date: '', progress: {}, claimed: {}, claimedTotal: 0 },
        createdAt: Date.now()
      },
      run: null, wc: null
    };
  }
  /** 旧バージョンのセーブ（v4 以前）からメタデータだけを引き継ぐ。進行中の RUN／W杯は構造が異なるため破棄する */
  function migrate(old) {
    var n = newState();
    var fresh = newState().meta;
    if (old.meta) for (var k in old.meta) if (old.meta.hasOwnProperty(k)) n.meta[k] = old.meta[k];
    for (var f in fresh) if (fresh.hasOwnProperty(f) && n.meta[f] === undefined) n.meta[f] = fresh[f];
    for (var r in fresh.records) if (n.meta.records[r] === undefined) n.meta.records[r] = fresh.records[r];
    for (var id in n.meta.roster) if (n.meta.roster[id] && n.meta.roster[id].tier === undefined) n.meta.roster[id].tier = 0;
    if (!Object.keys(n.meta.roster).length) n.meta.roster = fresh.roster;
    for (var h = 0; h < n.meta.hof.length; h++) { var e = n.meta.hof[h]; if (e.wc && e.wc.status === 'inprogress') e.wc.status = 'none'; }
    n.run = null; n.wc = null; n.migratedFrom = old.v || 0; n.migratedAt = Date.now();
    return n;
  }
  BL.load = function () {
    var raw = storage.get(SAVE_KEY);
    if (!raw) {
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        var oldRaw = storage.get(LEGACY_KEYS[i]);
        if (oldRaw) { try { var os = JSON.parse(oldRaw); if (os && os.meta) { var mig = migrate(os); BL.save(mig); return mig; } } catch (e) { /* ignore */ } }
      }
      var s = newState(); BL.save(s); return s;
    }
    try {
      var st = JSON.parse(raw);
      if (!st || !st.meta) { var n = newState(); BL.save(n); return n; }
      if (st.v !== SAVE_VERSION) { var m2 = migrate(st); BL.save(m2); return m2; }
      var fresh = newState().meta;
      for (var k in fresh) if (fresh.hasOwnProperty(k) && st.meta[k] === undefined) st.meta[k] = fresh[k];
      for (var r in fresh.records) if (st.meta.records[r] === undefined) st.meta.records[r] = fresh.records[r];
      if (!Object.keys(st.meta.roster).length) st.meta.roster = fresh.roster;
      return st;
    } catch (e) { var f = newState(); BL.save(f); return f; }
  };
  BL.save = function (state) { storage.set(SAVE_KEY, JSON.stringify(state)); };
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

  /* ------------------------------------------------------------ デイリーミッション・難易度 */
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  BL.todayKey = todayKey;
  function daily(state) {
    var m = state.meta; if (!m.daily) m.daily = { date: '', progress: {}, claimed: {}, claimedTotal: 0 };
    var t = todayKey(); if (m.daily.date !== t) { m.daily.date = t; m.daily.progress = {}; m.daily.claimed = {}; }
    return m.daily;
  }
  BL.daily = function (state) { var d = daily(state); return d; };
  function bumpDaily(state, key, n) { var d = daily(state); d.progress[key] = (d.progress[key] || 0) + (n || 1); }
  BL.missionStatus = function (state) {
    var d = daily(state);
    return D.MISSIONS.map(function (ms) { var cur = Math.min(ms.goal, d.progress[ms.key] || 0); return { id: ms.id, name: ms.name, goal: ms.goal, cur: cur, done: cur >= ms.goal, claimed: !!d.claimed[ms.id], reward: ms.reward }; });
  };
  BL.claimMission = function (state, id) {
    var d = daily(state); var ms = null; for (var i = 0; i < D.MISSIONS.length; i++) if (D.MISSIONS[i].id === id) ms = D.MISSIONS[i];
    if (!ms) return { ok: false, reason: 'id' };
    if (d.claimed[id]) return { ok: false, reason: 'claimed' };
    if ((d.progress[ms.key] || 0) < ms.goal) return { ok: false, reason: 'incomplete' };
    d.claimed[id] = true; d.claimedTotal = (d.claimedTotal || 0) + 1;
    if (ms.reward.gems) state.meta.gems += ms.reward.gems;
    if (ms.reward.pieces) state.meta.pieces = (state.meta.pieces || 0) + ms.reward.pieces;
    if (d.claimedTotal >= 10) unlock(state, 'mission_10');
    BL.save(state); return { ok: true, reward: ms.reward };
  };
  BL.setDifficulty = function (state, id) { if (!D.DIFFICULTIES[id]) return { ok: false }; state.meta.difficulty = id; BL.save(state); return { ok: true }; };
  function diffOf(run) { return D.DIFFICULTIES[run.difficulty] || D.DIFFICULTIES.normal; }
  BL.diffOf = diffOf;

  /* ------------------------------------------------------------ 永続強化・熟練度・星上げ */
  /** 永続強化の合成効果。upg = { id: Lv } */
  function upgradeFx(upg) {
    var fx = { growth: { SHT: 0, SPD: 0, TEC: 0, INT: 0, PHY: 0 }, restBonus: 0, flowP: 0, thMult: 1, eventRate: 0, priceMult: 1, bidMult: 1, elimGemMult: 1, finalUses: 0, baseStat: 0 };
    if (!upg) return fx;
    for (var i = 0; i < D.UPGRADES.length; i++) {
      var def = D.UPGRADES[i]; var lv = upg[def.id] || 0; if (!lv) continue; var per = def.per;
      if (per.growthAll) for (var s = 0; s < D.STATS.length; s++) fx.growth[D.STATS[s]] += per.growthAll * lv;
      if (per.restBonus) fx.restBonus += per.restBonus * lv;
      if (per.flowP) fx.flowP += per.flowP * lv;
      if (per.thMult) fx.thMult *= (1 + per.thMult * lv);
      if (per.eventRate) fx.eventRate += per.eventRate * lv;
      if (per.priceMult) fx.priceMult *= (1 + per.priceMult * lv);
      if (per.bidMult) fx.bidMult *= (1 + per.bidMult * lv);
      if (per.elimGemMult) fx.elimGemMult *= (1 + per.elimGemMult * lv);
      if (per.finalUses) fx.finalUses += per.finalUses * lv;
      if (per.baseStat) fx.baseStat += per.baseStat * lv;
    }
    return fx;
  }
  BL.upgradeFx = upgradeFx;
  BL.upgradeCost = function (state, id) { var def = upgradeDef(id); if (!def) return 0; var lv = state.meta.upgrades[id] || 0; return lv >= def.max ? 0 : def.cost * (lv + 1); };
  BL.buyUpgrade = function (state, id) {
    var def = upgradeDef(id); if (!def) return { ok: false, reason: 'id' };
    var lv = state.meta.upgrades[id] || 0; if (lv >= def.max) return { ok: false, reason: 'max' };
    var cost = def.cost * (lv + 1); if (state.meta.gems < cost) return { ok: false, reason: 'gems' };
    state.meta.gems -= cost; state.meta.upgrades[id] = lv + 1;
    unlock(state, 'upgrade_1'); if (lv + 1 >= def.max) unlock(state, 'upgrade_max');
    BL.save(state); return { ok: true, lv: lv + 1, cost: cost, def: def };
  };
  function masteryLvOf(xp) { var lv = 0; for (var i = 0; i < D.MASTERY_TH.length; i++) if ((xp || 0) >= D.MASTERY_TH[i]) lv = i; return lv; }
  function masteryLv(state, charId) { return masteryLvOf((state.meta.mastery || {})[charId] || 0); }
  BL.masteryLv = masteryLv; BL.masteryLvOf = masteryLvOf;
  BL.masteryXp = function (state, charId) { return (state.meta.mastery || {})[charId] || 0; };
  function addMastery(state, charId, xp) {
    state.meta.mastery[charId] = (state.meta.mastery[charId] || 0) + xp;
    if (masteryLv(state, charId) >= 5) unlock(state, 'mastery_5');
  }
  /** 星上げ後の実効レアリティ（'1'〜'8'） */
  function effRar(card, tier) { return String(Math.min(8, Number(card.rar) + (tier || 0))); }
  BL.effRar = function (card, own) { return effRar(card, own && own.tier); };
  BL.starUp = function (state, cardId) {
    var card = cardById(cardId); var own = state.meta.roster[cardId];
    if (!card || !own) return { ok: false, reason: 'notowned' };
    var tier = own.tier || 0;
    if (tier >= P.STARUP_MAX) return { ok: false, reason: 'max' };
    var cur = Number(effRar(card, tier)); if (cur >= 8) return { ok: false, reason: 'top' };
    var cost = D.PIECES.starUp[String(cur + 1)];
    if ((state.meta.pieces || 0) < cost) return { ok: false, reason: 'pieces' };
    state.meta.pieces -= cost; own.tier = tier + 1;
    unlock(state, 'star_up');
    BL.save(state); return { ok: true, rar: String(cur + 1), cost: cost, tier: own.tier };
  };
  BL.starUpCost = function (state, cardId) { var card = cardById(cardId); var own = state.meta.roster[cardId]; if (!card || !own) return null; var cur = Number(effRar(card, own.tier)); if (cur >= 8 || (own.tier || 0) >= P.STARUP_MAX) return null; return { rar: String(cur + 1), cost: D.PIECES.starUp[String(cur + 1)] }; };

  /* ------------------------------------------------------------ card profile */
  /** opts: { dupes, tier, masteryLv, baseStat } （数値なら dupes） */
  function cardProfile(card, opts) {
    if (typeof opts === 'number') opts = { dupes: opts };
    opts = opts || {};
    var c = charOf(card), rar = effRar(card, opts.tier), r = D.RARITY[rar], t = D.TYPE_MAP[card.type];
    var lb = 1 + P.LB_STEP * (opts.dupes || 0);
    var mast = 1 + P.MASTERY_BASE * (opts.masteryLv || 0);
    var upg = 1 + (opts.baseStat || 0);
    var stats = {}, growth = {};
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i], main = (s === t.stat);
      stats[s] = r1(r.base * c.ident[s] * (main ? 1.3 : 0.95) * lb * mast * upg);
      growth[s] = Math.round(r.growth * (0.7 + 0.3 * c.ident[s]) * (main ? 1.12 : 1.0) * 100) / 100;
    }
    return { stats: stats, growth: growth, mainStat: t.stat, rar: rar };
  }
  BL.cardProfile = cardProfile;
  /** 所持状況・熟練度・永続強化を反映したプロファイル（ロビー表示・RUN 開始用） */
  BL.profileFor = function (state, card) {
    var own = state.meta.roster[card.id]; var fx = upgradeFx(state.meta.upgrades);
    return cardProfile(card, { dupes: own ? own.dupes : 0, tier: own ? own.tier : 0, masteryLv: masteryLv(state, card.char), baseStat: fx.baseStat });
  };

  /* 相棒の化学反応：主属性の成長 + 原作ペアなら追加効果 */
  function chemistryFor(charId, partnerCard, partnerTier) {
    if (!partnerCard || partnerCard.char === charId) return null;
    var pc = partnerCard.char; var pair = null;
    for (var i = 0; i < D.CHEMISTRY.length; i++) { var c = D.CHEMISTRY[i]; if ((c.a === charId && c.b === pc) || (c.a === pc && c.b === charId)) pair = c; }
    var tier = Number(effRar(partnerCard, partnerTier || 0));
    var main = D.TYPE_MAP[partnerCard.type].stat;
    var fx = { growth: {} }; fx.growth[main] = Math.round((P.PARTNER_GROWTH_BASE + P.PARTNER_GROWTH_TIER * tier) * 1000) / 1000;
    return { pair: pair, name: pair ? pair.name : '相棒', fx: fx, pairFx: pair ? pair.fx : null, partnerChar: pc, main: main };
  }
  BL.chemistryFor = function (state, charId, partnerCardId) { var pc = cardById(partnerCardId); var own = state.meta.roster[partnerCardId]; return chemistryFor(charId, pc, own ? own.tier : 0); };

  /* 全補正の集約：キャラ固有エゴ + タイプ + アドバイザー + クラブ + 方針 + 永続強化 + 熟練度 + 相棒 */
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
      if (card.flow) merge({ flowP: P.FLOW_CARD_P, flowBonus: P.FLOW_CARD_BONUS });
      var posOpt = D.POS_AFFINITY[card.pos && card.pos[0]]; if (posOpt) { var pf = { opt: {} }; pf.opt[posOpt] = P.POS_BONUS; merge(pf); }
    }
    if (player.advisorId) { var adv = advisorById(player.advisorId); if (adv) merge(adv.fx); }
    if (player.club) { var club = clubById(player.club); if (club) merge(club.passive); }
    if (player.policy) { var pol = policyById(player.policy); if (pol) merge({ growth: pol.growth }); }
    if (player.upg) merge(upgradeFx(player.upg));
    if (player.storyFx) merge(player.storyFx);
    if (player.masteryLv) { var mg = { growth: {} }; for (var i = 0; i < D.STATS.length; i++) mg.growth[D.STATS[i]] = P.MASTERY_GROWTH * player.masteryLv; merge(mg); }
    if (player.partnerId && card) { var ch = chemistryFor(card.char, cardById(player.partnerId), player.partnerTier || 0); if (ch) { merge(ch.fx); if (ch.pairFx) merge(ch.pairFx); } }
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

  /* ------------------------------------------------------------ 決戦（5人編成）の補助 */
  function isFinal(run) { return !!run && run.kind === 'final'; }
  BL.isFinal = isFinal;
  /** i 番目の決戦メンバーを「1人の選手」として扱うビュー。stats / skills はオブジェクト参照を共有し、hp / cond / sig は writeBack で書き戻す */
  function playerView(run, i) {
    var p = run.players[i];
    return Object.assign({}, run, { stats: p.stats, growth: p.growth, skills: p.skills, sig: p.sig, lb: p.lb, hp: p.hp, cond: p.cond, cardId: p.cardId, charId: p.charId,
                                    masteryLv: p.masteryLv, club: p.club, partnerId: null, partnerChar: null, partnerTier: 0, pIdx: i });
  }
  function writeBack(run, i, v) { var p = run.players[i]; p.sig = v.sig; p.hp = v.hp; p.cond = v.cond; }
  BL.playerView = playerView;
  function captainIdx(run) { var best = 0, bt = -1; for (var i = 0; i < run.players.length; i++) { var t = sumStats(run.players[i].stats); if (t > bt) { bt = t; best = i; } } return best; }
  BL.captainIdx = captainIdx;
  /** run.stats / hp / cond / skills / sig を決戦メンバーの代表値に同期（平均ステータス・最低HP・キャプテンのスキル） */
  function syncFinal(run) {
    if (!isFinal(run)) return;
    var avg = {}; var n = run.players.length; var minHp = 100;
    for (var s = 0; s < D.STATS.length; s++) { var k = D.STATS[s]; var t = 0; for (var i = 0; i < n; i++) t += run.players[i].stats[k]; avg[k] = r1(t / n); }
    for (var j = 0; j < n; j++) if (!run.players[j].injured && run.players[j].hp < minHp) minHp = run.players[j].hp;
    var c = captainIdx(run);
    run.stats = avg; run.hp = minHp; run.cond = run.players[c].cond; run.skills = clone(run.players[c].skills); run.sig = run.players[c].sig;
    run.cardId = run.players[c].cardId; run.charId = run.players[c].charId; run.captain = c;
  }
  function primary(run) { return isFinal(run) ? playerView(run, captainIdx(run)) : run; }
  function usesCap(run) { return P.FINAL_USES + upgradeFx(run.upg).finalUses; }
  BL.usesCap = usesCap;
  function healthyCount(run) { var n = 0; for (var i = 0; i < run.players.length; i++) if (!run.players[i].injured) n++; return n; }
  BL.healthyCount = healthyCount;

  /* ------------------------------------------------------------ arcs / segments */
  function arcOf(run) { return ARCS[run.arc]; }
  function segOf(run) { return arcOf(run).segments[run.seg]; }
  BL.arcOf = arcOf; BL.segOf = segOf;

  /** 節の試合定義を解決（NEL は所属クラブと対戦順から相手を決定） */
  function resolveMatch(run, arc, seg) {
    var m = clone(seg.match); m.segId = seg.id;
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
      m.oppClub = opp.id; if (text.rival) m.rival = text.rival;
    }
    /* 難易度 */
    var dm = diffOf(run).rateMult; if (dm !== 1) { var dk = ['A', 'B', 'C', 'D']; for (var di = 0; di < dk.length; di++) if (m.rate[dk[di]] != null) m.rate[dk[di]] = Math.round(m.rate[dk[di]] * dm); }
    /* ストーリー分岐による敵レート補正・指名条件補正 */
    var sr = run.segRate && run.segRate[seg.id];
    if (sr) { var keys = ['A', 'B', 'C', 'D']; for (var ki = 0; ki < keys.length; ki++) { var kk = keys[ki]; if (m.rate[kk] == null) continue; var mult = (typeof sr === 'number') ? sr : (sr.all || 1) * (sr[kk] || 1); m.rate[kk] = Math.round(m.rate[kk] * mult); } }
    if (m.nominateInt && run.nominateMult) m.nominateInt = Math.round(m.nominateInt * run.nominateMult);
    return m;
  }
  /** 試合画面に出すライバルの代表カード（そのキャラの最高レア） */
  BL.rivalCard = function (charId) { var best = null; for (var i = 0; i < BL.CARDS.length; i++) { var c = BL.CARDS[i]; if (c.char !== charId) continue; if (!best || Number(c.rar) > Number(best.rar)) best = c; } return best; };
  BL.resolveMatch = resolveMatch;
  BL.currentMatchDef = function (run) { var seg = segOf(run); return seg ? resolveMatch(run, arcOf(run), seg) : null; };

  /* ------------------------------------------------------------ training */
  function skillGrowthMult(player) { return 1 + P.SKILL_STEP * aggregateSkills(player).count; }
  function hpEfficiency(hp) { return hp >= 50 ? 1.0 : (hp >= 30 ? P.HP_EFF_TIRED : P.HP_EFF_DANGER); }
  BL.hpEfficiency = hpEfficiency;
  BL.hpState = function (hp) { return hp >= 50 ? 'full' : (hp >= 30 ? 'tired' : 'danger'); };

  function baseGain(player, stat, isMain) {
    var arc = arcOf(player);
    var cur = player.stats[stat];
    var base = (isMain ? P.BASE_MAIN : P.BASE_SUB) * arc.envMult;
    var comp = cur * (isMain ? P.COMP_MAIN : P.COMP_SUB);
    var mods = playerMods(player);
    var g = player.growth[stat] * (1 + mods.growth[stat]) * (1 + P.LB_GROWTH * (player.lb || 0));
    return (base + comp) * skillGrowthMult(player) * g;
  }
  function previewGainOf(player, stat, protein, hot) {
    var eff = hpEfficiency(player.hp) * (protein ? 2 : 1) * D.CONDITIONS[player.cond].mult;
    var out = {};
    for (var i = 0; i < D.STATS.length; i++) { var s = D.STATS[i]; out[s] = r1(baseGain(player, s, s === stat) * eff * (s === stat && stat === hot ? P.HOT_MULT : 1)); }
    return out;
  }
  BL.previewGain = function (run, stat) { return previewGainOf(primary(run), stat, run.protein, run.hot); };
  BL.previewGainFor = function (run, i, stat) { return previewGainOf(playerView(run, i), stat, run.protein, run.hot); };
  /* 化学反応練習：週ごとに 1 属性が指定され、その主獲得量が ×HOT_MULT */
  function rollHot(run) {
    var pool = D.STATS.filter(function (s) { return s !== run.hot; });
    run.hot = pool[Math.floor(rng() * pool.length)];
  }
  function hpCostBase(player) {
    var mods = playerMods(player); var agg = aggregateSkills(player);
    return Math.max(5, P.HP_COST + mods.hpCost + agg.hpCost + D.CONDITIONS[player.cond].hpCost);
  }
  BL.expectedHpCost = function (run) { return hpCostBase(primary(run)); };
  function injuryChance(player) {
    var mods = playerMods(player); var agg = aggregateSkills(player);
    return clamp(P.INJURY_P + mods.injuryP + agg.injuryP, 0.05, 1);
  }
  BL.injuryChance = function (run) { return injuryChance(primary(run)); };

  function shiftCond(player, delta, floor) {
    var idx = D.COND_ORDER.indexOf(player.cond);
    idx = clamp(idx + delta, floor ? 1 : 0, D.COND_ORDER.length - 1);
    player.cond = D.COND_ORDER[idx];
  }

  /** 1 人分の練習処理。player は run または決戦メンバーのビュー。戻り値 { gains, injured, hpCost } */
  function trainOne(state, run, player, stat, res) {
    var mods = playerMods(player);
    if (player.hp < 30 && rng() < injuryChance(player)) return { injured: true };
    var eff = hpEfficiency(player.hp) * (run.protein ? 2 : 1) * D.CONDITIONS[player.cond].mult;
    var gains = {};
    for (var i = 0; i < D.STATS.length; i++) {
      var s = D.STATS[i];
      var g = r1(baseGain(player, s, s === stat) * eff * (s === stat && stat === run.hot ? P.HOT_MULT : 1));
      player.stats[s] = r1(player.stats[s] + g); gains[s] = g;
    }
    var cost = hpCostBase(player) + Math.round((rng() * 2 - 1) * P.HP_COST_VAR);
    player.hp = clamp(player.hp - Math.max(5, cost), 0, 100);
    var cr = rng();
    if (cr < P.COND_DOWN_P) shiftCond(player, -1, mods.condFloor); else if (cr < P.COND_DOWN_P + P.COND_UP_P) shiftCond(player, 1, mods.condFloor);
    return { injured: false, gains: gains, hpCost: cost, eff: eff };
  }

  BL.train = function (state, stat) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false, reason: 'phase' };
    if (D.STATS.indexOf(stat) < 0) return { ok: false, reason: 'stat' };
    var res = { ok: true, stat: stat, hpBefore: run.hp, injured: false, gains: {}, event: false, condBefore: run.cond, hot: (stat === run.hot), protein: !!run.protein, per: [] };
    if (isFinal(run)) {
      for (var i = 0; i < run.players.length; i++) {
        var p = run.players[i]; if (p.injured) continue;
        var v = playerView(run, i); var r = trainOne(state, run, v, stat, res);
        if (r.injured) { p.injured = true; p.uses = 99; res.per.push({ i: i, injured: true }); pushLog(run, '【故障】' + p.name + '——危険水域での練習強行で靭帯断裂。決戦から離脱。'); unlock(state, 'injury'); continue; }
        writeBack(run, i, v); res.per.push({ i: i, gains: r.gains, hp: p.hp });
      }
      var cap = captainIdx(run); var pr = res.per.filter(function (x) { return x.i === cap && x.gains; })[0]; res.gains = pr ? pr.gains : (res.per.filter(function (x) { return x.gains; })[0] || {}).gains || {};
      syncFinal(run);
      if (healthyCount(run) < P.FINAL_MIN_HEALTHY) {
        run.weeksLeft = Math.max(0, run.weeksLeft - 1);
        pushLog(run, '【離脱】故障者が続出し、決戦メンバーが ' + P.FINAL_MIN_HEALTHY + ' 人を割った。');
        eliminate(state, 'injury', '故障者が続出し、決戦メンバーが ' + P.FINAL_MIN_HEALTHY + ' 人を割った');
        res.injured = true; BL.save(state); return res;
      }
    } else {
      var one = trainOne(state, run, run, stat, res);
      if (one.injured) {
        res.injured = true;
        run.weeksLeft = Math.max(0, run.weeksLeft - 1);
        pushLog(run, '【故障】危険水域での練習強行——靭帯断裂。選手生命が終了した。');
        unlock(state, 'injury');
        eliminate(state, 'injury', '靭帯断裂：HP' + run.hp + '%での練習強行により選手生命が終了');
        BL.save(state);
        return res;
      }
      res.gains = one.gains; res.eff = one.eff; res.hpCost = one.hpCost;
    }
    run.protein = false;
    rollHot(run);
    res.hpAfter = run.hp; res.condAfter = run.cond;
    run.weeksLeft -= 1; run.totals.weeksTrained += 1; bumpDaily(state, 'weeksTrained', 1);
    pushLog(run, arcOf(run).title + ' 残' + run.weeksLeft + '週：' + D.STAT_META[stat].en + ' 練習 (+' + (res.gains[stat] || 0) + (isFinal(run) ? ' 代表' : '') + ')' + (res.protein ? ' [プロテイン×2]' : ''));
    checkStatAch(state);

    var mods = playerMods(primary(run));
    if (rng() < P.EVENT_RATE + mods.eventRate) {
      var ev = pickEvent(run);
      if (ev) { run.phase = 'event'; run.event = { id: ev.id, trainedStat: stat }; res.event = true; }
    }
    if (!res.event) afterWeek(state);
    BL.save(state);
    return res;
  };

  function pairMatches(run, pair) {
    var pc = run.partnerChar; if (!pc) return false;
    return (pair[0] === run.charId && pair[1] === pc) || (pair[1] === run.charId && pair[0] === pc);
  }
  function pickEvent(run) {
    var pool = []; var arc = arcOf(run);
    for (var i = 0; i < D.EVENTS.length; i++) {
      var e = D.EVENTS[i];
      if (e.rival && e.rival === run.charId) continue;
      if (e.rival && run.partnerChar && e.rival === run.partnerChar) continue;
      if (e.pair && !pairMatches(run, e.pair)) continue;
      if (e.arcs && e.arcs.indexOf(arc.id) < 0) continue;
      if (run.lastEventId === e.id) continue;
      pool.push(e); if (e.pair) pool.push(e); /* ペアイベントは重み 2 */
    }
    return pool.length ? pick(pool) : null;
  }
  BL.eventById = function (id) { for (var i = 0; i < D.EVENTS.length; i++) if (D.EVENTS[i].id === id) return D.EVENTS[i]; return null; };
  BL.eventPoolFor = function (run) { var out = []; var arc = arcOf(run); for (var i = 0; i < D.EVENTS.length; i++) { var e = D.EVENTS[i]; if (e.rival && (e.rival === run.charId || e.rival === run.partnerChar)) continue; if (e.pair && !pairMatches(run, e.pair)) continue; if (e.arcs && e.arcs.indexOf(arc.id) < 0) continue; out.push(e); } return out; };

  BL.rest = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'training') return { ok: false };
    var before = run.hp;
    if (isFinal(run)) {
      for (var i = 0; i < run.players.length; i++) {
        var p = run.players[i]; if (p.injured) continue; var v = playerView(run, i); var mods = playerMods(v);
        v.hp = clamp(v.hp + P.REST_HEAL + mods.restBonus, 0, 100);
        if (rng() < P.COND_REST_UP_P) shiftCond(v, 1, mods.condFloor);
        writeBack(run, i, v);
      }
      syncFinal(run);
    } else {
      var m = playerMods(run);
      run.hp = clamp(run.hp + P.REST_HEAL + m.restBonus, 0, 100);
      if (rng() < P.COND_REST_UP_P) shiftCond(run, 1, m.condFloor);
    }
    rollHot(run);
    run.weeksLeft -= 1; run.totals.weeksRested += 1;
    pushLog(run, arcOf(run).title + ' 残' + run.weeksLeft + '週：休養 (HP ' + before + '→' + run.hp + ')');
    afterWeek(state);
    BL.save(state);
    return { ok: true, hpBefore: before, hpAfter: run.hp };
  };

  function afterWeek(state) { var run = state.run; if (run.weeksLeft <= 0) beginMatch(state); }

  /* ------------------------------------------------------------ events */
  function applyFxTarget(player, fx, ctx, out, mods) {
    var i, s;
    if (fx.stat) for (s in fx.stat) if (fx.stat.hasOwnProperty(s)) {
      var g = r1(baseGain(player, s, true) * fx.stat[s]); player.stats[s] = r1(player.stats[s] + g); out.push(D.STAT_META[s].en + ' +' + g);
    }
    if (fx.trained && ctx && ctx.trainedStat) {
      var tg = r1(baseGain(player, ctx.trainedStat, true) * fx.trained); player.stats[ctx.trainedStat] = r1(player.stats[ctx.trainedStat] + tg); out.push(D.STAT_META[ctx.trainedStat].en + ' +' + tg);
    }
    if (fx.weakest) {
      var w = D.STATS[0]; for (i = 1; i < D.STATS.length; i++) if (player.stats[D.STATS[i]] < player.stats[w]) w = D.STATS[i];
      var wg = r1(baseGain(player, w, true) * fx.weakest); player.stats[w] = r1(player.stats[w] + wg); out.push(D.STAT_META[w].en + ' +' + wg);
    }
    if (fx.allStat) {
      for (i = 0; i < D.STATS.length; i++) { s = D.STATS[i]; player.stats[s] = r1(player.stats[s] + r1(baseGain(player, s, true) * fx.allStat)); }
      out.push('全能力 +' + Math.round(fx.allStat * 100) + '%相当');
    }
    if (fx.hp) { var hb = player.hp; player.hp = clamp(player.hp + fx.hp, 0, 100); out.push('HP ' + hb + '→' + player.hp); }
    if (fx.cond) { var cb = player.cond; shiftCond(player, fx.cond, mods.condFloor); if (cb !== player.cond) out.push('コンディション ' + D.CONDITIONS[cb].label + '→' + D.CONDITIONS[player.cond].label); }
  }
  function applyFx(state, run, fx, ctx) {
    var out = []; var arc = arcOf(run); var mods = playerMods(primary(run));
    var nArc = Math.max(1, arc.n);
    if (isFinal(run)) {
      for (var i = 0; i < run.players.length; i++) { if (run.players[i].injured) continue; var v = playerView(run, i); applyFxTarget(v, fx, ctx, i === captainIdx(run) ? out : [], playerMods(v)); writeBack(run, i, v); }
      if (out.length) out.push('（決戦メンバー全員）');
      syncFinal(run);
    } else applyFxTarget(run, fx, ctx, out, mods);
    if (fx.cashPerArc) { var cg = Math.round(fx.cashPerArc * nArc * (fx.cashPerArc > 0 ? mods.cashMult : 1)); run.cash = Math.max(0, run.cash + cg); out.push('Cash ' + (cg >= 0 ? '+' : '') + '¥' + cg.toLocaleString()); }
    if (fx.bidPerArc) { var bg = fx.bidPerArc * nArc; run.bid += bg; out.push('年俸 +' + BL.fmtYen(bg)); }
    if (fx.protein) { run.protein = true; out.push('次回練習 獲得量×2'); }
    return out;
  }

  BL.resolveEvent = function (state, idx) {
    var run = state.run;
    if (!run || run.phase !== 'event' || !run.event) return { ok: false };
    var ev = BL.eventById(run.event.id); var choice = ev.choices[idx];
    if (!choice) return { ok: false };
    var res = { ok: true, title: ev.title, label: choice.label, text: '', effects: [], pair: !!ev.pair };
    var fx = choice.fx;
    if (fx.roll) {
      var win = rng() < fx.roll.p; res.rollWin = win;
      res.text = win ? fx.roll.winText : fx.roll.loseText;
      res.effects = applyFx(state, run, win ? fx.roll.win : fx.roll.lose, run.event);
    } else { res.text = choice.result; res.effects = applyFx(state, run, fx, run.event); }
    run.lastEventId = ev.id; run.totals.events += 1;
    if (ev.pair) { run.totals.pairEvents = (run.totals.pairEvents || 0) + 1; unlock(state, 'chem_pair'); }
    pushLog(run, '【イベント】' + ev.title + ' → ' + choice.label + (res.effects.length ? '（' + res.effects.join(' / ') + '）' : ''));
    run.event = null; run.phase = 'training';
    checkStatAch(state);
    afterWeek(state);
    BL.save(state);
    return res;
  };

  /* ------------------------------------------------------------ store */
  BL.itemPrice = function (item, run) { return Math.round(item.price * Math.max(1, arcOf(run).n) * playerMods(primary(run)).priceMult); };
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
    if (itemId === 'capsule') { if (isFinal(run)) { for (var j = 0; j < run.players.length; j++) if (!run.players[j].injured) run.players[j].hp = 100; syncFinal(run); } else run.hp = 100; msg = 'HP 100% まで全回復した。'; }
    if (itemId === 'protein') { run.protein = true; msg = '次の練習1回の獲得量が2倍になる。'; }
    if (itemId === 'note') { run.note = true; msg = '次の試合の全選択肢成功率 +10%。'; }
    run.totals.purchases += 1;
    pushLog(run, '【購買部】' + item.name + ' 購入 (-¥' + price.toLocaleString() + ')');
    BL.save(state);
    return { ok: true, msg: msg, item: item };
  };

  /* ------------------------------------------------------------ match core */
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /** 選択肢と成功率。player: {stats, skills, sig, cardId, advisorId, club, ...} / mdef: {rate, options?, rule} / extra: {note, flow} */
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
        o.bonus = Math.round(p - base); o.p = clamp(p, 0, mdef.rule === 'single' ? 100 : P.P_CAP); /* 成功率上限（単発の試練は除く） */
      }
      o.pct = Math.round(o.p);
      list.push(o);
    }
    return list;
  }
  BL.computeOptions = computeOptions;
  BL.previewOptions = function (run) { var m = BL.currentMatchDef(run); return m ? computeOptions(primary(run), m, { note: run.note, flow: false }) : []; };
  BL.previewOptionsFor = function (run, i) { var m = BL.currentMatchDef(run); return m ? computeOptions(playerView(run, i), m, { note: run.note, flow: false }) : []; };

  function newMatchState(mdef, note) {
    return { name: mdef.name, enemy: mdef.enemy, lead: mdef.lead, rule: mdef.rule, n: mdef.n, rate: mdef.rate, options: mdef.options || null, rival: mdef.rival || null, segId: mdef.segId || null,
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
    if (player.kind === 'final') return presentClimaxFinal(player, match);
    var mods = playerMods(player);
    var opts = computeOptions(player, match, { note: match.note, flow: false });
    var best = 0; for (var i = 0; i < opts.length; i++) if (opts[i].p > best) best = opts[i].p;
    var flow = false;
    if (best >= P.FLOW_LO * 100 && best <= P.FLOW_HI * 100) { if (rng() < P.FLOW_P + mods.flowP) flow = true; }
    if (flow) { opts = computeOptions(player, match, { note: match.note, flow: true }); match.flows += 1; }
    match.current = { options: opts, flow: flow, idx: match.idx };
  }
  /** 決戦：起用可能な各メンバーについて選択肢と FLOW を個別に判定する */
  function presentClimaxFinal(run, match) {
    var cap = usesCap(run); var entries = [];
    for (var i = 0; i < run.players.length; i++) {
      var p = run.players[i]; var avail = !p.injured && p.uses < cap; var v = playerView(run, i);
      var opts = computeOptions(v, match, { note: match.note, flow: false }); var best = 0; for (var j = 0; j < opts.length; j++) if (opts[j].p > best) best = opts[j].p;
      var flow = false;
      if (avail && best >= P.FLOW_LO * 100 && best <= P.FLOW_HI * 100) { if (rng() < P.FLOW_P + playerMods(v).flowP) flow = true; }
      if (flow) { opts = computeOptions(v, match, { note: match.note, flow: true }); match.flows += 1; }
      entries.push({ i: i, options: opts, flow: flow, avail: avail, uses: p.uses, cap: cap, hp: p.hp, injured: !!p.injured });
    }
    match.current = { options: null, flow: false, idx: match.idx, players: entries };
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
    var result = { idx: match.idx, key: optKey, name: opt.name, p: opt.pct, flow: cur.flow, success: success, skill: null, sig: null, cardId: player.cardId };
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

  BL.chooseClimax = function (state, optKey, playerIdx) {
    var run = state.run;
    if (!run || run.phase !== 'match' || !run.match || run.match.showResult) return null;
    var res;
    if (isFinal(run)) {
      var cur = run.match.current; var pi = parseInt(playerIdx, 10);
      var pe = cur && cur.players ? cur.players[pi] : null; if (!pe || !pe.avail) return null;
      cur.options = pe.options; cur.flow = pe.flow;
      var v = playerView(run, pi); run.players[pi].uses += 1;
      res = resolveClimax(v, run.match, optKey); if (!res) { run.players[pi].uses -= 1; return null; }
      writeBack(run, pi, v); res.playerIdx = pi; res.playerName = run.players[pi].name; syncFinal(run);
      pushLog(run, '【起用】' + run.players[pi].name + '（' + run.players[pi].uses + '/' + usesCap(run) + '）');
    } else {
      res = resolveClimax(run, run.match, optKey);
      if (!res) return null;
    }
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

  /** 圧倒度：その試合の最良選択肢の比率 r が 1 を超える分だけ入札額を上乗せ（r=3 で ×1.5 上限）。FLOW 帯（25〜40%）に入らないほど強い選手が年俸で不利にならないための補正 */
  function dominanceMult(run, m) {
    var best = 0;
    var views = isFinal(run) ? run.players.map(function (p, i) { return playerView(run, i); }) : [run];
    for (var v = 0; v < views.length; v++) { var opts = computeOptions(views[v], m, {}); for (var i = 0; i < opts.length; i++) if (opts[i].ratio > best) best = opts[i].ratio; }
    return 1 + P.BID_DOMINANCE * clamp(best - 1, 0, 2);
  }
  BL.dominanceMult = dominanceMult;
  function bidMultiplier(run) { var pl = primary(run); var agg = aggregateSkills(pl); var mods = playerMods(pl); return (1 + P.BID_SKILL_STEP * agg.count + agg.bid) * mods.bidMult; }
  BL.bidMultiplier = bidMultiplier;

  var RANK_PAR = [170, 700, 2500, 6000, 20000];
  function partRank(run) {
    var ratio = sumStats(run.stats) / RANK_PAR[Math.min(run.arc, RANK_PAR.length - 1)];
    for (var i = 0; i < D.PART_RANKS.length; i++) if (ratio >= D.PART_RANKS[i].r) return D.PART_RANKS[i].k;
    return 'D';
  }
  BL.partRank = partRank;
  function blRank(run) {
    var total = sumStats(run.stats); var par = RANK_PAR[Math.min(run.arc, RANK_PAR.length - 1)];
    return clamp(Math.round(300 * Math.pow(par / Math.max(1, total), 2)), 1, 300);
  }
  BL.blRank = blRank;

  /** 試合終了：報酬・編内累積・分岐／除籍の確定（この時点で保存されるためリロードで巻き戻らない） */
  function finishMatch(state) {
    var run = state.run; var m = run.match; var arc = arcOf(run);
    var pl = primary(run); var mods = playerMods(pl); var agg = aggregateSkills(pl);
    var goals = m.me;
    var bidGain = Math.round(goals * arc.bidPerGoal * bidMultiplier(run) * dominanceMult(run, m) * (m.wins === m.n && m.n > 1 ? P.MVP_BID_MULT : 1) * (m.flowSuccess > 0 ? P.FLOW_BID_MULT * mods.flowBidMult : 1));
    var cashGain = Math.round((goals * arc.cashPerGoal + (m.won ? arc.cashWin : 0)) * mods.cashMult * agg.cashMult);
    run.bid += bidGain; run.cash += cashGain;
    run.totals.goals += goals; run.totals.climaxWins += m.wins; run.totals.flows += m.flows; run.totals.matches += 1; bumpDaily(state, 'goals', goals); if (m.flows) bumpDaily(state, 'flows', m.flows);
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
    else if (rule === 'single' && m.won && /オニごっこ/.test(m.name)) unlock(state, 'pass_entry');
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

  function segAvailable(run, seg) {
    var c = seg.cond ? [].concat(seg.cond) : []; for (var i = 0; i < c.length; i++) if (!run.flags[c[i]]) return false;
    var sk = seg.skipIf ? [].concat(seg.skipIf) : []; for (var j = 0; j < sk.length; j++) if (run.flags[sk[j]]) return false;
    return true;
  }
  function startSegment(state, seg) {
    var run = state.run; var arc = arcOf(run);
    run.weeksLeft = seg.weeks; run.phase = 'training'; rollHot(run);
    pushLog(run, '【' + arc.title + '】' + seg.name + '——公式戦まで ' + seg.weeks + ' 週。');
    if (seg.weeks <= 0) beginMatch(state);
  }
  function enterSegment(state) {
    var run = state.run; var arc = arcOf(run);
    while (run.seg < arc.segments.length) {
      var seg = arc.segments[run.seg];
      if (!segAvailable(run, seg)) { run.seg += 1; continue; }
      if (seg.choice && !(run.choices && run.choices[seg.id] !== undefined)) { run.phase = 'storyChoice'; return; }
      startSegment(state, seg); return;
    }
    evaluateArc(state);
  }
  /* ------------------------------------------------------------ story choices */
  function applyChoiceFx(state, run, fx, seg, out) {
    if (!fx) return;
    var i;
    if (fx.ifFlag) { applyChoiceFx(state, run, run.flags[fx.ifFlag.flag] ? fx.ifFlag.then : fx.ifFlag.else, seg, out); }
    if (fx.flags) for (i = 0; i < fx.flags.length; i++) run.flags[fx.flags[i]] = true;
    var sf = run.storyFx;
    if (fx.opt) for (var k in fx.opt) { sf.opt[k] = (sf.opt[k] || 0) + fx.opt[k]; out.push('Option ' + k + ' +' + fx.opt[k] + '%'); }
    if (fx.favOpt) { var card = cardById(run.cardId); var fav = card ? charOf(card).fav : 'A'; sf.opt[fav] = (sf.opt[fav] || 0) + fx.favOpt; out.push('Option ' + fav + ' +' + fx.favOpt + '%'); }
    if (fx.all) { sf.all += fx.all; out.push('全選択肢 +' + fx.all + '%'); }
    if (fx.growth) for (var g in fx.growth) { sf.growth[g] += fx.growth[g]; out.push(g + ' 成長 +' + Math.round(fx.growth[g] * 100) + '%'); }
    if (fx.flowP) { sf.flowP += fx.flowP; out.push('FLOW 突入率 +' + Math.round(fx.flowP * 100) + '%'); }
    if (fx.hpCost) { sf.hpCost += fx.hpCost; out.push('練習HP消費 ' + (fx.hpCost > 0 ? '+' : '') + fx.hpCost); }
    if (fx.bidMult) { sf.bidMult *= fx.bidMult; out.push('年俸 ×' + fx.bidMult); }
    if (fx.rateMult) { var cur = run.segRate[seg.id]; run.segRate[seg.id] = (typeof cur === 'number' ? cur : 1) * fx.rateMult; out.push('敵レート ×' + fx.rateMult); }
    if (fx.rateMultKeys) { var o = run.segRate[seg.id]; if (typeof o !== 'object' || !o) o = { all: (typeof o === 'number' ? o : 1) }; for (var rk in fx.rateMultKeys) { o[rk] = (o[rk] || 1) * fx.rateMultKeys[rk]; out.push('Option ' + rk + ' レート ×' + fx.rateMultKeys[rk]); } run.segRate[seg.id] = o; }
    if (fx.nominateMult) { run.nominateMult = (run.nominateMult || 1) * fx.nominateMult; out.push('指名 INT ×' + fx.nominateMult); }
    if (fx.stat || fx.hp || fx.cond || fx.protein) { var tgt = { stat: fx.stat, hp: fx.hp, cond: fx.cond, protein: fx.protein }; var eff = applyFx(state, run, tgt, null); for (i = 0; i < eff.length; i++) out.push(eff[i]); }
    if (fx.cash) { run.cash = Math.max(0, run.cash + fx.cash); out.push('Cash ' + (fx.cash >= 0 ? '+' : '') + '¥' + fx.cash.toLocaleString()); }
    if (fx.ach) unlock(state, fx.ach);
  }
  BL.chooseStory = function (state, idx) {
    var run = state.run;
    if (!run || run.phase !== 'storyChoice') return { ok: false };
    var seg = arcOf(run).segments[run.seg]; var ch = seg && seg.choice; var opt = ch && ch.options[idx];
    if (!opt) return { ok: false, reason: 'option' };
    var res = { ok: true, title: ch.title, label: opt.label, text: opt.result || '', effects: [] };
    if (opt.fx && opt.fx.roll) {
      var win = rng() < opt.fx.roll.p; res.rollWin = win; res.text = win ? opt.fx.roll.winText : opt.fx.roll.loseText;
      applyChoiceFx(state, run, win ? opt.fx.roll.win : opt.fx.roll.lose, seg, res.effects);
      if (win) unlock(state, 'gamble_win');
    } else applyChoiceFx(state, run, opt.fx, seg, res.effects);
    run.choices[seg.id] = idx; run.choiceLog.push({ arc: run.arc, seg: seg.id, title: ch.title, label: opt.label });
    state.meta.records.choices = (state.meta.records.choices || 0) + 1; if (state.meta.records.choices >= 10) unlock(state, 'choices_10'); bumpDaily(state, 'choices', 1);
    pushLog(run, '【分岐】' + ch.title + ' → ' + opt.label + (res.effects.length ? '（' + res.effects.join(' / ') + '）' : ''));
    run.lastChoice = res;
    startSegment(state, seg);
    BL.save(state);
    return res;
  };
  BL.currentChoice = function (run) { if (!run || run.phase !== 'storyChoice') return null; var seg = arcOf(run).segments[run.seg]; return seg ? { seg: seg, choice: seg.choice } : null; };

  /* ------------------------------------------------------------ graduates */
  function gradById(state, id) { for (var i = 0; i < state.meta.grads.length; i++) if (state.meta.grads[i].id === id) return state.meta.grads[i]; return null; }
  BL.gradById = gradById;
  function removeGrad(state, id) { state.meta.grads = state.meta.grads.filter(function (g) { return g.id !== id; }); state.meta.squadPick = (state.meta.squadPick || []).filter(function (x) { return x !== id; }); }
  /** 編を生き残った選手を卒業生として保存（次の編の RUN に持ち越す） */
  function graduateRun(state, ev) {
    var run = state.run; var card = cardById(run.cardId); var arc = arcOf(run);
    var g = run.gradId ? gradById(state, run.gradId) : null;
    if (!g) { g = { id: uid('g'), cardId: run.cardId, charId: run.charId, createdAt: Date.now(), finals: 0, runs: 0, policies: [], totals: {}, history: [] }; state.meta.grads.push(g); state.meta.records.grads += 1; }
    g.part = run.arc + 1; g.name = BL.cardName(card); g.rar = card.rar;
    g.stats = clone(run.stats); g.skills = clone(run.skills); g.sig = run.sig || 0; g.lb = run.lb; g.tier = run.tier || 0;
    g.bid = run.bid; g.cash = run.cash; g.partRanks = (run.partRanks || []).slice(); g.rank = run.rank || 300;
    g.advisorId = run.advisorId; g.partnerId = run.partnerId || null; g.club = run.club || g.club || null;
    g.policies = (g.policies || []).concat([run.policy]); g.updatedAt = Date.now(); g.runs = (g.runs || 0) + 1;
    g.flags = clone(run.flags || {}); g.choiceLog = (run.choiceLog || []).slice(-30);
    for (var k in run.totals) if (run.totals.hasOwnProperty(k)) g.totals[k] = (g.totals[k] || 0) + run.totals[k];
    g.history = (g.history || []).concat(run.history); if (g.history.length > 40) g.history = g.history.slice(-40);
    ev.graduated = true; ev.gradId = g.id; ev.part = g.part;
    ev.pieces = Math.round(P.PIECES_GRAD * arc.n * diffOf(run).rewardMult); state.meta.pieces = (state.meta.pieces || 0) + ev.pieces; bumpDaily(state, 'grads', 1);
    if (run.difficulty === 'hell') unlock(state, 'hell_grad');
    addMastery(state, run.charId, P.MASTERY_XP_PART); ev.masteryLv = masteryLv(state, run.charId);
    unlock(state, 'grad_first');
    if (g.part >= LAST_ARC) unlock(state, 'grad_4');
    if (state.meta.grads.length >= P.FINAL_SQUAD) unlock(state, 'grads_5');
    run.gradId = g.id;
    pushLog(run, '【卒業】' + g.name + ' が' + arc.part + 'を卒業。次の編へ持ち越せる。');
  }
  BL.gradsForPart = function (state, arcIdx) { return state.meta.grads.filter(function (g) { return g.part === arcIdx; }); };

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
    var isLast = run.arc === LAST_ARC;
    var pr = partRank(run);
    run.partRanks = run.partRanks || []; run.partRanks[run.arc] = pr;
    if (pr === 'SS') unlock(state, 'part_ss');
    var ev = { arc: run.arc, title: arc.title, part: arc.part, checks: checks, survived: survived, isFinal: isLast, gems: 0, total: Math.round(total), bid: run.bid, wins: as.wins, goals: as.goals, rank: blRank(run), partRank: pr, pieces: 0 };
    if (survived) {
      ev.gems = P.GEMS_SURVIVE;
      if (isLast) {
        ev.gems += P.GEMS_CLEAR_BONUS; registerHof(state); state.meta.records.clears += 1; unlock(state, 'clear'); if (run.difficulty === 'hell') unlock(state, 'hell_clear');
        if (isFinal(run)) { unlock(state, 'squad_clear'); for (var p = 0; p < run.players.length; p++) { addMastery(state, run.players[p].charId, P.MASTERY_XP_FINAL); removeGrad(state, run.players[p].gradId); } }
      } else graduateRun(state, ev);
      ev.gems = Math.round(ev.gems * diffOf(run).rewardMult);
      state.meta.gems += ev.gems;
      if (run.arc > state.meta.records.bestArc) state.meta.records.bestArc = run.arc;
      var achMap = { first: 'pass_first', second: 'pass_second', third: 'pass_u20', nel: 'pass_nel' };
      if (achMap[arc.id]) unlock(state, achMap[arc.id]);
      pushLog(run, '【査定】' + arc.title + ' 生存。Ego Gems +' + ev.gems);
    } else {
      var mods = playerMods(primary(run));
      ev.gems = Math.max(100, Math.round(P.GEMS_ELIM_PER_ARC * arc.n * mods.elimGemMult));
      ev.pieces = P.PIECES_ELIM * arc.n; state.meta.pieces = (state.meta.pieces || 0) + ev.pieces;
      state.meta.gems += ev.gems; state.meta.records.eliminations += 1;
      if (state.meta.records.eliminations >= 10) unlock(state, 'elim_10');
      dropGradOnElim(state);
      pushLog(run, '【査定】' + arc.title + ' 足切り。除籍。補償ジェム +' + ev.gems);
    }
    run.evalResult = ev; run.phase = 'evaluation';
  }

  BL.advance = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'evaluation' || !run.evalResult) return { ok: false };
    var ev = run.evalResult;
    if (ev.survived) run.phase = ev.isFinal ? 'clear' : 'graduated';
    else {
      run.gameover = { reason: 'cutoff', detail: '足切り条件未達', gems: ev.gems, pieces: ev.pieces, arc: run.arc, total: Math.round(sumStats(run.stats)), skills: aggregateSkills(primary(run)).count, bid: run.bid };
      run.phase = 'gameover';
    }
    BL.save(state);
    return { ok: true, phase: run.phase };
  };

  BL.continueStory = function (state) {
    var run = state.run;
    if (!run || run.phase !== 'arcIntro') return { ok: false };
    if (!run.policy) { run.phase = 'policySelect'; BL.save(state); return { ok: true, phase: 'policySelect' }; }
    afterPolicy(state);
    BL.save(state);
    return { ok: true, phase: run.phase };
  };
  function afterPolicy(state) {
    var run = state.run; var arc = arcOf(run);
    if (arc.chooseClub && !run.club) { run.phase = 'clubSelect'; return; }
    enterSegment(state);
  }
  BL.choosePolicy = function (state, policyId) {
    var run = state.run;
    if (!run || run.phase !== 'policySelect') return { ok: false };
    if (!policyById(policyId)) return { ok: false, reason: 'policy' };
    run.policy = policyId;
    pushLog(run, '【育成方針】' + policyById(policyId).name + ' を選択。');
    afterPolicy(state);
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

  /** 除籍時の卒業生の扱い：編の RUN なら当該卒業生を抹消。決戦は設定により卒業生を保持（敗退回数を記録） */
  function dropGradOnElim(state) {
    var run = state.run;
    if (isFinal(run)) {
      state.meta.records.finals = state.meta.records.finals || 0;
      for (var i = 0; i < run.players.length; i++) { var g = gradById(state, run.players[i].gradId); if (!g) continue; if (P.FINAL_LOSS_KEEPS_GRADS) g.finals = (g.finals || 0) + 1; else removeGrad(state, g.id); }
      run.gradsKept = !!P.FINAL_LOSS_KEEPS_GRADS;
    } else if (run.gradId) { removeGrad(state, run.gradId); run.gradLost = true; }
  }
  function eliminate(state, reason, detail, deferred) {
    var run = state.run; var arc = arcOf(run); var mods = playerMods(primary(run));
    var gems = Math.max(100, Math.round(P.GEMS_ELIM_PER_ARC * arc.n * mods.elimGemMult));
    var pieces = P.PIECES_ELIM * arc.n;
    state.meta.gems += gems; state.meta.pieces = (state.meta.pieces || 0) + pieces; state.meta.records.eliminations += 1;
    if (state.meta.records.eliminations >= 10) unlock(state, 'elim_10');
    dropGradOnElim(state);
    run.gameover = { reason: reason, detail: detail, gems: gems, pieces: pieces, arc: run.arc, total: Math.round(sumStats(run.stats)), skills: aggregateSkills(primary(run)).count, bid: run.bid };
    if (!deferred) run.phase = 'gameover';
  }

  function hofEntryFrom(run, p) {
    var card = cardById(p.cardId);
    return { id: uid('hof'), cardId: p.cardId, charId: p.charId, name: BL.cardName(card), rar: card.rar, tier: p.tier || 0,
             advisorId: run.advisorId, club: p.club || run.club || null, stats: clone(p.stats), skills: clone(p.skills), sig: p.sig || 0, bid: (p.bid || 0) + (p === run ? 0 : run.bid),
             totals: clone(run.totals), clearedAt: Date.now(), wc: { status: 'none', stage: 0, wins: 0 }, squad: isFinal(run) ? run.players.map(function (x) { return x.name; }) : null };
  }
  function registerHof(state) {
    var run = state.run; run.hofIds = [];
    if (isFinal(run)) { for (var i = 0; i < run.players.length; i++) { var e = hofEntryFrom(run, run.players[i]); state.meta.hof.push(e); run.hofIds.push(e.id); } }
    else { var s = hofEntryFrom(run, run); s.bid = run.bid; state.meta.hof.push(s); run.hofIds.push(s.id); }
    run.hofId = run.hofIds[0];
  }

  function checkStatAch(state) {
    var run = state.run; var t = sumStats(run.stats);
    if (t >= 1000) unlock(state, 'stat_1000');
    if (t >= 10000) unlock(state, 'stat_10000');
    if (t > state.meta.records.bestTotal) state.meta.records.bestTotal = Math.round(t);
  }

  /** ゲームオーバー／クリア／卒業画面を閉じる（履歴記録・RUN 破棄） */
  BL.closeRun = function (state) {
    var run = state.run; if (!run) return;
    if (run.phase !== 'gameover' && run.phase !== 'clear' && run.phase !== 'graduated') return;
    var card = cardById(run.cardId);
    var label = isFinal(run) ? '決戦メンバー（' + run.players.map(function (p) { return charOf(cardById(p.cardId)).name; }).join('・') + '）' : BL.cardName(card);
    state.meta.history.unshift({ card: label, rar: card.rar, arc: run.arc, arcTitle: arcOf(run).title, cleared: run.phase === 'clear', graduated: run.phase === 'graduated', kind: run.kind,
      reason: run.gameover ? run.gameover.reason : (run.phase === 'clear' ? 'clear' : 'graduated'), total: Math.round(sumStats(run.stats)), bid: run.bid, rank: run.rank || 300, partRanks: (run.partRanks || []).slice(), at: Date.now(), runNo: run.runNo });
    if (state.meta.history.length > 20) state.meta.history.length = 20;
    state.run = null; BL.save(state);
  };

  /* ------------------------------------------------------------ lobby: RUN 開始 */
  function baseRun(state, adv, arcIdx) {
    return {
      kind: 'part', advisorId: adv.id, club: null, arc: arcIdx, seg: 0, weeksLeft: 0,
      hp: 100, cond: 'normal', policy: null, phase: 'arcIntro', protein: false, note: false, event: null, lastEventId: null,
      match: null, matchResult: null, evalResult: null, gameover: null, log: [], flags: {}, history: [],
      arcState: { matches: 0, wins: 0, losses: 0, goals: 0, finalWon: false }, rank: 300,
      totals: { goals: 0, climaxWins: 0, flows: 0, events: 0, purchases: 0, weeksTrained: 0, weeksRested: 0, matches: 0, matchWins: 0, pairEvents: 0 },
      upg: clone(state.meta.upgrades || {}), startedAt: Date.now(), runNo: state.meta.records.runs,
      difficulty: state.meta.difficulty || 'normal', choices: {}, choiceLog: [], storyFx: { opt: { A: 0, B: 0, C: 0, D: 0 }, all: 0, growth: { SHT: 0, SPD: 0, TEC: 0, INT: 0, PHY: 0 }, flowP: 0, hpCost: 0, bidMult: 1 }, segRate: {}, nominateMult: 1
    };
  }
  /** opts: { cardId } → 第一編を新規開始 ／ { gradId } → 卒業生で次の編を開始。partnerId は任意（相棒）。旧 API startRun(state, cardId, advisorId) も受け付ける */
  BL.startRun = function (state, opts, advisorId) {
    if (typeof opts === 'string') opts = { cardId: opts, advisorId: advisorId };
    opts = opts || {};
    if (state.run) return { ok: false, reason: 'active' };
    var adv = advisorById(opts.advisorId || 'ego');
    if (!adv || !BL.advisorUnlocked(state, adv)) return { ok: false, reason: 'advisor' };
    var grad = opts.gradId ? gradById(state, opts.gradId) : null;
    if (opts.gradId && !grad) return { ok: false, reason: 'nograd' };
    if (grad && grad.part >= LAST_ARC) return { ok: false, reason: 'final' };
    var cardId = grad ? grad.cardId : opts.cardId; var card = cardById(cardId); var owned = state.meta.roster[cardId];
    if (!card || !owned) return { ok: false, reason: 'notowned' };
    var partner = null; var pown = null;
    if (opts.partnerId) {
      partner = cardById(opts.partnerId); pown = state.meta.roster[opts.partnerId];
      if (!partner || !pown) return { ok: false, reason: 'partner' };
      if (partner.char === card.char) return { ok: false, reason: 'partnerSame' };
    }
    var mlv = masteryLv(state, card.char); var ufx = upgradeFx(state.meta.upgrades);
    var prof = cardProfile(card, { dupes: owned.dupes, tier: owned.tier, masteryLv: mlv, baseStat: ufx.baseStat });
    var arcIdx = grad ? grad.part : 0;
    state.meta.records.runs += 1;
    var run = baseRun(state, adv, arcIdx);
    run.cardId = cardId; run.charId = card.char; run.gradId = grad ? grad.id : null;
    run.stats = grad ? clone(grad.stats) : prof.stats; run.growth = prof.growth; run.lb = owned.dupes || 0; run.tier = owned.tier || 0; run.masteryLv = mlv;
    run.skills = grad ? clone(grad.skills) : {}; run.sig = grad ? (grad.sig || 0) : 0; run.partRanks = grad ? (grad.partRanks || []).slice() : [];
    run.bid = grad ? (grad.bid || 0) : 0; run.cash = grad ? (grad.cash || 0) : 0;
    run.partnerId = partner ? partner.id : null; run.partnerChar = partner ? partner.char : null; run.partnerTier = pown ? (pown.tier || 0) : 0;
    if (grad) { run.flags = clone(grad.flags || {}); run.choiceLog = (grad.choiceLog || []).slice(); }
    state.run = run; state.meta.records.runs = state.meta.records.runs; run.runNo = state.meta.records.runs;
    var chem = partner ? chemistryFor(card.char, partner, run.partnerTier) : null;
    pushLog(run, BL.cardName(card) + (grad ? '（' + ARCS[arcIdx - 1].part + ' 卒業）' : '') + ' の育成を開始（アドバイザー：' + adv.name + (partner ? ' ／ 相棒：' + BL.cardName(partner) + (chem && chem.pair ? '＝化学反応「' + chem.name + '」' : '') : '') + '）。');
    unlock(state, 'first_run');
    if (state.meta.records.runs >= 10) unlock(state, 'runs_10');
    BL.save(state);
    return { ok: true, arc: arcIdx };
  };
  /** 決戦：第四編を卒業した 5 人で U-20 W杯へ */
  BL.startFinal = function (state, gradIds, advisorId) {
    if (state.run) return { ok: false, reason: 'active' };
    gradIds = (gradIds || []).slice();
    if (gradIds.length !== P.FINAL_SQUAD) return { ok: false, reason: 'count' };
    var seen = {}; for (var i = 0; i < gradIds.length; i++) { if (seen[gradIds[i]]) return { ok: false, reason: 'dup' }; seen[gradIds[i]] = true; }
    var adv = advisorById(advisorId || 'ego');
    if (!adv || !BL.advisorUnlocked(state, adv)) return { ok: false, reason: 'advisor' };
    var ufx = upgradeFx(state.meta.upgrades); var players = [];
    for (var j = 0; j < gradIds.length; j++) {
      var g = gradById(state, gradIds[j]); if (!g) return { ok: false, reason: 'nograd' };
      if (g.part !== LAST_ARC) return { ok: false, reason: 'part' };
      var card = cardById(g.cardId); var own = state.meta.roster[g.cardId] || { dupes: 0, tier: 0 }; var mlv = masteryLv(state, card.char);
      var prof = cardProfile(card, { dupes: own.dupes, tier: own.tier, masteryLv: mlv, baseStat: ufx.baseStat });
      players.push({ gradId: g.id, cardId: g.cardId, charId: g.charId, name: g.name, rar: card.rar, tier: own.tier || 0, stats: clone(g.stats), growth: prof.growth, skills: clone(g.skills), sig: g.sig || 0,
                     lb: own.dupes || 0, hp: 100, cond: 'normal', uses: 0, injured: false, masteryLv: mlv, club: g.club || null, bid: g.bid || 0, partRanks: (g.partRanks || []).slice() });
    }
    state.meta.records.runs += 1; state.meta.records.finals = (state.meta.records.finals || 0) + 1;
    var run = baseRun(state, adv, LAST_ARC);
    run.kind = 'final'; run.players = players; run.gradId = null; run.partnerId = null; run.partnerChar = null;
    run.lb = 0; run.tier = 0; run.masteryLv = 0; run.bid = 0; run.cash = players.reduce(function (a, p) { return a + (gradById(state, p.gradId).cash || 0); }, 0);
    run.partRanks = []; run.stats = {}; run.skills = {}; run.sig = 0; run.growth = players[0].growth; run.runNo = state.meta.records.runs;
    state.run = run; syncFinal(run);
    pushLog(run, '決戦メンバー：' + players.map(function (p) { return p.name; }).join(' / ') + '（アドバイザー：' + adv.name + '）。');
    unlock(state, 'five_parts'); unlock(state, 'final_first');
    state.meta.squadPick = [];
    BL.save(state);
    return { ok: true };
  };
  BL.toggleSquadPick = function (state, gradId) {
    var g = gradById(state, gradId); if (!g || g.part !== LAST_ARC) return { ok: false, reason: 'part' };
    var pick = state.meta.squadPick = (state.meta.squadPick || []).filter(function (id) { return gradById(state, id); });
    var i = pick.indexOf(gradId);
    if (i >= 0) pick.splice(i, 1); else { if (pick.length >= P.FINAL_SQUAD) return { ok: false, reason: 'full' }; pick.push(gradId); }
    BL.save(state); return { ok: true, picked: i < 0, n: pick.length };
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
      var piecesGain = 0;
      if (isNew) state.meta.roster[card.id] = { dupes: 0, tier: 0, obtainedAt: Date.now() }; else { entry.dupes += 1; piecesGain = D.PIECES.gain[card.rar] || 0; state.meta.pieces = (state.meta.pieces || 0) + piecesGain; }
      if (state.meta.roster[card.id].dupes >= 10) unlock(state, 'lb_10');
      results.push({ id: card.id, name: BL.cardName(card), rar: rar, flow: !!card.flow, isNew: isNew, dupes: state.meta.roster[card.id].dupes, type: card.type, pieces: piecesGain });
    }
    state.meta.records.gachaPulls += n; bumpDaily(state, 'scouts', 1);
    if (state.meta.records.gachaPulls >= 50) unlock(state, 'gacha_50');
    if (Object.keys(state.meta.roster).length >= 50) unlock(state, 'collect_50');
    BL.save(state);
    return { ok: true, results: results, cost: cost };
  };

  /** エゴ・ピース交換：任意のカードをピースで獲得（未所持なら新規、所持済みなら限界突破） */
  BL.exchange = function (state, cardId) {
    var card = cardById(cardId); if (!card) return { ok: false, reason: 'card' };
    var cost = D.PIECES.cost[card.rar];
    if ((state.meta.pieces || 0) < cost) return { ok: false, reason: 'pieces' };
    state.meta.pieces -= cost;
    var entry = state.meta.roster[cardId]; var isNew = !entry;
    if (isNew) state.meta.roster[cardId] = { dupes: 0, tier: 0, obtainedAt: Date.now() }; else entry.dupes += 1;
    unlock(state, 'exchange_1');
    if (Object.keys(state.meta.roster).length >= 50) unlock(state, 'collect_50');
    BL.save(state);
    return { ok: true, isNew: isNew, dupes: state.meta.roster[cardId].dupes, cost: cost };
  };
  /** おまかせ練習：次の試合の最良選択肢に対応する属性のうち、主獲得量が大きい方を選ぶ */
  BL.recommendStat = function (run) {
    var opts = BL.previewOptions(run); if (!opts.length) return 'SHT';
    var best = opts[0]; for (var i = 0; i < opts.length; i++) if (opts[i].ratio > best.ratio) best = opts[i];
    var g0 = BL.previewGain(run, best.stats[0])[best.stats[0]], g1 = BL.previewGain(run, best.stats[1])[best.stats[1]];
    return g0 >= g1 ? best.stats[0] : best.stats[1];
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
  /** セーブのエクスポート／インポート（JSON 文字列。インポートは検証・移行のうえ上書き保存し、新しい state を返す） */
  BL.exportSave = function (state) { return JSON.stringify(state); };
  BL.importSave = function (json) {
    var st; try { st = JSON.parse(json); } catch (e) { return { ok: false, reason: 'parse' }; }
    if (!st || typeof st !== 'object' || !st.meta || !st.meta.roster) return { ok: false, reason: 'format' };
    if (st.v !== SAVE_VERSION) st = migrate(st);
    var fresh = newState().meta;
    for (var k in fresh) if (fresh.hasOwnProperty(k) && st.meta[k] === undefined) st.meta[k] = fresh[k];
    for (var r in fresh.records) if (st.meta.records[r] === undefined) st.meta.records[r] = fresh.records[r];
    BL.save(st); return { ok: true, state: st };
  };
  BL.exportPortraits = function (state) { return JSON.stringify({ portraits: state.meta.portraits || {} }); };
  BL.importPortraits = function (state, json) {
    var o; try { o = JSON.parse(json); } catch (e) { return { ok: false, reason: 'parse' }; }
    var src = (o && o.portraits) || o; if (!src || typeof src !== 'object') return { ok: false, reason: 'format' };
    var n = 0; for (var id in src) { if (!D.CHARACTERS[id] || typeof src[id] !== 'string' || src[id].indexOf('data:image/') !== 0) continue; var r = BL.setPortrait(state, id, src[id]); if (r.ok) n++; }
    return { ok: true, count: n };
  };
  BL.toggleSfx = function (state) { state.meta.sfx = !state.meta.sfx; BL.save(state); return state.meta.sfx; };
  /** 利用者が権利を持つ画像をキャラのポートレートとして端末内に保存（data URL、上限 60KB／枚・合計 3MB） */
  BL.setPortrait = function (state, charId, dataUrl) {
    if (!D.CHARACTERS[charId]) return { ok: false, reason: 'char' };
    if (!dataUrl) { delete state.meta.portraits[charId]; BL.save(state); return { ok: true, removed: true }; }
    if (dataUrl.length > 60 * 1024) return { ok: false, reason: 'size' };
    var total = 0; for (var k in state.meta.portraits) total += state.meta.portraits[k].length;
    if (total + dataUrl.length > 3 * 1024 * 1024) return { ok: false, reason: 'quota' };
    state.meta.portraits[charId] = dataUrl; BL.save(state); return { ok: true };
  };
  /** RUN サマリー（共有用テキスト） */
  BL.runSummary = function (run) {
    var card = cardById(run.cardId); var arc = arcOf(run); var s = run.stats;
    var who = isFinal(run) ? '決戦メンバー ' + run.players.map(function (p) { return charOf(cardById(p.cardId)).name; }).join('・') : D.RARITY[card.rar].label + ' ' + BL.cardName(card) + (run.lb ? ' +' + run.lb : '');
    var res = run.phase === 'clear' ? '世界一（殿堂入り）' : run.phase === 'graduated' ? arc.part + '「' + arc.title + '」を卒業' : arc.part + '「' + arc.title + '」で除籍' + (run.gameover ? '（' + run.gameover.detail + '）' : '');
    var wl = run.history.map(function (h) { return (h.won ? '○' : '●') + h.me + '-' + h.en; }).join(' ');
    return '#ブルーロックPWC改変版 ' + who + ' / ' + res +
      '\n合計 ' + Math.round(sumStats(s)) + '（SHT ' + Math.round(s.SHT) + ' SPD ' + Math.round(s.SPD) + ' TEC ' + Math.round(s.TEC) + ' INT ' + Math.round(s.INT) + ' PHY ' + Math.round(s.PHY) + '）' +
      ' / スキル ' + aggregateSkills(primary(run)).count + ' / 年俸 ' + BL.fmtYen(run.bid) + ' / BLランキング ' + (run.rank || 300) + '位\n戦績 ' + wl;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
