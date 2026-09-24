/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  static game data
 * 本ファイルはブラウザ(classic script)とNode(バランス検証)の両方で読めるよう
 * globalThis.BL 名前空間に定義する。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};

  /* ------------------------------------------------------------------ 定数 */
  var STATS = ['SHT', 'SPD', 'TEC', 'INT', 'PHY'];
  var STAT_META = {
    SHT: { en: 'SHOOT',        jp: '決定力',  color: '#ff4d4d', desc: 'シュート球速・枠内へねじ込む絶対的な得点力' },
    SPD: { en: 'SPEED',        jp: '俊敏性',  color: '#4dd2ff', desc: 'スプリント加速・初速・DFラインの裏へ抜ける俊敏性' },
    TEC: { en: 'TECHNIQUE',    jp: '技術',    color: '#7cff6b', desc: 'トラップ精度・キープ・プレースキックの弾道計算' },
    INT: { en: 'INTELLIGENCE', jp: '戦術眼',  color: '#c58bff', desc: '戦術理解・空間認識・死角の発見・選択肢の拡張' },
    PHY: { en: 'PHYSICAL',     jp: '肉体',    color: '#ffb84d', desc: '体幹・空中戦と競り合いへの耐性・疲労耐性' }
  };

  /* 排出率 (%) : 合計 100.0 */
  var RARITY = {
    8: { rate: 0.2,  label: '世界最強',           color: '#ff2d55', glow: '#ff2d55' },
    7: { rate: 0.8,  label: 'マスター・世界選抜', color: '#ffd166', glow: '#ffd166' },
    6: { rate: 2.0,  label: '新世代世界11傑',     color: '#f78c1c', glow: '#f78c1c' },
    5: { rate: 5.0,  label: '青い監獄 最上位',    color: '#c58bff', glow: '#c58bff' },
    4: { rate: 12.0, label: '青い監獄 主力選抜',  color: '#4da3ff', glow: '#4da3ff' },
    3: { rate: 25.0, label: '覚醒の主軸',         color: '#3ddc84', glow: '#3ddc84' },
    2: { rate: 30.0, label: '発展途上の原石',     color: '#9aa4b2', glow: '#9aa4b2' },
    1: { rate: 25.0, label: '最底辺・生存縛り',   color: '#6b7280', glow: '#6b7280' }
  };

  /* ------------------------------------------------------------ キャラクター
   * base    : 5大初期ステータス
   * growth  : 成長補正倍率（練習獲得量に乗算）
   * passive : 固有エゴ（効果は engine 側で参照）
   *   opt   : 各選択肢の成功率に加算 (%)
   *   all   : 全選択肢の成功率に加算 (%)
   *   flowP : FLOW 突入率への加算
   *   injuryP: 故障率への加算（負数で軽減）
   *   hpCost: 練習HP消費への加算（負数で軽減）
   *   cashMult / bidMult : 報酬倍率
   *   thMult: スキル覚醒閾値倍率（<1 で覚醒しやすい）
   *   eventRate: 突発イベント率への加算
   */
  var CHARACTERS = [
    /* ★8 ---------------------------------------------------------------- */
    { id: 'noa', name: 'ノエル・ノア', rarity: 8, tag: '世界最高のストライカー',
      base: { SHT: 120, SPD: 105, TEC: 115, INT: 110, PHY: 110 },
      growth: { SHT: 1.65, SPD: 1.6, TEC: 1.65, INT: 1.6, PHY: 1.65 },
      passive: { name: '完全無欠', desc: '全選択肢の成功率+5%。練習HP消費-2。', all: 5, hpCost: -2 } },
    { id: 'ego_if', name: '絵心甚八（現役if）', rarity: 8, tag: 'エゴイストの設計者',
      base: { SHT: 110, SPD: 100, TEC: 105, INT: 125, PHY: 100 },
      growth: { SHT: 1.55, SPD: 1.5, TEC: 1.55, INT: 1.66, PHY: 1.5 },
      passive: { name: '設計者の眼', desc: 'スキル覚醒閾値×0.9。Option D +4%。', thMult: 0.9, opt: { D: 4 } } },
    /* ★7 ---------------------------------------------------------------- */
    { id: 'loki', name: 'ジュリアン・ロキ', rarity: 7, tag: '世界最速',
      base: { SHT: 90, SPD: 112, TEC: 95, INT: 88, PHY: 85 },
      growth: { SHT: 1.4, SPD: 1.7, TEC: 1.4, INT: 1.35, PHY: 1.35 },
      passive: { name: 'マッハスピード', desc: 'Option C 成功率+8%。', opt: { C: 8 } } },
    { id: 'snuffy', name: 'マルク・スナッフィー', rarity: 7, tag: 'マスター',
      base: { SHT: 95, SPD: 80, TEC: 100, INT: 106, PHY: 90 },
      growth: { SHT: 1.4, SPD: 1.3, TEC: 1.55, INT: 1.6, PHY: 1.4 },
      passive: { name: 'マスターの戦術眼', desc: 'Option B +6%。年俸査定×1.10。', opt: { B: 6 }, bidMult: 1.10 } },
    /* ★6 ---------------------------------------------------------------- */
    { id: 'kaiser', name: 'ミヒャエル・カイザー', rarity: 6, tag: '皇帝',
      base: { SHT: 96, SPD: 78, TEC: 82, INT: 80, PHY: 72 },
      growth: { SHT: 1.55, SPD: 1.25, TEC: 1.3, INT: 1.3, PHY: 1.2 },
      passive: { name: 'カイザーインパクト', desc: 'Option A 成功率+7%。', opt: { A: 7 } } },
    { id: 'sae', name: '糸師冴', rarity: 6, tag: '世界最高峰のMF',
      base: { SHT: 70, SPD: 72, TEC: 100, INT: 92, PHY: 65 },
      growth: { SHT: 1.2, SPD: 1.2, TEC: 1.58, INT: 1.42, PHY: 1.15 },
      passive: { name: '絶対的ボールホルダー', desc: 'Option B 成功率+7%。', opt: { B: 7 } } },
    /* ★5 ---------------------------------------------------------------- */
    { id: 'rin', name: '糸師凛', rarity: 5, tag: '青い監獄 最強',
      base: { SHT: 76, SPD: 62, TEC: 68, INT: 70, PHY: 58 },
      growth: { SHT: 1.48, SPD: 1.2, TEC: 1.25, INT: 1.4, PHY: 1.18 },
      passive: { name: 'フェイントの化身', desc: '全選択肢+2%、Option A +3%。', all: 2, opt: { A: 3 } } },
    { id: 'shidou', name: '士道龍聖', rarity: 5, tag: '破滅の悦楽',
      base: { SHT: 82, SPD: 66, TEC: 58, INT: 48, PHY: 70 },
      growth: { SHT: 1.45, SPD: 1.2, TEC: 1.1, INT: 1.0, PHY: 1.35 },
      passive: { name: '破滅の悦楽', desc: 'Option A +7%。ただし練習HP消費+1。', opt: { A: 7 }, hpCost: 1 } },
    /* ★4 ---------------------------------------------------------------- */
    { id: 'nagi', name: '凪誠士郎', rarity: 4, tag: '天才',
      base: { SHT: 58, SPD: 45, TEC: 70, INT: 52, PHY: 44 },
      growth: { SHT: 1.15, SPD: 1.05, TEC: 1.35, INT: 1.22, PHY: 1.0 },
      passive: { name: '天才のトラップ', desc: 'Option B 成功率+5%。', opt: { B: 5 } } },
    { id: 'barou', name: '馬狼照英', rarity: 4, tag: '王様',
      base: { SHT: 62, SPD: 52, TEC: 48, INT: 40, PHY: 64 },
      growth: { SHT: 1.25, SPD: 1.1, TEC: 1.05, INT: 1.0, PHY: 1.3 },
      passive: { name: '王様', desc: 'Option A 成功率+5%。', opt: { A: 5 } } },
    /* ★3 ---------------------------------------------------------------- */
    { id: 'bachira', name: '蜂楽廻', rarity: 3, tag: '怪物',
      base: { SHT: 42, SPD: 44, TEC: 54, INT: 40, PHY: 36 },
      growth: { SHT: 1.02, SPD: 1.05, TEC: 1.2, INT: 1.05, PHY: 1.0 },
      passive: { name: '中の怪物', desc: 'Option B +3%。突発イベント率+5%。', opt: { B: 3 }, eventRate: 0.05 } },
    { id: 'chigiri', name: '千切豹馬', rarity: 3, tag: '神速',
      base: { SHT: 40, SPD: 60, TEC: 40, INT: 38, PHY: 32 },
      growth: { SHT: 1.02, SPD: 1.25, TEC: 1.02, INT: 1.02, PHY: 0.95 },
      passive: { name: '神速', desc: 'Option C 成功率+5%。', opt: { C: 5 } } },
    /* ★2 ---------------------------------------------------------------- */
    { id: 'kunigami_early', name: '國神錬介（初期）', rarity: 2, tag: 'ヒーロー志願',
      base: { SHT: 38, SPD: 32, TEC: 30, INT: 30, PHY: 42 },
      growth: { SHT: 1.02, SPD: 0.95, TEC: 0.95, INT: 0.95, PHY: 1.1 },
      passive: { name: 'ヒーロー志願', desc: 'Option A 成功率+2%。', opt: { A: 2 } } },
    { id: 'bachira_raw', name: '蜂楽廻（原石）', rarity: 2, tag: '原石',
      base: { SHT: 32, SPD: 35, TEC: 43, INT: 32, PHY: 30 },
      growth: { SHT: 0.95, SPD: 1.0, TEC: 1.1, INT: 1.0, PHY: 0.95 },
      passive: { name: '怪物の萌芽', desc: 'Option B 成功率+2%。', opt: { B: 2 } } },
    { id: 'raichi', name: '雷市陣吾', rarity: 2, tag: '気迫',
      base: { SHT: 34, SPD: 33, TEC: 30, INT: 28, PHY: 41 },
      growth: { SHT: 1.0, SPD: 0.98, TEC: 0.95, INT: 0.95, PHY: 1.08 },
      passive: { name: '気迫', desc: '練習HP消費-1。', hpCost: -1 } },
    { id: 'gagamaru', name: '我牙丸吟', rarity: 2, tag: '野生',
      base: { SHT: 30, SPD: 37, TEC: 32, INT: 30, PHY: 39 },
      growth: { SHT: 0.95, SPD: 1.05, TEC: 0.98, INT: 0.95, PHY: 1.05 },
      passive: { name: '野生の反射', desc: 'FLOW 突入率+5%。', flowP: 0.05 } },
    /* ★1 ---------------------------------------------------------------- */
    { id: 'isagi_early', name: '潔世一（初期）', rarity: 1, tag: '無名のFW',
      base: { SHT: 26, SPD: 24, TEC: 25, INT: 30, PHY: 22 },
      growth: { SHT: 0.9, SPD: 0.88, TEC: 0.9, INT: 1.0, PHY: 0.88 },
      passive: { name: '覚醒の兆し', desc: 'FLOW 突入率+10%。', flowP: 0.10 } },
    { id: 'igarashi', name: '五十嵐栗夢', rarity: 1, tag: '生存本能',
      base: { SHT: 24, SPD: 26, TEC: 24, INT: 20, PHY: 24 },
      growth: { SHT: 0.88, SPD: 0.9, TEC: 0.88, INT: 0.85, PHY: 0.9 },
      passive: { name: '生存本能', desc: '危険水域での故障率 40%→30%。', injuryP: -0.10 } },
    { id: 'naruhaya', name: '成早朝日', rarity: 1, tag: '執念',
      base: { SHT: 25, SPD: 28, TEC: 23, INT: 22, PHY: 22 },
      growth: { SHT: 0.88, SPD: 0.95, TEC: 0.87, INT: 0.87, PHY: 0.88 },
      passive: { name: '大金への執念', desc: 'Cash 報酬×1.3。', cashMult: 1.3 } }
  ];

  /* ------------------------------------------------------------------ スキル
   * family : 対応ステータス。th : 覚醒閾値（該当ステータス値）
   * fx.opt : 選択肢別 成功率加算(%) / fx.all : 全選択肢加算 / fx.bid : 年俸倍率加算
   * fx.hpCost : 練習HP消費加算 / fx.unlockD : Option D 解放
   * 所持数に上限は無く、同一スキルは Lv として重複スタックし効果も加算される。
   */
  var SKILLS = [
    { id: 'sh1', family: 'SHT', tier: 1, name: 'ダイレクトボレー',     th: 60,   desc: 'Option A +3%',                    fx: { opt: { A: 3 } } },
    { id: 'sh2', family: 'SHT', tier: 2, name: '二丁拳銃ボレー',       th: 150,  desc: 'Option A +5%（敵GK無力化）',       fx: { opt: { A: 5 } } },
    { id: 'sh3', family: 'SHT', tier: 3, name: '逆足キャノン',         th: 400,  desc: 'Option A +7%',                    fx: { opt: { A: 7 } } },
    { id: 'sh4', family: 'SHT', tier: 4, name: '皇帝の一撃',           th: 1000, desc: 'Option A +10%',                   fx: { opt: { A: 10 } } },
    { id: 'sh5', family: 'SHT', tier: 5, name: '世界一のフィニッシュ', th: 2500, desc: 'Option A +14%',                   fx: { opt: { A: 14 } } },

    { id: 'sp1', family: 'SPD', tier: 1, name: '神速カウンター',       th: 60,   desc: 'Option C +3% / 年俸×+5%',          fx: { opt: { C: 3 }, bid: 0.05 } },
    { id: 'sp2', family: 'SPD', tier: 2, name: 'マッハカットイン',     th: 150,  desc: 'Option C +5% / 年俸×+8%',          fx: { opt: { C: 5 }, bid: 0.08 } },
    { id: 'sp3', family: 'SPD', tier: 3, name: '裏抜けスピードスター', th: 400,  desc: 'Option C +7% / 年俸×+10%',         fx: { opt: { C: 7 }, bid: 0.10 } },
    { id: 'sp4', family: 'SPD', tier: 4, name: '光速ブレイクスルー',   th: 1000, desc: 'Option C +10% / 年俸×+15%',        fx: { opt: { C: 10 }, bid: 0.15 } },
    { id: 'sp5', family: 'SPD', tier: 5, name: '音速のカタルシス',     th: 2500, desc: 'Option C +14% / 年俸×+20%',        fx: { opt: { C: 14 }, bid: 0.20 } },

    { id: 'te1', family: 'TEC', tier: 1, name: '怪物ドリブル',         th: 60,   desc: 'Option B +3%',                    fx: { opt: { B: 3 } } },
    { id: 'te2', family: 'TEC', tier: 2, name: 'ブラックホールトラップ', th: 150, desc: 'Option B +5% / 全選択肢+1%',       fx: { opt: { B: 5 }, all: 1 } },
    { id: 'te3', family: 'TEC', tier: 3, name: 'マジックトラップ',     th: 400,  desc: 'Option B +7% / 全選択肢+2%',       fx: { opt: { B: 7 }, all: 2 } },
    { id: 'te4', family: 'TEC', tier: 4, name: '絶対支配のキープ',     th: 1000, desc: 'Option B +10% / 全選択肢+3%',      fx: { opt: { B: 10 }, all: 3 } },
    { id: 'te5', family: 'TEC', tier: 5, name: '世界を欺く技術',       th: 2500, desc: 'Option B +14% / 全選択肢+4%',      fx: { opt: { B: 14 }, all: 4 } },

    { id: 'in1', family: 'INT', tier: 1, name: '空間認識',             th: 60,   desc: '全選択肢+2%',                     fx: { all: 2 } },
    { id: 'in2', family: 'INT', tier: 2, name: 'メタビジョン',         th: 150,  desc: 'Option D（メタビジョン）解放 / 全+2%', fx: { all: 2, unlockD: true } },
    { id: 'in3', family: 'INT', tier: 3, name: '空間破壊',             th: 400,  desc: 'Option D +8% / 全+3%',            fx: { opt: { D: 8 }, all: 3, unlockD: true } },
    { id: 'in4', family: 'INT', tier: 4, name: '超メタビジョン',       th: 1000, desc: 'Option D +12% / 全+4%',           fx: { opt: { D: 12 }, all: 4, unlockD: true } },
    { id: 'in5', family: 'INT', tier: 5, name: '未来視',               th: 2500, desc: 'Option D +16% / 全+5%',           fx: { opt: { D: 16 }, all: 5, unlockD: true } },

    { id: 'ph1', family: 'PHY', tier: 1, name: '絶対ポストプレイ',     th: 60,   desc: 'Option A +3% / 練習HP消費-1',      fx: { opt: { A: 3 }, hpCost: -1 } },
    { id: 'ph2', family: 'PHY', tier: 2, name: 'ぶちかまし',           th: 150,  desc: 'Option A +4% / 練習HP消費-1',      fx: { opt: { A: 4 }, hpCost: -1 } },
    { id: 'ph3', family: 'PHY', tier: 3, name: '破滅ストライク',       th: 400,  desc: 'Option A +6% / 練習HP消費-2',      fx: { opt: { A: 6 }, hpCost: -2 } },
    { id: 'ph4', family: 'PHY', tier: 4, name: '鋼の体幹',             th: 1000, desc: 'Option A +8% / 練習HP消費-2',      fx: { opt: { A: 8 }, hpCost: -2 } },
    { id: 'ph5', family: 'PHY', tier: 5, name: '守備ブロック粉砕',     th: 2500, desc: 'Option A +12% / 練習HP消費-3',     fx: { opt: { A: 12 }, hpCost: -3 } }
  ];

  var FAMILY_JP = { SHT: 'シュート系', SPD: 'スピード系', TEC: 'テクニック系', INT: 'インテリジェンス系', PHY: 'フィジカル系' };

  /* ------------------------------------------------------------ 選択肢定義 */
  var OPTIONS = {
    A: { key: 'A', name: '強引なフィジカル・フィニッシュ', stats: ['SHT', 'PHY'], color: '#ff4d4d',
         flavor: 'DFを背負ったまま体を捻じ込み、力づくでゴールをこじ開ける。' },
    B: { key: 'B', name: '戦術的な崩しとインサイド突破', stats: ['INT', 'TEC'], color: '#7cff6b',
         flavor: '味方を囮に使い、DFの重心をずらしてインサイドを切り裂く。' },
    C: { key: 'C', name: '超速の裏抜けとスプリント', stats: ['SPD', 'INT'], color: '#4dd2ff',
         flavor: 'DFラインの一瞬の隙を読み、誰よりも速く裏へ抜け出す。' },
    D: { key: 'D', name: 'メタビジョン', stats: ['INT', 'TEC'], color: '#c58bff',
         flavor: 'フィールド全体を俯瞰し、存在しなかった「勝ち筋」を創り出す。' }
  };

  /* ------------------------------------------------------------------ 章
   * envMult  : 環境倍率（練習獲得量）
   * statReq  : 合計ステータス足切り (0 = 無し)
   * goalReq  : 必要ゴール数 / winReq : 必要 Climax 成功数（試合勝利も要求）
   * bidReq   : 年俸足切り (円)
   * rate     : 敵レート（選択肢ごと、2ステータス合計との比率で判定）
   */
  var CHAPTERS = [
    { n: 1, title: '一次選考', sub: '青い監獄 一次選考 — チームZ vs チームV', weeks: 10, envMult: 1.0,
      statReq: 240, goalReq: 1, winReq: 0, bidReq: 0,
      enemy: { name: 'チームV', lead: '凪誠士郎 / 馬狼照英 / 御影玲王', rate: { A: 175, B: 175, C: 170, D: 162 } },
      bidPerGoal: 5e6, cashPerGoal: 30000, cashWin: 30000,
      intro: '青い監獄一次選考、最終戦。勝てば生き残り、負ければ即ち終わり。',
      highlights: [
        '前半20分。蜂楽のドリブルが敵陣を切り裂き、こぼれ球がお前の足元へ転がる——。',
        '後半開始直後。凪の神トラップから馬狼が得点、流れは敵にある。だが千切の裏抜けで生まれた一瞬の空白——。',
        'ラスト5分。誰もがゴールを求めて走る。パスの選択肢は無限、しかし決めるのはお前だ——。'
      ] },
    { n: 2, title: '二次選考', sub: '青い監獄 二次選考 — 3rdステージ vs 糸師凛', weeks: 10, envMult: 2.5,
      statReq: 650, goalReq: 0, winReq: 2, bidReq: 0,
      enemy: { name: '糸師凛チーム', lead: '糸師凛 / 蟻生十兵衛 / 時光青志', rate: { A: 600, B: 590, C: 580, D: 550 } },
      bidPerGoal: 1.5e7, cashPerGoal: 60000, cashWin: 60000,
      intro: '二次選考3rdステージ。青い監獄最強・糸師凛の前に立つ。',
      highlights: [
        '開始3分。凛の冷徹なゲームメイクにチームが飲まれる。だが凛のマークが一瞬外れた——。',
        '前半終了間際。蟻生の高さに競り負け失点。その直後、蜂楽の怪物ドリブルからボールが渡る——。',
        '残り1分。凛が「消えろ」と呟く。世界へ繋がる最後のシュートチャンス——。'
      ] },
    { n: 3, title: 'U-20日本代表戦', sub: '青い監獄 vs U-20日本代表 — 糸師冴', weeks: 8, envMult: 6,
      statReq: 1750, goalReq: 0, winReq: 2, bidReq: 0,
      enemy: { name: 'U-20日本代表', lead: '糸師冴 / 士道龍聖 / 大川響鬼', rate: { A: 1700, B: 1660, C: 1640, D: 1550 } },
      bidPerGoal: 3e7, cashPerGoal: 100000, cashWin: 100000,
      intro: '青い監獄の存続を懸けた一戦。世界最高峰のMF・糸師冴が待つ。',
      highlights: [
        '前半15分。冴の完璧なスルーパスから士道が先制。反撃の狼煙を上げるのは、お前だ——。',
        '後半10分。冴のキープをゾーンプレスで奪う。カウンター、ゴールまで40m——。',
        'アディショナルタイム。冴が初めてお前を「敵」として見た。この一撃で歴史が変わる——。'
      ] },
    { n: 4, title: '新英雄大戦', sub: 'ネオ・エゴイストリーグ — 欧州最強クラブ戦', weeks: 12, envMult: 12,
      statReq: 0, goalReq: 0, winReq: 2, bidReq: 3e8,
      enemy: { name: 'バスタード・ミュンヘン選抜', lead: 'ミヒャエル・カイザー / ネス / 凪誠士郎', rate: { A: 7400, B: 7200, C: 7150, D: 6800 } },
      bidPerGoal: 6e7, cashPerGoal: 180000, cashWin: 180000,
      intro: '欧州のクラブスカウトが見守る中、年俸3億以上の評価を勝ち取れ。',
      highlights: [
        '前半5分。カイザーインパクトが炸裂、先制される。皇帝の視線がお前を捉える——。',
        '前半40分。ネスの魔術的なパスをカットし、一気に敵陣へ。ゴールまで一直線——。',
        '後半終了間際。スタジアム全体が沈黙する。皇帝を超えるのは、今この瞬間しかない——。'
      ] },
    { n: 5, title: 'U-20 W杯 決勝', sub: 'U-20ワールドカップ決勝 — ノエル・ノア率いる最強軍団', weeks: 12, envMult: 28,
      statReq: 0, goalReq: 0, winReq: 3, bidReq: 0,
      enemy: { name: 'ノエル・ノア率いる最強軍団', lead: 'ノエル・ノア / ジュリアン・ロキ / マルク・スナッフィー', rate: { A: 25500, B: 25000, C: 24800, D: 24000 } },
      bidPerGoal: 1e8, cashPerGoal: 300000, cashWin: 300000,
      intro: '世界一を懸けた決勝。許されるのは3対0の完全勝利のみ。一度の失敗が終わりを意味する。',
      highlights: [
        '前半10分。ノアが「見せてみろ」と言わんばかりに中央で待ち構える。世界最高の壁——。',
        '後半5分。ロキの神速を止め、スナッフィーの罠を掻い潜り、ペナルティエリアへ侵入——。',
        '後半45分。世界一の座まで、あと一撃。お前のエゴが世界を塗り替える——。'
      ] }
  ];

  /* ------------------------------------------------------------------ 購買部
   * price は 章番号 × chMult を乗算。買いだめ不可（購入と同時に消費）。
   */
  var ITEMS = [
    { id: 'capsule', name: '高濃度酸素カプセル', price: 40000, desc: 'HPを即座に100%まで全回復。', icon: '💊' },
    { id: 'protein', name: '特製プロテイン',     price: 35000, desc: '次の練習1回に限り、ステータス獲得量を2倍。', icon: '🥤' },
    { id: 'note',    name: '戦術アナライズノート', price: 90000, desc: '次の試合における全選択肢の成功率に+10%。', icon: '📓' }
  ];

  /* ------------------------------------------------------- 突発エゴイベント
   * fx.stat    : { STAT: 練習1回分の獲得量に対する倍率 }
   * fx.trained : 今週鍛えたステータスへの追加倍率
   * fx.allStat : 全ステータスへの倍率
   * fx.hp      : HP増減 / fx.cash : Cash増減 / fx.bid : 年俸増減
   * fx.protein : 次回練習2倍付与
   * fx.roll    : { p, win:{...}, lose:{...}, winText, loseText } ギャンブル
   */
  var EVENTS = [
    { id: 'ev_bachira', rival: 'bachira', title: '蜂楽廻「ねぇ、一緒に遊ぼうよ！」',
      text: '練習中、蜂楽が笑いながらボールを蹴り込んでくる。「オレの中の怪物がさ、お前と遊びたがってるんだ」',
      choices: [
        { label: '即興のコンビネーションで遊ぶ', fx: { stat: { TEC: 0.8, INT: 0.5 }, hp: -6 }, result: '蜂楽の予測不能なドリブルに食らいつき、技術と戦術眼が磨かれた。' },
        { label: '今日は自分の練習に集中する', fx: { trained: 0.5 }, result: '「つまんないの」と去る蜂楽。集中を切らさず、練習効率が上がった。' } ] },
    { id: 'ev_chigiri', rival: 'chigiri', title: '千切豹馬「…競走、する？」',
      text: '千切がスパイクの紐を締め直しながら静かに言う。「本気の速さ、見せてやるよ」',
      choices: [
        { label: '全力で競走する', fx: { roll: { p: 0.5, win: { stat: { SPD: 1.6 } }, lose: { stat: { SPD: 0.5 }, hp: -10 },
                  winText: '食らいついた！千切の神速に肉薄し、スプリントの限界が更新された。', loseText: '置き去りにされた。悔しさだけが残り、脚は限界を超えた。' } } },
        { label: '走りのフォームを盗む', fx: { stat: { SPD: 0.6, INT: 0.4 } }, result: '千切の重心移動を観察し、加速のメカニズムを理解した。' } ] },
    { id: 'ev_barou', rival: 'barou', title: '馬狼照英「オレは王様だ。奴隷はどけ」',
      text: '馬狼がボールを奪い取り、傲然と見下ろす。「王様の練習の邪魔をするな」',
      choices: [
        { label: '1on1で勝負を挑む', fx: { roll: { p: 0.4, win: { stat: { SHT: 1.0, PHY: 1.0 } }, lose: { hp: -15, stat: { PHY: 0.3 } },
                  winText: '王様を抜き去りゴール！馬狼が舌打ちする。決定力と体幹が跳ね上がった。', loseText: '体ごと弾き飛ばされた。「奴隷は奴隷らしくしてろ」' } } },
        { label: '無視して観察に徹する', fx: { stat: { INT: 0.4 } }, result: '馬狼の独善的な動きの中に「ゴールへの最短距離」を見出した。' } ] },
    { id: 'ev_nagi', rival: 'nagi', title: '凪誠士郎「めんどくさ…でも、お前おもしろい」',
      text: '凪がふわりとボールを足元に落とす。重力を無視したかのようなトラップ。',
      choices: [
        { label: 'トラップ技術を教わる', fx: { stat: { TEC: 1.2 } }, result: '「こんな感じ」——天才の感覚を少しだけ盗めた。技術が大きく向上。' },
        { label: 'シュート練習に誘う', fx: { stat: { SHT: 0.6, TEC: 0.4 } }, result: '凪のボレーを真似る。決定力と技術が向上した。' } ] },
    { id: 'ev_rin', rival: 'rin', title: '糸師凛「消えろ。邪魔だ」',
      text: '凛が一人でシュート練習をしている。近づく者を殺すような眼光。',
      choices: [
        { label: 'シュート練習に割り込む', fx: { roll: { p: 0.35, win: { stat: { SHT: 1.5, INT: 0.5 } }, lose: { hp: -20 },
                  winText: '凛が一瞬だけこちらを見た。世界基準の決定力を肌で理解した。', loseText: '蹴り飛ばされた。「二度と近づくな」——肉体が悲鳴を上げる。' } } },
        { label: '距離を取って観察する', fx: { stat: { INT: 0.7, SHT: 0.3 } }, result: '凛のフェイントの間合いを解析した。戦術眼が向上。' } ] },
    { id: 'ev_shidou', rival: 'shidou', title: '士道龍聖「イッちゃう？？」',
      text: '士道が狂気じみた笑みで近づく。「一緒にイこうぜ、破滅まで」',
      choices: [
        { label: '破滅的なシュート合戦', fx: { stat: { SHT: 2.0 }, hp: -25 }, result: '互いに壊れるまで撃ち合った。決定力が爆発的に向上。だが肉体は限界。' },
        { label: '距離を取る', fx: { hp: 5 }, result: '「つまんね」。士道は去った。少し休めた。' } ] },
    { id: 'ev_kunigami', rival: 'kunigami_early', title: '國神錬介「ヒーローになるんだ」',
      text: '國神がバーベルを置き、真っ直ぐな目で言う。「一緒にやるか？」',
      choices: [
        { label: '筋トレ合戦', fx: { stat: { PHY: 1.3 }, hp: -8 }, result: '限界まで追い込んだ。体幹が鋼のように締まった。' },
        { label: 'ロングシュート練習', fx: { stat: { SHT: 0.7, PHY: 0.3 } }, result: '國神の大砲のようなシュートを研究。決定力が向上。' } ] },
    { id: 'ev_ego', rival: null, title: '絵心甚八「お前のエゴは何だ？」',
      text: 'モニター越しに絵心が問う。「答えられない奴に、世界一の資格はない」',
      choices: [
        { label: '「世界一のストライカーになる」', fx: { allStat: 0.3, stat: { INT: 0.5 } }, result: '「ならば証明しろ」。全能力が僅かに研ぎ澄まされた。' },
        { label: '「…まだ、わからない」', fx: { hp: 10 }, result: '「凡人だな」。だが少し肩の力が抜けた。' } ] },
    { id: 'ev_sae', rival: 'sae', title: '糸師冴「日本は世界で通用しない」',
      text: '冴が興味なさそうに呟く。「お前ら程度が世界一？笑わせるな」',
      choices: [
        { label: '食ってかかる', fx: { roll: { p: 0.3, win: { stat: { TEC: 1.5, INT: 1.0 } }, lose: { hp: -15, stat: { INT: 0.3 } },
                  winText: '冴のボールを一度だけ奪った。世界最高峰の技術の一端を掴む。', loseText: '完全にあしらわれた。「話にならない」' } } },
        { label: '聞き流す', fx: { stat: { TEC: 0.3 } }, result: '冴のボールタッチだけを目に焼き付けた。' } ] },
    { id: 'ev_raichi', rival: 'raichi', title: '雷市陣吾「ぶっ潰す！」',
      text: '雷市が突っ込んでくる。「勝負だ！逃げんじゃねぇ！」',
      choices: [
        { label: '受けて立つ', fx: { stat: { PHY: 1.0 }, hp: -10 }, result: '激しいぶつかり合い。接触耐性が向上した。' },
        { label: 'かわす', fx: { stat: { SPD: 0.6 } }, result: '雷市の突進を紙一重でかわし続けた。俊敏性が向上。' } ] },
    { id: 'ev_kaiser', rival: 'kaiser', title: 'ミヒャエル・カイザー「皇帝の前に跪け」',
      text: '青い薔薇のタトゥーを見せつけるようにカイザーが立つ。「格の違いを教えてやる」',
      choices: [
        { label: 'シュート勝負を挑む', fx: { roll: { p: 0.3, win: { stat: { SHT: 2.0 } }, lose: { stat: { SHT: 0.4 }, hp: -15 },
                  winText: 'カイザーインパクトを超える一撃。皇帝が初めて表情を変えた。', loseText: '圧倒的な格差。「これが皇帝だ」' } } },
        { label: '戦術を盗む', fx: { stat: { INT: 0.8 } }, result: '皇帝の駆け引きを分析。戦術眼が向上した。' } ] },
    { id: 'ev_reo', rival: null, title: '御影玲王「金なら出す」',
      text: '玲王が札束を見せつける。「オレの実験に付き合え。悪いようにはしない」',
      choices: [
        { label: '契約を受ける', fx: { cashPerCh: 20000, bidPerCh: 2e6 }, result: 'Cash と年俸評価がわずかに上昇した。' },
        { label: '断る', fx: { stat: { INT: 0.3, PHY: 0.3 } }, result: '「金で買えないものもある」。自分を貫いた。' } ] },
    { id: 'ev_condition', rival: null, title: '異常なコンディション低下',
      text: '朝、身体が鉛のように重い。疲労が蓄積している。',
      choices: [
        { label: '無理を押して練習を続ける', fx: { trained: 0.8, hp: -15 }, result: '限界を超えて追い込んだ。だが肉体はさらに消耗した。' },
        { label: '早めに切り上げる', fx: { hp: 8 }, result: 'コンディション管理を優先。少し回復した。' } ] },
    { id: 'ev_supply', rival: null, title: '購買部の特別支給',
      text: '「今日だけ特別だ」——スタッフが試供品を差し出す。',
      choices: [
        { label: '特製プロテインを受け取る', fx: { protein: true }, result: '次の練習1回の獲得量が2倍になる。' },
        { label: '現金化する', fx: { cashPerCh: 12000 }, result: 'Cash を獲得した。' } ] },
    { id: 'ev_hiori', rival: null, title: '氷織羊「…お前は、何のために蹴る？」',
      text: '氷織が静かに問いかける。「オレは、まだ答えを探してる」',
      choices: [
        { label: '真剣に対話する', fx: { stat: { INT: 1.0 } }, result: '互いのプレー哲学を語り合い、空間の見え方が変わった。' },
        { label: 'パス練習に付き合う', fx: { stat: { TEC: 0.6, INT: 0.3 } }, result: '氷織の正確なパスを受け続け、技術が向上した。' } ] }
  ];

  /* --------------------------------------------- FIFAワールドカップ（殿堂入り用）
   * rateMult : 第5章敵レートに乗算。 climaxes : 4 (2-2 は引き分け即死)
   */
  var WORLD_CUP = {
    climaxes: 4,
    stages: [
      { id: 'r16', name: 'ラウンド16', team: 'アルゼンチン代表', flag: '🇦🇷', rateMult: { A: 1.00, B: 1.02, C: 1.00, D: 1.00 },
        intro: '世界屈指の攻撃陣。守備は個の速さで潰しに来る。' },
      { id: 'qf',  name: '準々決勝',   team: 'ブラジル代表',     flag: '🇧🇷', rateMult: { A: 1.12, B: 1.15, C: 1.05, D: 1.08 },
        intro: '技術で世界を制する王国。だがラインの裏は意外に緩い。' },
      { id: 'sf',  name: '準決勝',     team: 'イングランド代表', flag: '🏴', rateMult: { A: 1.30, B: 1.18, C: 1.22, D: 1.15 },
        intro: '鉄壁のフィジカル。力比べで勝てる相手ではない。' },
      { id: 'f',   name: '決勝',       team: 'フランス代表',     flag: '🇫🇷', rateMult: { A: 1.40, B: 1.40, C: 1.38, D: 1.32 },
        intro: '全てにおいて完成された世界王者。ここを越えれば、真の世界一だ。' }
    ],
    highlights: [
      '前半15分。世界のスピードに戸惑うチーム。だが一瞬の隙をお前だけが見ている——。',
      '前半終了間際。敵の猛攻を凌ぎ、カウンターの狼煙が上がる——。',
      '後半20分。スタジアム全体がお前の名を呼ぶ。世界がお前を認め始めた——。',
      'ラストプレー。世界一の座まで、あと一撃——。'
    ]
  };

  /* ------------------------------------------------------- 調整パラメータ */
  var PARAMS = {
    BASE_MAIN: 10,     COMP_MAIN: 0.012,  /* メイン能力: 基礎×環境倍率 + 現在値×複利 */
    BASE_SUB: 2,       COMP_SUB: 0.004,   /* 副次能力 */
    SKILL_MULT: 1.05,                      /* 所持スキル1つにつき獲得量 ×1.05 (相乗) */
    HP_COST: 15,       HP_COST_VAR: 2,     /* 練習HP消費 15±2 */
    REST_HEAL: 40,
    HP_EFF_TIRED: 0.5, HP_EFF_DANGER: 0.35,
    INJURY_P: 0.40,
    EVENT_RATE: 0.20,
    SIG_K: 10,         WALL: 0.7,          /* 比率 < WALL → 成功率 0% */
    FLOW_LO: 0.25,     FLOW_HI: 0.40,      FLOW_P: 0.25, FLOW_BONUS: 20,
    SKILL_BONUS_CAP: 25,                   /* スキル由来の成功率加算 上限(%) */
    NOTE_BONUS: 10,
    D_POWER_MULT: 1.0,                     /* Option D の実効パワー倍率（レート側で優遇） */
    LB_STEP: 0.05,     LB_GROWTH: 0.03,    /* 限界突破1回ごと: 初期値+5%, 成長補正+3% */
    GACHA_SINGLE: 150, GACHA_TEN: 1500,
    INITIAL_GEMS: 1500,
    GEMS_SURVIVE: 500, GEMS_CLEAR_BONUS: 2000, GEMS_ELIM_PER_CH: 300,
    MVP_BID_MULT: 1.5, FLOW_BID_MULT: 1.2, BID_SKILL_STEP: 0.04
  };

  BL.DATA = {
    STATS: STATS, STAT_META: STAT_META, RARITY: RARITY, CHARACTERS: CHARACTERS,
    SKILLS: SKILLS, FAMILY_JP: FAMILY_JP, OPTIONS: OPTIONS, CHAPTERS: CHAPTERS,
    ITEMS: ITEMS, EVENTS: EVENTS, WORLD_CUP: WORLD_CUP, PARAMS: PARAMS,
    DISCLAIMER: '本ゲームは原作のブルーロックを忠実に再現した、『ブルーロックPWC』の改変版である',
    STARTER_CHAR: 'isagi_early'
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
