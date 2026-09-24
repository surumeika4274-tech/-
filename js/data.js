/* ============================================================================
 * BLUE LOCK PWC : EGOIST ROGUELITE  —  static game data (v2)
 *  - 選手カードは js/cards.js（PWC 全170カード・自動生成）
 *  - 章／節／試合（原作準拠のストーリー）は js/story.js
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};

  /* ------------------------------------------------------------------ 定数 */
  var STATS = ['SHT', 'SPD', 'TEC', 'INT', 'PHY'];
  var STAT_META = {
    SHT: { en: 'SHOOT',        jp: '決定力', color: '#ff4d4d', desc: 'シュート球速・枠内へねじ込む絶対的な得点力' },
    SPD: { en: 'SPEED',        jp: '俊敏性', color: '#4dd2ff', desc: 'スプリント加速・初速・DFラインの裏へ抜ける俊敏性' },
    TEC: { en: 'TECHNIQUE',    jp: '技術',   color: '#7cff6b', desc: 'トラップ精度・キープ・プレースキックの弾道計算' },
    INT: { en: 'INTELLIGENCE', jp: '戦術眼', color: '#c58bff', desc: '戦術理解・空間認識・死角の発見・選択肢の拡張' },
    PHY: { en: 'PHYSICAL',     jp: '肉体',   color: '#ffb84d', desc: '体幹・空中戦と競り合いへの耐性・疲労耐性' }
  };

  /* PWC の「タイプ」→ 本作の主属性。スタミナ／コンディションは PWC 独自タイプで、主属性に加え固有効果を持つ */
  var TYPE_MAP = {
    'キック':       { stat: 'SHT', icon: '⚽', desc: '決定力タイプ' },
    'スピード':     { stat: 'SPD', icon: '💨', desc: '俊敏性タイプ' },
    'テクニック':   { stat: 'TEC', icon: '🎯', desc: '技術タイプ' },
    '賢さ':         { stat: 'INT', icon: '🧠', desc: '戦術眼タイプ' },
    'フィジカル':   { stat: 'PHY', icon: '💪', desc: '肉体タイプ' },
    'スタミナ':     { stat: 'PHY', icon: '🔋', desc: '肉体タイプ（練習HP消費 -2）', hpCost: -2 },
    'コンディション': { stat: 'INT', icon: '🌤', desc: '戦術眼タイプ（コンディションが「普通」未満に落ちない／休養回復 +10）', condFloor: true, restBonus: 10 }
  };

  /* ---------------------------------------------------------- レアリティ（8段階）
   * 仕様書の8段階区分。PWC の各カードは tools/build_cards.js でキャラの原作の格 (floor, peak) と
   * PWC レアリティ（★1→floor … ★5→peak）から内挿して割り当てる。★4FLOW 由来のカードは flow フラグを持つ。
   * rate : ガチャ提供割合(%)（合計 100）
   */
  var RARITY = {
    '8': { stars: 8, label: '★8', name: '世界最強',           rate: 0.2,  base: 100, growth: 1.62, color: '#ff2d55', tier: '世界最高峰。初期から破格の成長倍率を誇る絶対頂点枠' },
    '7': { stars: 7, label: '★7', name: 'マスター・世界選抜', rate: 0.8,  base: 84,  growth: 1.48, color: '#ffd166', tier: '圧倒的フィジカルと戦術眼を持つ世界最高峰' },
    '6': { stars: 6, label: '★6', name: '新世代世界11傑',     rate: 2.0,  base: 70,  growth: 1.36, color: '#f78c1c', tier: '世界ユース最高峰の個人技と突出した武器' },
    '5': { stars: 5, label: '★5', name: '青い監獄 最上位',    rate: 5.0,  base: 58,  growth: 1.25, color: '#c58bff', tier: '単独で試合を破壊する青い監獄のトップ層' },
    '4': { stars: 4, label: '★4', name: '青い監獄 主力選抜',  rate: 12.0, base: 47,  growth: 1.15, color: '#4da3ff', tier: '卓越した一芸で自立した決定力を持つエース層' },
    '3': { stars: 3, label: '★3', name: '覚醒の主軸',         rate: 25.0, base: 38,  growth: 1.06, color: '#3ddc84', tier: '全国トップクラスの武器を持ち、育成次第で大化けする枠' },
    '2': { stars: 2, label: '★2', name: '発展途上の原石',     rate: 30.0, base: 30,  growth: 0.98, color: '#9aa4b2', tier: '原石。限界突破の蓄積で化ける' },
    '1': { stars: 1, label: '★1', name: '最底辺・生存縛り',   rate: 25.0, base: 24,  growth: 0.90, color: '#6b7280', tier: '初期ステータス・成長補正ともに最低水準のサバイバル枠' }
  };
  var RARITY_ORDER = ['8', '7', '6', '5', '4', '3', '2', '1'];

  /* ------------------------------------------------------- キャラクター（41名）
   * ident : 5属性の個性ベクトル（1.0 = 平均）。カードの初期値・成長補正の形を決める
   * fav   : 得意選択肢（固有エゴが強化する Option）
   * passive : 固有エゴ（カードのレアリティに関係なく共通）
   * sig   : 固有覚醒スキル（Climax 成功時に主属性が閾値を超えるか FLOW 成功で覚醒）
   */
  var CHARACTERS = {
    isagi:    { name: '潔世一',       tag: '空間認識の申し子',       ident: { SHT: 1.1, SPD: 0.9, TEC: 0.9, INT: 1.2, PHY: 0.85 }, fav: 'D',
                passive: { name: '覚醒の兆し', desc: 'FLOW 突入率 +10%。Option D +3%。', flowP: 0.10, opt: { D: 3 } },
                sig: { name: 'メタビジョン・ダイレクト', desc: 'Option D +8% / Option A +4%', fx: { opt: { D: 8, A: 4 } } } },
    bachira:  { name: '蜂楽廻',       tag: '怪物',                   ident: { SHT: 0.9, SPD: 0.95, TEC: 1.3, INT: 0.9, PHY: 0.8 }, fav: 'B',
                passive: { name: '中の怪物', desc: 'Option B +3%。突発イベント率 +5%。', opt: { B: 3 }, eventRate: 0.05 },
                sig: { name: '怪物のドリブル', desc: 'Option B +8% / 全選択肢 +2%', fx: { opt: { B: 8 }, all: 2 } } },
    chigiri:  { name: '千切豹馬',     tag: '神速',                   ident: { SHT: 0.9, SPD: 1.4, TEC: 0.9, INT: 0.85, PHY: 0.75 }, fav: 'C',
                passive: { name: '神速', desc: 'Option C +5%。', opt: { C: 5 } },
                sig: { name: '縛られぬ速さ', desc: 'Option C +10%', fx: { opt: { C: 10 } } } },
    kunigami: { name: '國神錬介',     tag: 'ヒーロー',               ident: { SHT: 1.1, SPD: 0.85, TEC: 0.8, INT: 0.8, PHY: 1.25 }, fav: 'A',
                passive: { name: 'ヒーロー志願', desc: 'Option A +3%。', opt: { A: 3 } },
                sig: { name: '無回転バズーカ', desc: 'Option A +8% / 練習HP消費 -1', fx: { opt: { A: 8 }, hpCost: -1 } } },
    nagi:     { name: '凪誠士郎',     tag: '天才',                   ident: { SHT: 1.05, SPD: 0.8, TEC: 1.35, INT: 1.0, PHY: 0.8 }, fav: 'B',
                passive: { name: '天才のトラップ', desc: 'Option B +5%。', opt: { B: 5 } },
                sig: { name: '神トラップ', desc: 'Option B +8% / Option A +3%', fx: { opt: { B: 8, A: 3 } } } },
    reo:      { name: '御影玲王',     tag: 'カメレオン',             ident: { SHT: 0.95, SPD: 0.95, TEC: 1.05, INT: 1.15, PHY: 0.9 }, fav: 'B',
                passive: { name: '万能のカメレオン', desc: '全選択肢 +2%。Cash 報酬 ×1.2。', all: 2, cashMult: 1.2 },
                sig: { name: '複写（コピー）', desc: '全選択肢 +4%', fx: { all: 4 } } },
    barou:    { name: '馬狼照英',     tag: '王様',                   ident: { SHT: 1.25, SPD: 0.9, TEC: 0.95, INT: 0.8, PHY: 1.15 }, fav: 'A',
                passive: { name: '王様', desc: 'Option A +5%。', opt: { A: 5 } },
                sig: { name: '邪道こそが王道', desc: 'Option A +9% / 年俸 ×+5%', fx: { opt: { A: 9 }, bid: 0.05 } } },
    rin:      { name: '糸師凛',       tag: '青い監獄 最強',          ident: { SHT: 1.2, SPD: 1.0, TEC: 1.1, INT: 1.15, PHY: 0.95 }, fav: 'A',
                passive: { name: 'フェイントの化身', desc: '全選択肢 +2%、Option A +3%。', all: 2, opt: { A: 3 } },
                sig: { name: '破壊者', desc: 'Option A +7% / Option B +4%', fx: { opt: { A: 7, B: 4 } } } },
    sae:      { name: '糸師冴',       tag: '世界最高峰のMF',         ident: { SHT: 0.95, SPD: 0.9, TEC: 1.35, INT: 1.2, PHY: 0.75 }, fav: 'B',
                passive: { name: '絶対的ボールホルダー', desc: 'Option B +7%。', opt: { B: 7 } },
                sig: { name: '美しく壊す', desc: 'Option B +8% / Option D +4%', fx: { opt: { B: 8, D: 4 } } } },
    shidou:   { name: '士道龍聖',     tag: '破滅の悦楽',             ident: { SHT: 1.3, SPD: 1.0, TEC: 0.85, INT: 0.75, PHY: 1.15 }, fav: 'A',
                passive: { name: '破滅の悦楽', desc: 'Option A +7%。ただし練習HP消費 +1。', opt: { A: 7 }, hpCost: 1 },
                sig: { name: '龍聖・直下蹴弾', desc: 'Option A +10%', fx: { opt: { A: 10 } } } },
    raichi:   { name: '雷市陣吾',     tag: '気迫',                   ident: { SHT: 0.9, SPD: 0.9, TEC: 0.8, INT: 0.75, PHY: 1.3 }, fav: 'A',
                passive: { name: '気迫', desc: '練習HP消費 -1。', hpCost: -1 },
                sig: { name: '傍若無人強奪', desc: 'Option A +6% / 練習HP消費 -1', fx: { opt: { A: 6 }, hpCost: -1 } } },
    gagamaru: { name: '我牙丸吟',     tag: '野生',                   ident: { SHT: 0.8, SPD: 1.05, TEC: 0.85, INT: 0.8, PHY: 1.2 }, fav: 'C',
                passive: { name: '野生の反射', desc: 'FLOW 突入率 +5%。', flowP: 0.05 },
                sig: { name: 'アクロバティック', desc: 'Option C +5% / Option A +4%', fx: { opt: { C: 5, A: 4 } } } },
    igarashi: { name: '五十嵐栗夢',   tag: '生存本能',               ident: { SHT: 0.85, SPD: 0.9, TEC: 0.85, INT: 0.8, PHY: 0.9 }, fav: 'C',
                passive: { name: '生存本能', desc: '危険水域での故障率 40%→30%。', injuryP: -0.10 },
                sig: { name: '南無三！', desc: 'Option C +5% / 故障率 -5%', fx: { opt: { C: 5 }, injuryP: -0.05 } } },
    naruhaya: { name: '成早朝日',     tag: '執念',                   ident: { SHT: 0.9, SPD: 1.0, TEC: 0.85, INT: 0.8, PHY: 0.85 }, fav: 'C',
                passive: { name: '大金への執念', desc: 'Cash 報酬 ×1.3。', cashMult: 1.3 },
                sig: { name: 'ムードメーカー', desc: 'Option C +5% / Cash ×1.1', fx: { opt: { C: 5 }, cashMult: 1.1 } } },
    kira:     { name: '吉良涼介',     tag: '日本サッカー界の宝',     ident: { SHT: 1.05, SPD: 0.95, TEC: 1.0, INT: 0.95, PHY: 0.9 }, fav: 'A',
                passive: { name: 'エースの矜持', desc: '年俸査定 ×1.05。', bidMult: 1.05 },
                sig: { name: '松風黒王のエース', desc: 'Option A +6% / 年俸 ×+5%', fx: { opt: { A: 6 }, bid: 0.05 } } },
    iemon:    { name: '伊右衛門送人', tag: '鉄壁',                   ident: { SHT: 0.75, SPD: 0.8, TEC: 0.85, INT: 1.0, PHY: 1.1 }, fav: 'A',
                passive: { name: '鉄壁', desc: '練習HP消費 -1。', hpCost: -1 },
                sig: { name: '守備職人', desc: 'Option A +5% / 全選択肢 +1%', fx: { opt: { A: 5 }, all: 1 } } },
    imamura:  { name: '今村遊大',     tag: '恋愛脳',                 ident: { SHT: 0.85, SPD: 1.0, TEC: 0.9, INT: 0.8, PHY: 0.85 }, fav: 'C',
                passive: { name: '恋愛脳', desc: '突発イベント率 +5%。', eventRate: 0.05 },
                sig: { name: 'ひらめきの一撃', desc: 'Option C +5% / Option B +3%', fx: { opt: { C: 5, B: 3 } } } },
    kuon:     { name: '久遠渉',       tag: 'ハイジャンパー',         ident: { SHT: 0.95, SPD: 0.95, TEC: 0.8, INT: 0.8, PHY: 1.15 }, fav: 'A',
                passive: { name: '裏切りの打算', desc: 'Cash 報酬 ×1.2。Option A +2%。', cashMult: 1.2, opt: { A: 2 } },
                sig: { name: 'ハイジャンプ・ヘッド', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    okawa:    { name: '大川響鬼',     tag: '熊本県大会得点王',       ident: { SHT: 1.1, SPD: 0.9, TEC: 0.85, INT: 0.8, PHY: 0.9 }, fav: 'A',
                passive: { name: '得点王の意地', desc: 'Option A +2%。', opt: { A: 2 } },
                sig: { name: '熊本の砲弾', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    niko:     { name: '二子一揮',     tag: '影の支配者',             ident: { SHT: 0.85, SPD: 0.85, TEC: 0.95, INT: 1.3, PHY: 0.8 }, fav: 'B',
                passive: { name: '影の支配者', desc: 'Option B +3%、Option D +3%。', opt: { B: 3, D: 3 } },
                sig: { name: '無限の発想', desc: 'Option B +6% / Option D +6%', fx: { opt: { B: 6, D: 6 } } } },
    wanima_j: { name: '鰐間淳壱',     tag: '兄',                     ident: { SHT: 1.05, SPD: 1.05, TEC: 0.9, INT: 0.85, PHY: 0.9 }, fav: 'C',
                passive: { name: '以心伝心（兄）', desc: 'Option C +3%。', opt: { C: 3 } },
                sig: { name: '兄弟連携カウンター', desc: 'Option C +6% / Option A +3%', fx: { opt: { C: 6, A: 3 } } } },
    wanima_k: { name: '鰐間計助',     tag: '弟',                     ident: { SHT: 0.95, SPD: 1.05, TEC: 0.95, INT: 0.9, PHY: 0.9 }, fav: 'C',
                passive: { name: '以心伝心（弟）', desc: 'Option C +3%。', opt: { C: 3 } },
                sig: { name: '兄弟連携スルー', desc: 'Option C +6% / Option B +3%', fx: { opt: { C: 6, B: 3 } } } },
    aryu:     { name: '蟻生十兵衛',   tag: 'オシャ',                 ident: { SHT: 0.9, SPD: 0.95, TEC: 0.9, INT: 0.85, PHY: 1.35 }, fav: 'A',
                passive: { name: '反則級の特級身体', desc: 'Option A +4%。', opt: { A: 4 } },
                sig: { name: 'No.1オシャ・ヘッド', desc: 'Option A +8%', fx: { opt: { A: 8 } } } },
    tokimitsu:{ name: '時光青志',     tag: 'フィジカルモンスター',   ident: { SHT: 0.95, SPD: 0.95, TEC: 0.8, INT: 0.7, PHY: 1.4 }, fav: 'A',
                passive: { name: 'フィジカルモンスター', desc: 'Option A +4%。練習HP消費 -1。', opt: { A: 4 }, hpCost: -1 },
                sig: { name: '背肩奪取', desc: 'Option A +8% / 練習HP消費 -1', fx: { opt: { A: 8 }, hpCost: -1 } } },
    zantetsu: { name: '剣城斬鉄',     tag: '領域',                   ident: { SHT: 0.9, SPD: 1.3, TEC: 0.85, INT: 0.7, PHY: 1.0 }, fav: 'C',
                passive: { name: '俺の領域', desc: 'Option C +4%。', opt: { C: 4 } },
                sig: { name: '名誉返上の守備', desc: 'Option C +7% / 全選択肢 +1%', fx: { opt: { C: 7 }, all: 1 } } },
    kiyora:   { name: '清羅刃',       tag: 'ボーダーライナー',       ident: { SHT: 0.95, SPD: 1.0, TEC: 1.0, INT: 1.0, PHY: 0.95 }, fav: 'B',
                passive: { name: 'ボーダーライナー', desc: '全選択肢 +1%。', all: 1 },
                sig: { name: '境界線の一手', desc: '全選択肢 +4%', fx: { all: 4 } } },
    hiori:    { name: '氷織羊',       tag: '静のテクニシャン',       ident: { SHT: 0.85, SPD: 0.9, TEC: 1.15, INT: 1.3, PHY: 0.8 }, fav: 'B',
                passive: { name: '冷静な視野', desc: 'Option B +4%、Option D +3%。', opt: { B: 4, D: 3 } },
                sig: { name: '「静」のテクニシャン', desc: 'Option B +7% / Option D +6%', fx: { opt: { B: 7, D: 6 } } } },
    karasu:   { name: '烏旅人',       tag: 'ヒットマン',             ident: { SHT: 0.9, SPD: 0.95, TEC: 1.2, INT: 1.2, PHY: 0.9 }, fav: 'B',
                passive: { name: '弱点を突く', desc: 'Option B +5%。', opt: { B: 5 } },
                sig: { name: '弱点がないなら創るまで', desc: 'Option B +8% / 全選択肢 +2%', fx: { opt: { B: 8 }, all: 2 } } },
    otoya:    { name: '乙夜影汰',     tag: '忍者',                   ident: { SHT: 1.0, SPD: 1.35, TEC: 1.0, INT: 0.8, PHY: 0.8 }, fav: 'C',
                passive: { name: '忍術', desc: 'Option C +5%。', opt: { C: 5 } },
                sig: { name: '速攻の忍術', desc: 'Option C +9% / Option A +3%', fx: { opt: { C: 9, A: 3 } } } },
    yukimiya: { name: '雪宮剣優',     tag: '1on1エンペラー',         ident: { SHT: 1.15, SPD: 1.0, TEC: 1.15, INT: 0.9, PHY: 0.85 }, fav: 'A',
                passive: { name: '1on1エンペラー', desc: 'Option A +3%、Option B +3%。', opt: { A: 3, B: 3 } },
                sig: { name: '一瞬に見出す極限', desc: 'Option A +6% / Option B +6%', fx: { opt: { A: 6, B: 6 } } } },
    kurona:   { name: '黒名蘭世',     tag: 'シャーク',               ident: { SHT: 0.95, SPD: 1.25, TEC: 1.05, INT: 0.85, PHY: 0.8 }, fav: 'C',
                passive: { name: '小柄なシャーク', desc: 'Option C +4%。', opt: { C: 4 } },
                sig: { name: 'シャークの捕食', desc: 'Option C +8% / Option B +3%', fx: { opt: { C: 8, B: 3 } } } },
    nanase:   { name: '七星虹郎',     tag: '天然記念物',             ident: { SHT: 0.9, SPD: 1.0, TEC: 0.85, INT: 0.8, PHY: 1.2 }, fav: 'A',
                passive: { name: '天然記念物', desc: '練習HP消費 -1。', hpCost: -1 },
                sig: { name: 'トレッキング・トレーニング', desc: 'Option A +6% / 練習HP消費 -1', fx: { opt: { A: 6 }, hpCost: -1 } } },
    aiku:     { name: 'オリヴァ・愛空', tag: 'U-20日本代表主将',     ident: { SHT: 0.8, SPD: 0.95, TEC: 1.0, INT: 1.3, PHY: 1.15 }, fav: 'D',
                passive: { name: '捉える間合い', desc: '全選択肢 +3%。', all: 3 },
                sig: { name: 'オールMAXで視える世界', desc: '全選択肢 +5%', fx: { all: 5 } } },
    sendou:   { name: '閃堂秋人',     tag: 'U-20日本代表エース',     ident: { SHT: 1.15, SPD: 0.9, TEC: 0.85, INT: 0.8, PHY: 1.2 }, fav: 'A',
                passive: { name: 'エースの意地', desc: 'Option A +4%。', opt: { A: 4 } },
                sig: { name: '世界標準の欲望', desc: 'Option A +9%', fx: { opt: { A: 9 } } } },
    mitoma:   { name: '三笘薫',       tag: 'ワールドストライカー',   ident: { SHT: 1.0, SPD: 1.35, TEC: 1.2, INT: 0.9, PHY: 0.85 }, fav: 'C',
                passive: { name: '電光石火', desc: 'Option C +5%、Option B +3%。', opt: { C: 5, B: 3 } },
                sig: { name: '独走のワールドストライカー', desc: 'Option C +8% / Option B +4%', fx: { opt: { C: 8, B: 4 } } } },
    honda:    { name: '本田圭佑',     tag: '永遠の挑戦者',           ident: { SHT: 1.2, SPD: 0.85, TEC: 1.05, INT: 1.15, PHY: 0.95 }, fav: 'A',
                passive: { name: '永遠の挑戦者', desc: '年俸査定 ×1.10。', bidMult: 1.10 },
                sig: { name: '挑戦者の無回転', desc: 'Option A +7% / 年俸 ×+5%', fx: { opt: { A: 7 }, bid: 0.05 } } },
    luna:     { name: 'レオナルド・ルナ', tag: 'レ・アールの貴公子', ident: { SHT: 1.0, SPD: 1.0, TEC: 1.35, INT: 1.1, PHY: 0.85 }, fav: 'B',
                passive: { name: '貴公子の技巧', desc: 'Option B +5%。', opt: { B: 5 } },
                sig: { name: 'レ・アールの魔術', desc: 'Option B +9%', fx: { opt: { B: 9 } } } },
    blake:    { name: 'アダム・ブレイク', tag: 'GGジャンキー',       ident: { SHT: 1.25, SPD: 0.95, TEC: 0.9, INT: 0.85, PHY: 1.15 }, fav: 'A',
                passive: { name: 'GGジャンキー', desc: 'Option A +5%。', opt: { A: 5 } },
                sig: { name: 'イングランドの砲撃', desc: 'Option A +9%', fx: { opt: { A: 9 } } } },
    dada:     { name: 'ダダ・シウバ', tag: '重戦車',                 ident: { SHT: 1.05, SPD: 0.9, TEC: 0.85, INT: 0.8, PHY: 1.45 }, fav: 'A',
                passive: { name: '重戦車', desc: 'Option A +4%。練習HP消費 -2。', opt: { A: 4 }, hpCost: -2 },
                sig: { name: '重戦車の突進', desc: 'Option A +8% / 練習HP消費 -1', fx: { opt: { A: 8 }, hpCost: -1 } } },
    cavazos:  { name: 'パブロ・カバソス', tag: 'そばかすベイビー',   ident: { SHT: 1.0, SPD: 1.2, TEC: 1.2, INT: 1.0, PHY: 0.8 }, fav: 'C',
                passive: { name: 'アルゼンチンの閃き', desc: 'Option C +3%、Option B +3%。', opt: { C: 3, B: 3 } },
                sig: { name: 'ラ・ヌエストラ', desc: 'Option C +6% / Option B +6%', fx: { opt: { C: 6, B: 6 } } } },
    loki:     { name: 'ジュリアン・ロキ', tag: '神童',               ident: { SHT: 1.05, SPD: 1.5, TEC: 1.05, INT: 1.0, PHY: 0.85 }, fav: 'C',
                passive: { name: 'マッハスピード', desc: 'Option C +8%。', opt: { C: 8 } },
                sig: { name: '同世代の超新星', desc: 'Option C +12%', fx: { opt: { C: 12 } } } },
    /* ---- 改変版オリジナル（PWC に選手カードが無い世界最強／マスター／世界11傑クラス） ---- */
    noa:      { name: 'ノエル・ノア',   tag: '世界最高のストライカー', ident: { SHT: 1.3, SPD: 1.15, TEC: 1.25, INT: 1.2, PHY: 1.2 }, fav: 'A',
                passive: { name: '完全無欠', desc: '全選択肢 +5%。練習HP消費 -2。', all: 5, hpCost: -2 },
                sig: { name: '世界を魅せる一撃', desc: 'Option A +10% / 全選択肢 +3%', fx: { opt: { A: 10 }, all: 3 } } },
    ego_if:   { name: '絵心甚八',       tag: '現役if・エゴイストの設計者', ident: { SHT: 1.05, SPD: 0.95, TEC: 1.1, INT: 1.4, PHY: 0.95 }, fav: 'D',
                passive: { name: '設計者の眼', desc: 'スキル覚醒閾値 ×0.9。Option D +4%。', thMult: 0.9, opt: { D: 4 } },
                sig: { name: 'エゴイストの設計図', desc: 'Option D +12% / 全選択肢 +2%', fx: { opt: { D: 12 }, all: 2 } } },
    snuffy:   { name: 'マルク・スナッフィー', tag: 'マスター',       ident: { SHT: 1.0, SPD: 0.9, TEC: 1.15, INT: 1.35, PHY: 1.05 }, fav: 'B',
                passive: { name: 'マスターの戦術眼', desc: 'Option B +6%。年俸査定 ×1.10。', opt: { B: 6 }, bidMult: 1.10 },
                sig: { name: 'マスターの盤面', desc: 'Option B +10% / Option D +4%', fx: { opt: { B: 10, D: 4 } } } },
    lavinho:  { name: 'ラヴィーニョ',   tag: '遊びの魔術師',           ident: { SHT: 0.95, SPD: 1.05, TEC: 1.4, INT: 1.1, PHY: 0.8 }, fav: 'B',
                passive: { name: '遊びの魔術', desc: 'Option B +6%。突発イベント率 +5%。', opt: { B: 6 }, eventRate: 0.05 },
                sig: { name: 'ジョガ・ボニート', desc: 'Option B +10% / Option C +4%', fx: { opt: { B: 10, C: 4 } } } },
    prince:   { name: 'クリス・プリンス', tag: '華麗なる王子',        ident: { SHT: 1.3, SPD: 1.1, TEC: 1.15, INT: 1.0, PHY: 1.0 }, fav: 'A',
                passive: { name: '華麗なる王子', desc: 'Option A +5%、Option C +3%。', opt: { A: 5, C: 3 } },
                sig: { name: 'プリンスの美学', desc: 'Option A +8% / Option C +6%', fx: { opt: { A: 8, C: 6 } } } },
    kaiser:   { name: 'ミヒャエル・カイザー', tag: '皇帝',           ident: { SHT: 1.35, SPD: 1.0, TEC: 1.05, INT: 1.0, PHY: 0.95 }, fav: 'A',
                passive: { name: 'カイザーインパクト', desc: 'Option A +7%。', opt: { A: 7 } },
                sig: { name: 'カイザーインパクト・零', desc: 'Option A +12%', fx: { opt: { A: 12 } } } },
    lorenzo:  { name: 'ドン・ロレンツォ', tag: '守備の魔物',         ident: { SHT: 0.8, SPD: 0.95, TEC: 0.9, INT: 1.05, PHY: 1.45 }, fav: 'A',
                passive: { name: '守備の魔物', desc: 'Option A +4%。練習HP消費 -2。', opt: { A: 4 }, hpCost: -2 },
                sig: { name: '魔物の壁', desc: 'Option A +8% / 全選択肢 +2%', fx: { opt: { A: 8 }, all: 2 } } },
    chevalier:{ name: 'シャルル・シュヴァリエ', tag: '電光石火の騎士', ident: { SHT: 1.1, SPD: 1.4, TEC: 1.0, INT: 0.95, PHY: 0.9 }, fav: 'C',
                passive: { name: '電光石火', desc: 'Option C +7%。', opt: { C: 7 } },
                sig: { name: '騎士の突撃', desc: 'Option C +10% / Option A +3%', fx: { opt: { C: 10, A: 3 } } } },
    ness:     { name: 'アレクシス・ネス', tag: '皇帝の魔術師',        ident: { SHT: 0.85, SPD: 0.95, TEC: 1.35, INT: 1.2, PHY: 0.8 }, fav: 'B',
                passive: { name: '皇帝の魔術師', desc: 'Option B +5%、Option D +3%。', opt: { B: 5, D: 3 } },
                sig: { name: '魔術のスルーパス', desc: 'Option B +9% / Option D +5%', fx: { opt: { B: 9, D: 5 } } } },
    /* ---- 青い監獄組（原作登場・PWC 未収録） ---- */
    otoru:    { name: '音留徹平',     tag: '音速のサイド',           ident: { SHT: 0.9, SPD: 1.15, TEC: 1.05, INT: 0.9, PHY: 0.85 }, fav: 'C',
                passive: { name: '音速のクロス', desc: 'Option C +3%。', opt: { C: 3 } }, sig: { name: '音留のカットイン', desc: 'Option C +6% / Option B +3%', fx: { opt: { C: 6, B: 3 } } } },
    nio:      { name: '仁王和真',     tag: '鉄壁のDF',               ident: { SHT: 0.75, SPD: 0.95, TEC: 0.9, INT: 1.15, PHY: 1.25 }, fav: 'A',
                passive: { name: '鉄壁のDF', desc: 'Option A +3%。練習HP消費 -1。', opt: { A: 3 }, hpCost: -1 }, sig: { name: '仁王立ち', desc: 'Option A +6% / 全選択肢 +2%', fx: { opt: { A: 6 }, all: 2 } } },
    tsunzaki: { name: '劈大河',       tag: '剛腕',                   ident: { SHT: 0.9, SPD: 0.95, TEC: 0.8, INT: 0.8, PHY: 1.25 }, fav: 'A',
                passive: { name: '剛腕', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '劈く一撃', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    saramadara:{ name: '皿斑海琉',    tag: '反射神経',               ident: { SHT: 0.7, SPD: 0.9, TEC: 0.85, INT: 1.1, PHY: 1.2 }, fav: 'C',
                passive: { name: '反射神経', desc: 'FLOW 突入率 +5%。', flowP: 0.05 }, sig: { name: 'セーブからのカウンター', desc: 'Option C +5% / Option A +3%', fx: { opt: { C: 5, A: 3 } } } },
    hiiragi:  { name: '柊零次',       tag: '静かなる技巧',           ident: { SHT: 0.85, SPD: 0.95, TEC: 1.1, INT: 1.1, PHY: 0.8 }, fav: 'B',
                passive: { name: '静かなる技巧', desc: 'Option B +3%。', opt: { B: 3 } }, sig: { name: '柊の切り返し', desc: 'Option B +6%', fx: { opt: { B: 6 } } } },
    nishioka: { name: '西岡初',       tag: '初速',                   ident: { SHT: 0.9, SPD: 1.15, TEC: 0.9, INT: 0.85, PHY: 0.9 }, fav: 'C',
                passive: { name: '初速', desc: 'Option C +3%。', opt: { C: 3 } }, sig: { name: '西岡ダッシュ', desc: 'Option C +6%', fx: { opt: { C: 6 } } } },
    fukaku:   { name: '不角源',       tag: '角のない巨体',           ident: { SHT: 0.95, SPD: 0.85, TEC: 0.8, INT: 0.8, PHY: 1.25 }, fav: 'A',
                passive: { name: '角のない巨体', desc: 'Option A +3%。練習HP消費 -1。', opt: { A: 3 }, hpCost: -1 }, sig: { name: '不角の壁', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    tanaka:   { name: '田中信玄',     tag: '軍師',                   ident: { SHT: 0.85, SPD: 0.85, TEC: 1.05, INT: 1.15, PHY: 0.9 }, fav: 'B',
                passive: { name: '軍師', desc: 'Option B +3%。', opt: { B: 3 } }, sig: { name: '風林火山', desc: 'Option B +5% / Option D +3%', fx: { opt: { B: 5, D: 3 } } } },
    shiguma:  { name: '志熊恭平',     tag: '熊の体幹',               ident: { SHT: 0.9, SPD: 0.9, TEC: 0.85, INT: 0.8, PHY: 1.2 }, fav: 'A',
                passive: { name: '熊の体幹', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '志熊の押し込み', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    ishikari: { name: '石狩幸雄',     tag: '一撃必殺',               ident: { SHT: 1.1, SPD: 0.9, TEC: 0.9, INT: 0.85, PHY: 0.95 }, fav: 'A',
                passive: { name: '一撃必殺', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '石狩の弾丸', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    chou:     { name: '超健人',       tag: '超加速',                 ident: { SHT: 0.9, SPD: 1.1, TEC: 1.05, INT: 0.9, PHY: 0.85 }, fav: 'C',
                passive: { name: '超加速', desc: 'Option C +3%。', opt: { C: 3 } }, sig: { name: '超ドリブル', desc: 'Option C +5% / Option B +3%', fx: { opt: { C: 5, B: 3 } } } },
    yuzu:     { name: '柚春彦',       tag: '柚のパス',               ident: { SHT: 0.85, SPD: 0.95, TEC: 1.15, INT: 1.0, PHY: 0.8 }, fav: 'B',
                passive: { name: '柚のパス', desc: 'Option B +3%。', opt: { B: 3 } }, sig: { name: '春彦のスルー', desc: 'Option B +6%', fx: { opt: { B: 6 } } } },
    sendouji: { name: '猿堂寺暁',     tag: '空中の猿',               ident: { SHT: 1.05, SPD: 0.85, TEC: 0.85, INT: 0.8, PHY: 1.1 }, fav: 'A',
                passive: { name: '空中の猿', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '猿堂寺ヘッド', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    hayate:   { name: '颯波留',       tag: '疾風',                   ident: { SHT: 0.9, SPD: 1.2, TEC: 0.95, INT: 0.85, PHY: 0.8 }, fav: 'C',
                passive: { name: '疾風', desc: 'Option C +4%。', opt: { C: 4 } }, sig: { name: '颯の突風', desc: 'Option C +6%', fx: { opt: { C: 6 } } } },
    jarai:    { name: '蛇来弥勒',     tag: '蛇の足技',               ident: { SHT: 0.85, SPD: 0.9, TEC: 1.15, INT: 1.0, PHY: 0.85 }, fav: 'B',
                passive: { name: '蛇の足技', desc: 'Option B +3%。', opt: { B: 3 } }, sig: { name: '弥勒の幻惑', desc: 'Option B +6%', fx: { opt: { B: 6 } } } },
    kori:     { name: '狐里輝',       tag: '狐の嗅覚',               ident: { SHT: 0.85, SPD: 0.95, TEC: 1.05, INT: 1.15, PHY: 0.8 }, fav: 'B',
                passive: { name: '狐の嗅覚', desc: 'Option B +2%、Option D +2%。', opt: { B: 2, D: 2 } }, sig: { name: '狐里の抜け道', desc: 'Option B +4% / Option D +4%', fx: { opt: { B: 4, D: 4 } } } },
    wakatsuki:{ name: '若月樹',       tag: '若木の体幹',             ident: { SHT: 0.9, SPD: 1.05, TEC: 0.85, INT: 0.8, PHY: 1.15 }, fav: 'A',
                passive: { name: '若木の体幹', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '若月の突進', desc: 'Option A +5% / Option C +3%', fx: { opt: { A: 5, C: 3 } } } },
    sokura:   { name: '曽倉哲',       tag: '曽倉の左足',             ident: { SHT: 1.1, SPD: 0.85, TEC: 0.9, INT: 0.85, PHY: 0.95 }, fav: 'A',
                passive: { name: '曽倉の左足', desc: 'Option A +3%。', opt: { A: 3 } }, sig: { name: '曽倉ミドル', desc: 'Option A +6%', fx: { opt: { A: 6 } } } },
    himizu:   { name: '日不見愛基',   tag: '影走り',                 ident: { SHT: 0.85, SPD: 1.1, TEC: 0.9, INT: 1.05, PHY: 0.85 }, fav: 'C',
                passive: { name: '影走り', desc: 'Option C +3%。', opt: { C: 3 } }, sig: { name: '日不見の裏抜け', desc: 'Option C +6%', fx: { opt: { C: 6 } } } },
    haiji:    { name: '灰地静',       tag: '静かな司令塔',           ident: { SHT: 0.8, SPD: 0.9, TEC: 1.1, INT: 1.15, PHY: 0.85 }, fav: 'B',
                passive: { name: '静かな司令塔', desc: 'Option B +3%。', opt: { B: 3 } }, sig: { name: '灰地の展開', desc: 'Option B +5% / Option D +3%', fx: { opt: { B: 5, D: 3 } } } },
    /* ---- U-20 W杯 各国代表 ---- */
    teddy:    { name: 'テディ・ナイト', tag: 'イングランドの新星',   ident: { SHT: 1.25, SPD: 1.15, TEC: 1.0, INT: 0.95, PHY: 1.0 }, fav: 'A',
                passive: { name: 'ナイトの騎士道', desc: 'Option A +5%、Option C +3%。', opt: { A: 5, C: 3 } }, sig: { name: 'テディの一閃', desc: 'Option A +8% / Option C +4%', fx: { opt: { A: 8, C: 4 } } } },
    achampong:{ name: 'アチャンポン', tag: '司令塔',                 ident: { SHT: 0.9, SPD: 0.95, TEC: 1.15, INT: 1.25, PHY: 0.9 }, fav: 'B',
                passive: { name: '司令塔', desc: 'Option B +4%、Option D +2%。', opt: { B: 4, D: 2 } }, sig: { name: 'アチャンポンの魔法', desc: 'Option B +7% / Option D +4%', fx: { opt: { B: 7, D: 4 } } } },
    onaji:    { name: 'オナジ',       tag: 'ナイジェリアの猛獣',     ident: { SHT: 1.15, SPD: 1.05, TEC: 0.85, INT: 0.8, PHY: 1.25 }, fav: 'A',
                passive: { name: '猛獣', desc: 'Option A +5%。', opt: { A: 5 } }, sig: { name: 'オナジの咆哮', desc: 'Option A +8%', fx: { opt: { A: 8 } } } },
    kusso:    { name: 'クッソ',       tag: 'ナイジェリアの頭脳',     ident: { SHT: 0.85, SPD: 0.95, TEC: 1.1, INT: 1.25, PHY: 0.85 }, fav: 'B',
                passive: { name: 'ゲームメイク', desc: 'Option B +4%。', opt: { B: 4 } }, sig: { name: 'クッソの魔術', desc: 'Option B +7%', fx: { opt: { B: 7 } } } },
    hugo:     { name: 'ユーゴー',     tag: 'フランスの巨躯',         ident: { SHT: 1.15, SPD: 0.95, TEC: 0.95, INT: 0.9, PHY: 1.15 }, fav: 'A',
                passive: { name: '巨躯', desc: 'Option A +4%。', opt: { A: 4 } }, sig: { name: 'ユーゴーの砲撃', desc: 'Option A +7%', fx: { opt: { A: 7 } } } },
    raiden:   { name: 'ライデン',     tag: '雷光',                   ident: { SHT: 0.95, SPD: 1.15, TEC: 0.85, INT: 0.85, PHY: 1.15 }, fav: 'C',
                passive: { name: '雷光', desc: 'Option C +4%。', opt: { C: 4 } }, sig: { name: 'ライデン・スパーク', desc: 'Option C +7%', fx: { opt: { C: 7 } } } },
    childs:   { name: 'チャイルズ',    tag: 'イングランドの守護者',   ident: { SHT: 0.85, SPD: 1.0, TEC: 0.95, INT: 1.1, PHY: 1.25 }, fav: 'A',
                passive: { name: '鉄壁の統率', desc: 'Option A +3%。練習HP消費 -1。', opt: { A: 3 }, hpCost: -1 }, sig: { name: 'イングランドの壁', desc: 'Option A +6% / 全選択肢 +2%', fx: { opt: { A: 6 }, all: 2 } } },
    bello:    { name: 'ベロ',          tag: 'ナイジェリアの疾風',     ident: { SHT: 1.0, SPD: 1.3, TEC: 0.95, INT: 0.85, PHY: 1.05 }, fav: 'C',
                passive: { name: '疾風の一撃', desc: 'Option C +4%。', opt: { C: 4 } }, sig: { name: 'ベロのスプリント', desc: 'Option C +8%', fx: { opt: { C: 8 } } } },
  };

  /* 育成方針：各編の冒頭で選択。編の間だけ成長補正に加算される（5回の育成それぞれに方針を持たせる） */
  var POLICIES = [
    { id: 'shoot',   name: '決定力特化', desc: 'SHT・PHY 成長 +12%、他 −4%。Option A の伸びが速い。', growth: { SHT: 0.12, PHY: 0.12, SPD: -0.04, TEC: -0.04, INT: -0.04 } },
    { id: 'tactic',  name: '戦術特化',   desc: 'INT・TEC 成長 +12%、他 −4%。Option B／D と早期のメタビジョン解放向き。', growth: { INT: 0.12, TEC: 0.12, SHT: -0.04, SPD: -0.04, PHY: -0.04 } },
    { id: 'speed',   name: '快速特化',   desc: 'SPD・INT 成長 +12%、他 −4%。Option C と年俸（スピード系スキル）向き。', growth: { SPD: 0.12, INT: 0.12, SHT: -0.04, TEC: -0.04, PHY: -0.04 } },
    { id: 'balance', name: 'バランス',   desc: '全属性 成長 +4%。合計ステータスの足切りに強い。', growth: { SHT: 0.04, SPD: 0.04, TEC: 0.04, INT: 0.04, PHY: 0.04 } }
  ];
  /* エゴ・ピース：所持済みカードの再排出（限界突破）時に段階に応じて獲得。交換所で任意のカードと交換できる（PWC のピース／星上げに対応する救済） */
  var PIECES = { gain: { '1': 2, '2': 3, '3': 5, '4': 10, '5': 20, '6': 40, '7': 80, '8': 150 }, cost: { '1': 30, '2': 50, '3': 90, '4': 200, '5': 400, '6': 800, '7': 1600, '8': 3200 },
                 starUp: { '2': 60, '3': 150, '4': 400, '5': 900, '6': 1800, '7': 3600, '8': 7200 } }; /* starUp: その段階へ星上げする費用（ピース） */
  /* 編末ランク：合計ステータス ÷ 編基準値 */
  var PART_RANKS = [{ r: 3.0, k: 'SS' }, { r: 2.2, k: 'S' }, { r: 1.6, k: 'A' }, { r: 1.2, k: 'B' }, { r: 0.9, k: 'C' }, { r: 0, k: 'D' }];

  /* ポジション適性：カード第1ポジションに応じて対応する選択肢に +2%（PWC のポジション情報を反映） */
  var POS_AFFINITY = { CF: 'A', CB: 'A', OMF: 'B', RMF: 'B', LMF: 'B', DMF: 'D', RWG: 'C', LWG: 'C', RSB: 'C', LSB: 'C' };

  /* ---------------------------------------------------------- アドバイザー
   * PWC の「アドバイザーキャラ」枠に対応。RUN 開始時に 1 名を選択。unlock: 解放条件（実績ID）
   */
  var ADVISORS = [
    { id: 'ego',    name: '絵心甚八',       card: '”青い監獄”のイカれた指導者', desc: 'スキル覚醒閾値 ×0.9。除籍時の補償ジェム ×1.5。', fx: { thMult: 0.9, elimGemMult: 1.5 }, unlock: null },
    { id: 'anri',   name: '帝襟アンリ',     card: '新しい夢を見る瞬間',           desc: '練習HP消費 -2。休養回復 +5。',                 fx: { hpCost: -2, restBonus: 5 }, unlock: null },
    { id: 'noa',    name: 'ノエル・ノア',   card: '世界を魅せる英雄選手',         desc: '全選択肢 +3%。',                               fx: { all: 3 }, unlock: 'pass_u20' },
    { id: 'sae',    name: '糸師冴',         card: 'お前のエゴが欲しい',           desc: 'Option B +4%。TEC 成長 +10%。',                fx: { opt: { B: 4 }, growth: { TEC: 0.10 } }, unlock: 'pass_second' },
    { id: 'mitoma', name: '三笘薫',         card: '走り続ける薫風',               desc: 'Option C +4%。SPD 成長 +10%。',                fx: { opt: { C: 4 }, growth: { SPD: 0.10 } }, unlock: 'runs_10' },
    { id: 'loki',   name: 'ジュリアン・ロキ', card: '同世代の超新星',             desc: 'FLOW 突入率 +8%。FLOW 成功時 年俸 ×1.3。',     fx: { flowP: 0.08, flowBidMult: 1.3 }, unlock: 'pass_nel' },
    { id: 'furan',  name: '不乱蔦宏俊',     card: '拝金主義の銭ゲバ狸',           desc: 'Cash 報酬 ×1.5。購買部価格 ×0.85。',           fx: { cashMult: 1.5, priceMult: 0.85 }, unlock: 'bid_1oku' }
  ];

  /* ------------------------------------------------------------------ スキル
   * 汎用スキル（5系統×5段階）。所持数に上限は無く同一スキルは Lv として重複。
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
    A: { key: 'A', name: '強引なフィジカル・フィニッシュ', stats: ['SHT', 'PHY'], color: '#ff4d4d', flavor: 'DFを背負ったまま体を捻じ込み、力づくでゴールをこじ開ける。' },
    B: { key: 'B', name: '戦術的な崩しとインサイド突破', stats: ['INT', 'TEC'], color: '#7cff6b', flavor: '味方を囮に使い、DFの重心をずらしてインサイドを切り裂く。' },
    C: { key: 'C', name: '超速の裏抜けとスプリント', stats: ['SPD', 'INT'], color: '#4dd2ff', flavor: 'DFラインの一瞬の隙を読み、誰よりも速く裏へ抜け出す。' },
    D: { key: 'D', name: 'メタビジョン', stats: ['INT', 'TEC'], color: '#c58bff', flavor: 'フィールド全体を俯瞰し、存在しなかった「勝ち筋」を創り出す。' }
  };

  /* ------------------------------------------------------------------ 購買部 */
  var ITEMS = [
    { id: 'capsule', name: '高濃度酸素カプセル', price: 40000, desc: 'HPを即座に100%まで全回復。', icon: '💊' },
    { id: 'protein', name: '特製プロテイン',     price: 35000, desc: '次の練習1回に限り、ステータス獲得量を2倍。', icon: '🥤' },
    { id: 'note',    name: '戦術アナライズノート', price: 90000, desc: '次の試合における全選択肢の成功率に+10%。', icon: '📓' }
  ];

  /* ------------------------------------------------------ コンディション */
  var CONDITIONS = {
    great:  { label: '絶好調', icon: '🔥', mult: 1.15, hpCost: -1, color: '#ff8c1c' },
    good:   { label: '好調',   icon: '😀', mult: 1.05, hpCost: 0,  color: '#3ddc84' },
    normal: { label: '普通',   icon: '😐', mult: 1.00, hpCost: 0,  color: '#9aa4b2' },
    bad:    { label: '不調',   icon: '😩', mult: 0.85, hpCost: 2,  color: '#ff2a4a' }
  };
  var COND_ORDER = ['bad', 'normal', 'good', 'great'];

  /* ------------------------------------------------------- 突発化学反応イベント */
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
    { id: 'ev_kunigami', rival: 'kunigami', title: '國神錬介「ヒーローになるんだ」',
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
    { id: 'ev_kaiser', rival: null, title: 'ミヒャエル・カイザー「皇帝の前に跪け」',
      text: '青い薔薇のタトゥーを見せつけるようにカイザーが立つ。「格の違いを教えてやる」',
      choices: [
        { label: 'シュート勝負を挑む', fx: { roll: { p: 0.3, win: { stat: { SHT: 2.0 } }, lose: { stat: { SHT: 0.4 }, hp: -15 },
                  winText: 'カイザーインパクトを超える一撃。皇帝が初めて表情を変えた。', loseText: '圧倒的な格差。「これが皇帝だ」' } } },
        { label: '戦術を盗む', fx: { stat: { INT: 0.8 } }, result: '皇帝の駆け引きを分析。戦術眼が向上した。' } ] },
    { id: 'ev_reo', rival: 'reo', title: '御影玲王「金なら出す」',
      text: '玲王が札束を見せつける。「オレの実験に付き合え。悪いようにはしない」',
      choices: [
        { label: '契約を受ける', fx: { cashPerArc: 20000, bidPerArc: 200000 }, result: 'Cash と年俸評価がわずかに上昇した。' },
        { label: '断る', fx: { stat: { INT: 0.3, PHY: 0.3 } }, result: '「金で買えないものもある」。自分を貫いた。' } ] },
    { id: 'ev_condition', rival: null, title: '異常なコンディション低下',
      text: '朝、身体が鉛のように重い。疲労が蓄積している。',
      choices: [
        { label: '無理を押して練習を続ける', fx: { trained: 0.8, hp: -15, cond: -1 }, result: '限界を超えて追い込んだ。だが肉体はさらに消耗した。' },
        { label: '早めに切り上げる', fx: { hp: 8, cond: 1 }, result: 'コンディション管理を優先。少し回復した。' } ] },
    { id: 'ev_supply', rival: null, title: '購買部の特別支給',
      text: '「今日だけ特別だ」——スタッフが試供品を差し出す。',
      choices: [
        { label: '特製プロテインを受け取る', fx: { protein: true }, result: '次の練習1回の獲得量が2倍になる。' },
        { label: '現金化する', fx: { cashPerArc: 12000 }, result: 'Cash を獲得した。' } ] },
    { id: 'ev_hiori', rival: 'hiori', title: '氷織羊「…お前は、何のために蹴る？」',
      text: '氷織が静かに問いかける。「オレは、まだ答えを探してる」',
      choices: [
        { label: '真剣に対話する', fx: { stat: { INT: 1.0 } }, result: '互いのプレー哲学を語り合い、空間の見え方が変わった。' },
        { label: 'パス練習に付き合う', fx: { stat: { TEC: 0.6, INT: 0.3 } }, result: '氷織の正確なパスを受け続け、技術が向上した。' } ] },
    { id: 'ev_otoya', rival: 'otoya', title: '乙夜影汰「忍術、見せてやるよ」',
      text: '乙夜が気配を消して背後に立っていた。「DFの死角ってさ、こうやって入るんだ」',
      choices: [
        { label: '裏抜けの間合いを教わる', fx: { stat: { SPD: 1.0, INT: 0.4 } }, result: '一瞬で消える動き出しのコツを掴んだ。俊敏性が向上。' },
        { label: '飛び道具の練習に付き合う', fx: { stat: { SHT: 0.7, SPD: 0.3 } }, result: '乙夜の強烈なミドルを研究。決定力が向上。' } ] },
    { id: 'ev_karasu', rival: 'karasu', title: '烏旅人「お前の弱点、教えてやろうか」',
      text: '烏がニヤリと笑う。「弱点がないなら、創るまでだ」',
      choices: [
        { label: '弱点を指摘してもらう', fx: { weakest: 1.2 }, result: '最も低い能力を徹底的に鍛え直した。' },
        { label: '逆に烏の弱点を探す', fx: { stat: { INT: 0.8 } }, result: '烏の狙いを読み切る訓練になった。戦術眼が向上。' } ] },
    { id: 'ev_yukimiya', rival: 'yukimiya', title: '雪宮剣優「1on1、付き合え」',
      text: '雪宮が眼鏡を外す。「一瞬に見出す極限——それがオレのサッカーだ」',
      choices: [
        { label: '1on1を受ける', fx: { roll: { p: 0.45, win: { stat: { SHT: 1.2, TEC: 0.8 } }, lose: { stat: { TEC: 0.4 }, hp: -8 },
                  winText: '雪宮のフェイントを見切り、抜き去った。決定力と技術が向上。', loseText: '一瞬で置き去りにされた。「まだ見えてないな」' } } },
        { label: 'シュートフォームを研究', fx: { stat: { SHT: 0.7 } }, result: '雪宮のストリート仕込みのシュートを解析。決定力が向上。' } ] },
    { id: 'ev_kurona', rival: 'kurona', title: '黒名蘭世「シャーク、参上ッス」',
      text: '黒名が小柄な体でボールを奪いに来る。「速さなら負けないッスよ」',
      choices: [
        { label: 'スピード勝負', fx: { stat: { SPD: 1.0 }, hp: -6 }, result: '黒名の初速に食らいついた。俊敏性が向上。' },
        { label: 'ボール奪取の技を教わる', fx: { stat: { TEC: 0.6, PHY: 0.4 } }, result: '奪い方の駆け引きを学んだ。' } ] },
    { id: 'ev_aiku', rival: 'aiku', title: 'オリヴァ・愛空「間合い、見せてやるよ」',
      text: '愛空が余裕の笑みでポジションを取る。「オレの間合いに入った瞬間、終わりだ」',
      choices: [
        { label: '間合いを破る練習', fx: { stat: { INT: 1.0, SPD: 0.3 } }, result: '世界基準のDFの間合いを体で覚えた。戦術眼が向上。' },
        { label: '守備の駆け引きを教わる', fx: { stat: { PHY: 0.6, INT: 0.4 } }, result: '体の使い方を学び、肉体が強化された。' } ] },
    { id: 'ev_sendou', rival: 'sendou', title: '閃堂秋人「エースの意地、見せてやる」',
      text: '閃堂が真剣な表情で言う。「世界標準ってやつを教えてやる」',
      choices: [
        { label: 'ヘディング合戦', fx: { stat: { PHY: 1.0, SHT: 0.4 }, hp: -8 }, result: '空中戦で競り合い続けた。肉体と決定力が向上。' },
        { label: 'エースの心構えを聞く', fx: { stat: { INT: 0.5 }, cond: 1 }, result: '「欲望を隠すな」。心が整った。' } ] },
    { id: 'ev_niko', rival: 'niko', title: '二子一揮「影から、全部見えてる」',
      text: '二子が静かに近づく。「お前の癖、もう分かった」',
      choices: [
        { label: '戦術ボードで議論する', fx: { stat: { INT: 1.1 } }, result: '二子の支配的な戦術眼に触れ、視野が広がった。' },
        { label: '癖を矯正する', fx: { allStat: 0.2 }, result: '二子の指摘をもとに動きの無駄を削った。' } ] },
    { id: 'ev_aryu', rival: 'aryu', title: '蟻生十兵衛「オシャじゃない…」',
      text: '蟻生が髪をかき上げる。「オシャなプレーで勝つ。それ以外はノンオシャ」',
      choices: [
        { label: '空中戦を挑む', fx: { roll: { p: 0.4, win: { stat: { PHY: 1.5 } }, lose: { stat: { PHY: 0.4 }, hp: -10 },
                  winText: '反則級の身体能力に競り勝った！肉体が大幅に向上。', loseText: '「ノンオシャ」。完全に競り負けた。' } } },
        { label: 'ヘディングフォームを観察', fx: { stat: { PHY: 0.5, INT: 0.3 } }, result: '跳躍のタイミングを学んだ。' } ] },
    { id: 'ev_tokimitsu', rival: 'tokimitsu', title: '時光青志「オレ…また失敗するかも…」',
      text: '時光がネガティブに呟きながらも、圧倒的なフィジカルで壁を作る。',
      choices: [
        { label: 'フィジカル勝負', fx: { stat: { PHY: 1.2 }, hp: -10 }, result: 'モンスター級の体幹に押し込まれ続けた。肉体が向上。' },
        { label: '励ます', fx: { stat: { INT: 0.3 }, cond: 1 }, result: '「…ありがとう」。時光の笑顔に、少し心が軽くなった。' } ] },
    { id: 'ev_mitoma', rival: 'mitoma', title: '三笘薫「ドリブル、見てみる？」',
      text: '特別コーチとして現れた三笘が、静かにボールを運び始める。',
      choices: [
        { label: 'ドリブルのコツを教わる', fx: { stat: { SPD: 0.8, TEC: 0.8 } }, result: '電光石火の仕掛けを学んだ。俊敏性と技術が向上。' },
        { label: '1on1で挑む', fx: { roll: { p: 0.25, win: { stat: { SPD: 1.5, TEC: 1.0 } }, lose: { stat: { INT: 0.5 } },
                  winText: 'ワールドストライカーから一度だけボールを奪った。', loseText: '完全に抜かれた。だが、その動きは目に焼き付いた。' } } } ] },
    { id: 'ev_anri', rival: null, title: '帝襟アンリ「差し入れ、持ってきました」',
      text: 'アンリが弁当を差し出す。「無理しすぎないでくださいね」',
      choices: [
        { label: 'ありがたく受け取る', fx: { hp: 12, cond: 1 }, result: 'HPが回復し、コンディションも上向いた。' },
        { label: '練習後に食べる', fx: { trained: 0.4, hp: 5 }, result: '集中して練習を終え、その後に補給した。' } ] },
    { id: 'ev_ness', rival: null, title: 'ネス「カイザー様の邪魔をするな」',
      text: 'ネスが魔術のようなパスでボールを回す。「お前にパスを出す価値はない」',
      choices: [
        { label: 'パスコースを読み切る', fx: { stat: { INT: 0.8, TEC: 0.4 } }, result: 'ネスの魔術的なパスの軌道を解析した。' },
        { label: '無視して走り込む', fx: { stat: { SPD: 0.7 } }, result: '走り勝ってパスを引き出した。俊敏性が向上。' } ] },
    { id: 'ev_loki', rival: 'loki', title: 'ジュリアン・ロキ「マッハで行こうか」',
      text: '世界最速の男が笑う。「ついてこれる？」',
      choices: [
        { label: '全力でついていく', fx: { roll: { p: 0.3, win: { stat: { SPD: 1.8 } }, lose: { stat: { SPD: 0.5 }, hp: -12 },
                  winText: '一瞬だけロキと並んだ。俊敏性が跳ね上がった。', loseText: '影すら踏めなかった。だが脚は確実に速くなった。' } } },
        { label: '加速のフォームを観察', fx: { stat: { SPD: 0.6, INT: 0.4 } }, result: '神童の重心移動を解析した。' } ] }
,
    /* ---- v6 追加：一般イベント ---- */
    { id: 'ev_kira', rival: 'kira', title: '吉良涼介「U-18代表のエースだったのに…」',
      text: '入寮テストで脱落した吉良の名前が、掲示板から消されていく。残った者だけが次へ進む。',
      choices: [
        { label: '掲示板を見つめ、自分の名前を確かめる', fx: { stat: { INT: 0.6 }, cond: 1 }, result: '生き残っている事実が、覚悟に変わった。戦術眼が向上。' },
        { label: '目を逸らして練習に戻る', fx: { trained: 0.6 }, result: '感傷に浸る時間はない。練習の密度が上がった。' } ] },
    { id: 'ev_nanase', rival: 'nanase', title: '七星虹郎「教えてください、先輩！」',
      text: '七星が目を輝かせて駆け寄ってくる。「その動き、どうやってるんスか！？」',
      choices: [
        { label: '丁寧に教える', fx: { stat: { INT: 0.8, TEC: 0.3 } }, result: '人に説明することで、自分の動きが言語化された。戦術眼が向上。' },
        { label: '一緒に走る', fx: { stat: { SPD: 0.7 }, hp: -6 }, result: '七星の無尽蔵のスタミナに付き合わされた。俊敏性が向上。' } ] },
    { id: 'ev_igarashi', rival: 'igarashi', title: '五十嵐栗夢「俺、まだ生き残ってる！」',
      text: '五十嵐が泣きながら笑っている。「ギリギリでも、生き残ればいいんだよな…？」',
      choices: [
        { label: '生存戦略を語り合う', fx: { stat: { INT: 0.6 }, hp: 6 }, result: '「生き残ること」を最優先に考える視点が加わった。' },
        { label: '一緒にシュート練習', fx: { stat: { SHT: 0.7 } }, result: '五十嵐のトリッキーな崩しからのシュートを反復した。' } ] },
    { id: 'ev_gagamaru', rival: 'gagamaru', title: '我牙丸吟「暇だから遊ぼうぜ」',
      text: '我牙丸が四つん這いから跳ね起きる。「サッカーってさ、生き物とやるみたいで面白いよな」',
      choices: [
        { label: '野生の反応速度に付き合う', fx: { stat: { SPD: 0.6, PHY: 0.6 } }, result: '予測不能な動きへの反応が磨かれた。' },
        { label: 'GK役を頼んでシュート練習', fx: { stat: { SHT: 0.9 } }, result: '野生のセービングをこじ開け続けた。決定力が向上。' } ] },
    { id: 'ev_kiyora', rival: 'kiyora', title: '清羅刃「バランスだよ」',
      text: '清羅がボールを軽く扱いながら言う。「何かに特化するより、全部できた方が生き残れる」',
      choices: [
        { label: '全体練習に付き合う', fx: { allStat: 0.25 }, result: '偏りのない動きが身についた。' },
        { label: '一番低い能力を集中的に鍛える', fx: { weakest: 1.0 }, result: '弱点が底上げされた。' } ] },
    { id: 'ev_zantetsu', rival: 'zantetsu', title: '剣城斬鉄「日本語、ムズカシイ」',
      text: '剣城が真顔で言う。「ボールは…蹴る。それだけ、分かればいい」',
      choices: [
        { label: '単純明快な理論に乗る', fx: { stat: { SHT: 0.6, PHY: 0.5 } }, result: '余計な思考を捨てた。身体が軽くなった。' },
        { label: '会話を試みる', fx: { stat: { INT: 0.3 }, cond: 1 }, result: '噛み合わない会話に、なぜか笑いが漏れた。' } ] },
    { id: 'ev_naruhaya', rival: 'naruhaya', title: '成早朝日「ちゃんと名前で呼べよ」',
      text: '成早が食ってかかる。「俺だってエゴくらい持ってる！」',
      choices: [
        { label: '1on1で相手をする', fx: { stat: { TEC: 0.6, SPD: 0.4 } }, result: '成早の粘り強い守備を崩し続けた。' },
        { label: '名前で呼んで謝る', fx: { cond: 1, hp: 4 }, result: '「…分かればいいんだよ」。空気が和らいだ。' } ] },
    { id: 'ev_okawa', rival: 'okawa', title: '大川響鬼「勝つのは俺だ」',
      text: '大川が拳を握る。「二子の戦術より、俺の突破の方が上だ」',
      choices: [
        { label: '突破合戦', fx: { stat: { SPD: 0.8, PHY: 0.3 }, hp: -6 }, result: '大川の突進をかわし続けた。' },
        { label: '二子の戦術を一緒に分析', fx: { stat: { INT: 0.8 } }, result: '支配的戦術の穴を見つける訓練になった。' } ] },
    { id: 'ev_lorenzo', rival: 'lorenzo', arcs: ['nel', 'wc'], title: 'ドン・ロレンツォ「殺しにいく」',
      text: '世界最高峰のDFが目の前に立つ。「ここから先は、一歩も通さない」',
      choices: [
        { label: '正面から突破を試みる', fx: { roll: { p: 0.3, win: { stat: { TEC: 1.6, PHY: 0.6 } }, lose: { hp: -18, stat: { PHY: 0.3 } },
                  winText: 'ロレンツォを一度だけ抜いた。世界基準の守備を破る感覚を掴んだ。', loseText: '完全に潰された。「甘い」' } } },
        { label: '守備の間合いを学ぶ', fx: { stat: { INT: 0.8, PHY: 0.3 } }, result: '世界最高のDFの狙いを読み解いた。' } ] },
    { id: 'ev_chevalier', rival: 'chevalier', arcs: ['nel', 'wc'], title: 'シャルル・シュヴァリエ「ヒーローになるんだ」',
      text: 'フランスの新星が、澄んだ目で言う。「オレは誰かのために蹴る」',
      choices: [
        { label: 'ヒーロー論を語り合う', fx: { stat: { INT: 0.6, SHT: 0.4 }, cond: 1 }, result: '自分のエゴを再確認した。' },
        { label: 'シュート練習に付き合う', fx: { stat: { SHT: 1.0 } }, result: 'シュヴァリエの正確無比なシュートを研究した。' } ] },
    { id: 'ev_snuffy', rival: 'snuffy', arcs: ['nel', 'wc'], title: 'マルク・スナッフィー「サッカーは足し算だ」',
      text: 'ユーヴァースのマスターが穏やかに語る。「才能に、正しい理論を足せ」',
      choices: [
        { label: '理論を叩き込まれる', fx: { stat: { INT: 1.0, SHT: 0.4 } }, result: '得点への最短距離を数式で理解した。' },
        { label: '実戦形式で試す', fx: { stat: { SHT: 0.8, TEC: 0.4 }, hp: -8 }, result: '理論を身体に落とし込んだ。' } ] },
    { id: 'ev_lavinho', rival: 'lavinho', arcs: ['nel', 'wc'], title: 'ラヴィーニョ「ボールと踊れ」',
      text: 'バルチャのマスターがリズムを刻む。「考えるな、感じろ。それがフットボールだ」',
      choices: [
        { label: 'リズム練習に付き合う', fx: { stat: { TEC: 1.2 } }, result: 'ボールタッチの引き出しが増えた。' },
        { label: '即興のドリブル勝負', fx: { roll: { p: 0.35, win: { stat: { TEC: 1.5, SPD: 0.6 } }, lose: { stat: { TEC: 0.4 }, hp: -8 },
                  winText: '一瞬だけリズムを合わせ、ラヴィーニョを抜いた。', loseText: '踊らされた。「まだ硬いな」' } } } ] },
    { id: 'ev_prince', rival: 'prince', arcs: ['nel', 'wc'], title: 'クリス・プリンス「見せてみろ」',
      text: 'マンシャインのマスターが腕を組む。「価値のあるプレーだけが、オレの目に残る」',
      choices: [
        { label: '全力の得点シーンを見せる', fx: { stat: { SHT: 0.8, SPD: 0.5 } }, result: 'プリンスが一瞬だけ頷いた。決定力が向上。' },
        { label: '値段交渉を持ちかける', fx: { bidPerArc: 300000 }, result: '「面白い」。年俸評価が上がった。' } ] },
    { id: 'ev_luna', rival: 'luna', arcs: ['nel', 'wc'], title: 'レオナルド・ルナ「スペインの技を見せてやる」',
      text: '流麗なボールタッチ。「ボールは友達、じゃない。ボールは自分の一部だ」',
      choices: [
        { label: 'タッチを真似る', fx: { stat: { TEC: 1.0, INT: 0.3 } }, result: 'ボールが足に吸い付く感覚を掴んだ。' },
        { label: 'ポゼッションを崩す練習', fx: { stat: { INT: 0.7, SPD: 0.4 } }, result: 'パス回しの穴を読む力が向上した。' } ] },
    { id: 'ev_honda', rival: 'honda', title: '本田圭佑「ゴール前で、何を考えとる？」',
      text: '特別ゲストが問いかける。「迷ったら、蹴れ。迷いが一番の敵や」',
      choices: [
        { label: '「決めることだけ」と答える', fx: { stat: { SHT: 0.8 }, cond: 1 }, result: '「ええ顔や」。決定力と心が整った。' },
        { label: 'メンタルの保ち方を聞く', fx: { hp: 10, cond: 1 }, result: '折れない心の作り方を学んだ。' } ] },
    { id: 'ev_video', rival: null, title: '分析ルームの映像研究',
      text: '深夜の分析ルーム。自分の失敗シーンが何度もリピートされる。',
      choices: [
        { label: '失敗を徹底的に言語化する', fx: { stat: { INT: 1.0 } }, result: '自分の癖と敵の狙いが見えた。戦術眼が向上。' },
        { label: '成功シーンだけ見て寝る', fx: { hp: 8, cond: 1 }, result: 'イメージを固めて眠った。' } ] },
    { id: 'ev_media', rival: null, title: '取材班の密着',
      text: 'カメラがこちらを追う。「あなたのエゴを一言で表すと？」',
      choices: [
        { label: '堂々と語る', fx: { bidPerArc: 200000, cond: 1 }, result: '注目度が上がり、年俸評価がわずかに上昇した。' },
        { label: '無視して練習', fx: { trained: 0.6 }, result: '雑音を遮断した。練習効率が上がった。' } ] },
    { id: 'ev_night', rival: null, title: '深夜の自主練',
      text: '消灯後、ボールを蹴る音が聞こえる。誰かがまだ練習している。',
      choices: [
        { label: '混ざって限界まで蹴る', fx: { roll: { p: 0.55, win: { trained: 1.2 }, lose: { hp: -14, cond: -1 },
                  winText: '静寂の中で集中が極まった。獲得量が跳ね上がった。', loseText: '寝不足で翌日の練習が崩れた。' } } },
        { label: '寝る', fx: { hp: 6 }, result: '回復を優先した。' } ] },
    { id: 'ev_rain', rival: null, title: '豪雨の練習',
      text: 'ピッチが水に沈む。ボールは止まり、脚は重い。',
      choices: [
        { label: 'フィジカルで押し切る', fx: { stat: { PHY: 1.0 }, hp: -8 }, result: '重いピッチで体幹が鍛えられた。' },
        { label: '浮き球の技術を磨く', fx: { stat: { TEC: 0.8 } }, result: '水たまりを避ける浮き球の精度が上がった。' } ] },
    { id: 'ev_scout', rival: null, title: 'スカウトの視察',
      text: 'スタンドにスーツの男たち。ノートに何かを書き込んでいる。',
      choices: [
        { label: '見せつける', fx: { roll: { p: 0.5, win: { bidPerArc: 400000 }, lose: { cond: -1 },
                  winText: 'スカウトの目が止まった。年俸評価が上がった。', loseText: '意識しすぎてプレーが硬くなった。' } } },
        { label: 'いつも通りやる', fx: { trained: 0.5 }, result: '普段どおりの練習を積んだ。' } ] },
    { id: 'ev_dorm', rival: null, title: '寮の食堂で',
      text: '今日のメニューは特盛り。栄養士が「食え」と皿を置く。',
      choices: [
        { label: '完食する', fx: { hp: 10, stat: { PHY: 0.3 } }, result: 'HP が回復し、体が重くなるほど食べた。' },
        { label: '半分残して走る', fx: { stat: { SPD: 0.4 }, hp: 3 }, result: '軽さを保った。' } ] },
    { id: 'ev_shoes', rival: null, title: '新しいスパイク',
      text: '購買部に新モデルが入荷した。「足に合えば化けるぞ」',
      choices: [
        { label: '買う（Cash 消費）', fx: { cashPerArc: -15000, stat: { SPD: 0.5, SHT: 0.5 } }, result: '足に馴染んだ。俊敏性と決定力が向上。' },
        { label: '今のスパイクで十分', fx: { stat: { TEC: 0.3 } }, result: '慣れた道具で技術を磨いた。' } ] },
    { id: 'ev_medical', rival: null, title: 'メディカルチェック',
      text: 'ドクターが眉をひそめる。「筋肉に張りがある。無理は禁物だ」',
      choices: [
        { label: '治療を受ける', fx: { hp: 15 }, result: '疲労が抜けた。' },
        { label: '「問題ない」と練習へ', fx: { trained: 0.7, hp: -6 }, result: '痛みを無視して追い込んだ。' } ] },
    { id: 'ev_teddy', rival: 'teddy', arcs: ['nel', 'wc'], title: 'テディ・ナイト「騎士の一撃」',
      text: 'イングランドの新星が、静かにゴールを見据える。「格が違うところを見せてやる」',
      choices: [
        { label: 'シュート勝負', fx: { roll: { p: 0.35, win: { stat: { SHT: 1.6 } }, lose: { stat: { SHT: 0.4 }, hp: -10 },
                  winText: '騎士の一撃を上回った。決定力が跳ね上がった。', loseText: '格の違いを見せつけられた。' } } },
        { label: '観察に徹する', fx: { stat: { INT: 0.7, SHT: 0.3 } }, result: '世界基準のシュート選択を学んだ。' } ] },
    { id: 'ev_onaji', rival: 'onaji', arcs: ['wc'], title: 'オナジ「ナイジェリアの獣」',
      text: '規格外の身体能力。「お前ら、細すぎる」',
      choices: [
        { label: 'フィジカル勝負', fx: { stat: { PHY: 1.2 }, hp: -10 }, result: '獣のような当たりに耐え続けた。' },
        { label: '駆け引きで抜く', fx: { stat: { INT: 0.6, TEC: 0.5 } }, result: '力ではなく技で抜く感覚を掴んだ。' } ] },
    { id: 'ev_hugo', rival: 'hugo', arcs: ['wc'], title: 'ユーゴー「フランスの壁」',
      text: 'フランス代表の巨漢が笑う。「ロキの前に、まずオレを抜いてみろ」',
      choices: [
        { label: '空中戦を挑む', fx: { stat: { PHY: 0.9, SHT: 0.3 } }, result: '空中戦の競り方が上達した。' },
        { label: '足元で勝負', fx: { stat: { TEC: 0.8 } }, result: '巨漢の足元をすり抜けた。' } ] },
    /* ---- v6 追加：原作ペアの化学反応イベント（相棒がペア相手のときだけ発生） ---- */
    { id: 'pv_isagi_bachira', pair: ['isagi', 'bachira'], title: '化学反応「怪物と空間認識」',
      text: '蜂楽のドリブルが視界の外から現れ、潔の視野がそれを拾う。二人の「見えている景色」が重なった。',
      choices: [
        { label: '即興のコンビネーションを極める', fx: { stat: { INT: 1.2, TEC: 1.0 } }, result: '互いの動きが読めるようになった。戦術眼と技術が大きく向上。' },
        { label: 'ゴール前の崩しに集中', fx: { stat: { SHT: 1.0, INT: 0.6 } }, result: '怪物の囮からの決定機を反復した。' } ] },
    { id: 'pv_isagi_nagi', pair: ['isagi', 'nagi'], title: '化学反応「天才と凡才」',
      text: '凪のトラップと潔の予測。「お前がそこにいるから、オレは蹴れる」',
      choices: [
        { label: '凪の感覚を言語化させる', fx: { stat: { TEC: 1.3, INT: 0.6 } }, result: '天才の感覚が理論になった。技術が大きく向上。' },
        { label: '潔の理論を凪に叩き込む', fx: { stat: { INT: 1.0, SHT: 0.8 } }, result: '凡才の積み上げが天才に伝わった。' } ] },
    { id: 'pv_nagi_reo', pair: ['nagi', 'reo'], title: '化学反応「相棒」',
      text: '玲王のパスが、凪の足元に寸分違わず届く。言葉はいらない。',
      choices: [
        { label: '阿吽の呼吸を磨く', fx: { stat: { TEC: 1.0, INT: 1.0 } }, result: '互いの位置を見ずに合わせられるようになった。' },
        { label: '玲王の資金で環境を整える', fx: { cashPerArc: 30000, stat: { TEC: 0.5 } }, result: 'Cash と技術が向上した。' } ] },
    { id: 'pv_chigiri_kunigami', pair: ['chigiri', 'kunigami'], title: '化学反応「神速とヒーロー」',
      text: '千切の裏抜けに、國神のロングボールが一直線に届く。',
      choices: [
        { label: 'ロングカウンターを反復', fx: { stat: { SPD: 1.3, PHY: 0.7 } }, result: '一撃で試合を決めるカウンターが形になった。' },
        { label: 'フィジカルとスピードの両立を鍛える', fx: { stat: { SPD: 0.8, PHY: 1.0 } }, result: '走力と当たり負けしない体が同時に育った。' } ] },
    { id: 'pv_rin_sae', pair: ['rin', 'sae'], title: '化学反応「糸師兄弟」',
      text: '冴の「壊す」蹴りと凛の「殺す」蹴り。血の繋がった二人のボールが、同じ軌道を描く。',
      choices: [
        { label: '兄弟のシュート練習に混ざる', fx: { roll: { p: 0.45, win: { stat: { SHT: 2.0, TEC: 1.0 } }, lose: { stat: { SHT: 0.6 }, hp: -12 },
                  winText: '世界最高峰の兄弟の蹴りを目に焼き付け、決定力が爆発した。', loseText: '「消えろ」。二人の視線に射抜かれた。' } } },
        { label: '二人の駆け引きを分析する', fx: { stat: { INT: 1.2, SHT: 0.5 } }, result: '天才同士の読み合いを解析した。' } ] },
    { id: 'pv_isagi_rin', pair: ['isagi', 'rin'], title: '化学反応「宿敵」',
      text: '凛が潔を見て舌打ちする。「お前がいると、オレの視界が広がるのが気に食わない」',
      choices: [
        { label: '互いの視野を奪い合う', fx: { stat: { INT: 1.4, SHT: 0.6 } }, result: 'メタビジョンの解像度が上がった。' },
        { label: 'ゴール前で競り合う', fx: { stat: { SHT: 1.2, PHY: 0.5 }, hp: -6 }, result: '最高のライバルと殴り合うように蹴り合った。' } ] },
    { id: 'pv_isagi_barou', pair: ['isagi', 'barou'], title: '化学反応「王様と奴隷」',
      text: '馬狼が潔を睨む。「お前の囮で、オレが決める。それだけだ」',
      choices: [
        { label: '王様のフィニッシュを引き出す', fx: { stat: { SHT: 1.3, PHY: 0.7 } }, result: '強引な突破からの決定力が育った。' },
        { label: '奴隷の反逆を練習する', fx: { stat: { INT: 1.0, SHT: 0.6 } }, result: '王様を利用して自分が決める形を作った。' } ] },
    { id: 'pv_rin_shidou', pair: ['rin', 'shidou'], title: '化学反応「相性最悪の最強」',
      text: '凛と士道が同時にゴール前へ突っ込む。憎み合う二人のシュートが、なぜか噛み合う。',
      choices: [
        { label: '二人の間に割って入る', fx: { stat: { SHT: 1.2, SPD: 1.0 }, hp: -10 }, result: '殺気の中で決定力と俊敏性が研ぎ澄まされた。' },
        { label: '距離を取って学ぶ', fx: { stat: { INT: 0.9, SHT: 0.5 } }, result: '狂気と冷静の両方を観察した。' } ] },
    { id: 'pv_aryu_tokimitsu', pair: ['aryu', 'tokimitsu'], title: '化学反応「オシャとネガティブ」',
      text: '蟻生の空中戦と時光の壁。「オシャに競れ」「無理かも…」',
      choices: [
        { label: '空中戦の反復', fx: { stat: { PHY: 1.6 }, hp: -8 }, result: '規格外の二人と競り続け、肉体が大幅に向上。' },
        { label: 'ポジショニングを学ぶ', fx: { stat: { INT: 0.8, PHY: 0.6 } }, result: '空中戦に入る前の位置取りを覚えた。' } ] },
    { id: 'pv_niko_bachira', pair: ['niko', 'bachira'], title: '化学反応「影と怪物」',
      text: '二子の支配的な戦術の上で、蜂楽の怪物が暴れ回る。',
      choices: [
        { label: '戦術と即興の両立を試す', fx: { stat: { INT: 1.2, TEC: 0.9 } }, result: '型と型破りを同時に扱えるようになった。' },
        { label: '二子の指示で動く', fx: { stat: { INT: 1.0 }, cond: 1 }, result: '考える負担が減り、集中が保てた。' } ] },
    { id: 'pv_yukimiya_hiori', pair: ['yukimiya', 'hiori'], title: '化学反応「一瞬と俯瞰」',
      text: '氷織の正確なパスが、雪宮の一瞬の閃きに合う。',
      choices: [
        { label: 'ワンタッチの崩しを磨く', fx: { stat: { TEC: 1.2, INT: 0.8 } }, result: '狭い局面を一瞬で崩す型ができた。' },
        { label: '1on1の練習相手になる', fx: { stat: { SHT: 0.9, TEC: 0.6 } }, result: '雪宮のフェイントを何度も見た。' } ] },
    { id: 'pv_karasu_otoya', pair: ['karasu', 'otoya'], title: '化学反応「烏と忍者」',
      text: '烏の読みと乙夜の消える動き。DFが何もできずに崩れていく。',
      choices: [
        { label: '死角への侵入を反復', fx: { stat: { SPD: 1.2, INT: 1.0 } }, result: '死角に入る動き出しを体で覚えた。' },
        { label: '烏の駆け引きを教わる', fx: { stat: { INT: 1.1, TEC: 0.5 } }, result: '弱点を作り出す狡猾さを学んだ。' } ] },
    { id: 'pv_kaiser_ness', pair: ['kaiser', 'ness'], title: '化学反応「皇帝と魔術師」',
      text: 'ネスの魔術的なパスが、カイザーの足元に寸分違わず届く。「跪け」',
      choices: [
        { label: '皇帝のフィニッシュを盗む', fx: { stat: { SHT: 1.6, TEC: 0.6 } }, result: 'カイザーインパクトの原理を理解した。' },
        { label: 'ネスのパスコースを読む', fx: { stat: { INT: 1.0, TEC: 0.8 } }, result: '魔術の種を見抜いた。' } ] },
    { id: 'pv_noa_isagi', pair: ['noa', 'isagi'], title: '化学反応「世界最高と目撃者」',
      text: 'ノアが潔を見て言う。「お前の目は、オレの動きを言語化できる」',
      choices: [
        { label: '世界最高の練習に付き合う', fx: { allStat: 0.5 }, result: '全能力が世界基準に引き上げられた。' },
        { label: '完全無欠の理論を聞く', fx: { stat: { INT: 1.2, SHT: 0.8 } }, result: 'ノアの「完璧」の定義を理解した。' } ] },
    { id: 'pv_kunigami_raichi', pair: ['kunigami', 'raichi'], title: '化学反応「ヒーローと気迫」',
      text: '國神の大砲と雷市の突進。泥臭い二人のゴール前。',
      choices: [
        { label: 'ゴール前の肉弾戦', fx: { stat: { PHY: 1.2, SHT: 0.8 }, hp: -8 }, result: '当たり負けしない決定力が育った。' },
        { label: 'ロングシュートを反復', fx: { stat: { SHT: 1.2 } }, result: '遠くから撃ち抜く自信がついた。' } ] },
    { id: 'pv_gagamaru_igarashi', pair: ['gagamaru', 'igarashi'], title: '化学反応「野生と生存本能」',
      text: '我牙丸の反射と五十嵐のしぶとさ。「生き残るためなら何でもやる」',
      choices: [
        { label: '反応速度の訓練', fx: { stat: { SPD: 1.1, PHY: 0.7 } }, result: '予測不能な状況への反応が磨かれた。' },
        { label: '生存戦略を練る', fx: { stat: { INT: 0.8 }, hp: 6 }, result: '無駄な消耗を避ける知恵がついた。' } ] },
    { id: 'pv_loki_chevalier', pair: ['loki', 'chevalier'], title: '化学反応「フランスの新星たち」',
      text: 'ロキの加速にシュヴァリエのパスが追いつく。世界最速の連携。',
      choices: [
        { label: '超高速のカウンターを反復', fx: { stat: { SPD: 1.4, TEC: 0.8 }, hp: -6 }, result: '世界最速の連携に食らいついた。' },
        { label: 'パスの精度を磨く', fx: { stat: { TEC: 1.1, INT: 0.6 } }, result: '走る味方に合わせる精度が上がった。' } ] },
    { id: 'pv_snuffy_barou', pair: ['snuffy', 'barou'], title: '化学反応「マスターと王様」',
      text: 'スナッフィーが馬狼に言う。「王様なら、王様のやり方で足し算をしろ」',
      choices: [
        { label: '王様の理論武装', fx: { stat: { SHT: 1.4, INT: 0.8 } }, result: '独善に理論が加わった。決定力と戦術眼が向上。' },
        { label: 'HUNTING BEASTの動きを学ぶ', fx: { stat: { SHT: 1.0, PHY: 1.0 } }, result: '狩る動きが身についた。' } ] },
    { id: 'pv_lavinho_nagi', pair: ['lavinho', 'nagi'], title: '化学反応「マスターと天才」',
      text: 'ラヴィーニョが凪に言う。「面倒くさがりのお前が、一番踊れる」',
      choices: [
        { label: 'リズムの中でトラップ', fx: { stat: { TEC: 1.8 } }, result: '重力を無視するトラップの精度が極まった。' },
        { label: '天才の「めんどくさい」を解剖', fx: { stat: { INT: 1.0, TEC: 0.6 } }, result: '省エネの最適解を学んだ。' } ] },
    { id: 'pv_prince_chigiri', pair: ['prince', 'chigiri'], title: '化学反応「マスターと神速」',
      text: 'プリンスが千切の走りを見て言う。「価値のある速さだ」',
      choices: [
        { label: '価値ある加速を磨く', fx: { stat: { SPD: 1.7 } }, result: '神速の切れ味が増した。' },
        { label: '裏抜けのタイミングを学ぶ', fx: { stat: { SPD: 1.0, INT: 0.8 } }, result: 'いつ走るかを体が覚えた。' } ] },
    { id: 'pv_kurona_yukimiya', pair: ['kurona', 'yukimiya'], title: '化学反応「シャークと一瞬」',
      text: '黒名の初速と雪宮の閃き。バスタードの若手が噛み合う。',
      choices: [
        { label: '高速の連携', fx: { stat: { SPD: 1.2, TEC: 0.8 } }, result: '速さと技術が同時に育った。' },
        { label: 'ボール奪取の練習', fx: { stat: { PHY: 0.7, TEC: 0.7 } }, result: '奪ってからの一撃が速くなった。' } ] },
    { id: 'pv_aiku_sendou', pair: ['aiku', 'sendou'], title: '化学反応「U-20の矛と盾」',
      text: '愛空の守備と閃堂の攻撃。日本代表の矛盾が、練習で火花を散らす。',
      choices: [
        { label: '矛盾の対決に混ざる', fx: { stat: { PHY: 1.2, INT: 0.8 }, hp: -8 }, result: '世界基準の攻守を体で学んだ。' },
        { label: '両者の間合いを分析', fx: { stat: { INT: 1.3 } }, result: '攻守の間合いの取り方が見えた。' } ] },
    { id: 'pv_teddy_achampong', pair: ['teddy', 'achampong'], title: '化学反応「イングランドの新世代」',
      text: 'テディの一撃とアチャンポンの突破。イングランドの矛が揃う。',
      choices: [
        { label: '世界の決定力に触れる', fx: { stat: { SHT: 1.4, PHY: 0.6 } }, result: '世界基準のフィニッシュを学んだ。' },
        { label: '突破の型を学ぶ', fx: { stat: { SPD: 0.9, TEC: 0.9 } }, result: '力強い突破が身についた。' } ] },
    { id: 'pv_mitoma_isagi', pair: ['mitoma', 'isagi'], title: '化学反応「ワールドストライカーの教え」',
      text: '三笘が潔の動きを見て言う。「見えているなら、あとは速さだ」',
      choices: [
        { label: 'ドリブルの初速を学ぶ', fx: { stat: { SPD: 1.3, TEC: 0.7 } }, result: '見えた景色に体が追いつくようになった。' },
        { label: '判断の速さを鍛える', fx: { stat: { INT: 1.2, SPD: 0.5 } }, result: '選択肢を選ぶ速度が上がった。' } ] }
  ];

  /* ------------------------------------------------------ 新英雄大戦 クラブ */
  var NEL_CLUBS = [
    { id: 'de', country: 'ドイツ', name: 'バスタード・ミュンヘン', flag: '🇩🇪', master: 'ノエル・ノア', stars: 'ミヒャエル・カイザー / アレクシス・ネス',
      bl: '潔世一・雪宮剣優・雷市陣吾・我牙丸吟・五十嵐栗夢・音留徹平・黒名蘭世・清羅刃・氷織羊・國神錬介（ワイルドカード）',
      passive: { desc: 'ノアの指導：全選択肢 +3%', all: 3 }, canon: '新英雄大戦 4戦全勝・優勝（対スペイン 3-2 / 対イングランド 3-2 / 対イタリア 3-2 / 対フランス 3-2）',
      profile: { A: 1.05, B: 1.05, C: 1.0, D: 1.0 }, order: ['es', 'en', 'it', 'fr'] },
    { id: 'en', country: 'イングランド', name: 'マンシャイン・シティ', flag: '🏴', master: 'クリス・プリンス', stars: 'クリス・プリンス',
      bl: '御影玲王・千切豹馬・凪誠士郎・仁王和真・劈大河・鰐間淳壱・皿斑海琉・柊零次・西岡初',
      passive: { desc: 'プリンスの指導：Option C +5%', opt: { C: 5 } }, canon: '新英雄大戦 0勝4敗・最下位（千切が全試合で得点）',
      profile: { A: 0.95, B: 0.95, C: 1.0, D: 0.95 }, order: ['de', 'fr', 'it', 'es'] },
    { id: 'it', country: 'イタリア', name: 'ユーヴァース', flag: '🇮🇹', master: 'マルク・スナッフィー', stars: 'ドン・ロレンツォ',
      bl: '馬狼照英・オリヴァ・愛空・蟻生十兵衛・二子一揮・閃堂秋人・不角源・田中信玄・志熊恭平・石狩幸雄',
      passive: { desc: 'スナッフィーの指導：Option A +5% / 年俸 ×1.05', opt: { A: 5 }, bidMult: 1.05 }, canon: '新英雄大戦 2勝2敗・3位（馬狼 5得点）',
      profile: { A: 1.12, B: 1.0, C: 0.98, D: 1.0 }, order: ['fr', 'es', 'de', 'en'] },
    { id: 'fr', country: 'フランス', name: 'P・X・G', flag: '🇫🇷', master: 'ジュリアン・ロキ', stars: 'ジュリアン・ロキ / シャルル・シュヴァリエ',
      bl: '糸師凛・烏旅人・時光青志・剣城斬鉄・七星虹郎・超健人・柚春彦・猿堂寺暁・士道龍聖',
      passive: { desc: 'ロキの指導：Option C +4% / SPD 成長 +10%', opt: { C: 4 }, growth: { SPD: 0.10 } }, canon: '新英雄大戦 3勝1敗・2位（糸師凛 得点王 7得点）',
      profile: { A: 1.0, B: 1.0, C: 1.1, D: 1.05 }, order: ['it', 'en', 'es', 'de'] },
    { id: 'es', country: 'スペイン', name: 'FCバルチャ', flag: '🇪🇸', master: 'ラヴィーニョ', stars: 'ラヴィーニョ',
      bl: '蜂楽廻・乙夜影汰・颯波留・蛇来弥勒・狐里輝・若月樹・曽倉哲・日不見愛基・灰地静',
      passive: { desc: 'ラヴィーニョの指導：Option B +5% / TEC 成長 +10%', opt: { B: 5 }, growth: { TEC: 0.10 } }, canon: '新英雄大戦 1勝3敗・4位（蜂楽 5得点）',
      profile: { A: 0.98, B: 1.1, C: 1.0, D: 1.0 }, order: ['de', 'it', 'fr', 'en'] }
  ];

  /* --------------------------------------------- FIFAワールドカップ（殿堂入り用・成人A代表 if）
   * PWC の各国代表カード（カバソス／シウバ／ブレイク／ルナ／ロキ）と NEL マスターを配した架空の世界決戦
   */
  var WORLD_CUP = {
    climaxes: 4,
    stages: [
      { id: 'r16', name: 'ラウンド16', team: 'アルゼンチン代表', flag: '🇦🇷', star: 'パブロ・カバソス', rateMult: { A: 1.00, B: 1.02, C: 1.00, D: 1.00 },
        intro: '世界屈指の攻撃陣。カバソスの閃きが中盤を支配し、守備は個の速さで潰しに来る。' },
      { id: 'qf',  name: '準々決勝',   team: 'ブラジル代表',     flag: '🇧🇷', star: 'ダダ・シウバ', rateMult: { A: 1.15, B: 1.12, C: 1.05, D: 1.08 },
        intro: '技術で世界を制する王国。重戦車ダダ・シウバが最終ラインに君臨する。' },
      { id: 'sf',  name: '準決勝',     team: 'イングランド代表', flag: '🏴', star: 'アダム・ブレイク / クリス・プリンス', rateMult: { A: 1.30, B: 1.18, C: 1.22, D: 1.15 },
        intro: '鉄壁のフィジカルとGGジャンキーの砲撃。力比べで勝てる相手ではない。' },
      { id: 'f',   name: '決勝',       team: 'フランス代表',     flag: '🇫🇷', star: 'ノエル・ノア / ジュリアン・ロキ', rateMult: { A: 1.42, B: 1.42, C: 1.40, D: 1.34 },
        intro: 'ノエル・ノア率いる最強軍団。全てにおいて完成された世界王者。ここを越えれば、真の世界一だ。' }
    ],
    highlights: [
      '前半15分。世界のスピードに戸惑うチーム。だが一瞬の隙をお前だけが見ている——。',
      '前半終了間際。敵の猛攻を凌ぎ、カウンターの狼煙が上がる——。',
      '後半20分。スタジアム全体がお前の名を呼ぶ。世界がお前を認め始めた——。',
      'ラストプレー。世界一の座まで、あと一撃——。'
    ]
  };

  /* ------------------------------------------------------------------ 実績 */
  var ACHIEVEMENTS = [
    { id: 'first_run',    name: '入寮',                 desc: '初めて育成を開始した',                       gems: 100 },
    { id: 'first_goal',   name: '初ゴール',             desc: '公式戦で初めてゴールを決めた',               gems: 100 },
    { id: 'first_skill',  name: 'アウェイケニング',     desc: '初めてスキルを覚醒させた',                   gems: 150 },
    { id: 'first_flow',   name: 'FLOW',                 desc: '初めて FLOW に突入した',                     gems: 200 },
    { id: 'first_sig',    name: 'エゴの目覚め',         desc: '固有覚醒スキルを初めて発現させた',           gems: 250 },
    { id: 'pass_entry',   name: '鬼ごっこ生還',         desc: '入寮テストを突破した',                       gems: 50 },
    { id: 'pass_first',   name: '一次選考突破',         desc: '一次選考を突破した',                         gems: 200 },
    { id: 'pass_second',  name: '二次選考突破',         desc: '二次選考を突破した（アドバイザー「糸師冴」解放）', gems: 300 },
    { id: 'pass_u20',     name: 'U-20日本代表撃破',     desc: '三次選考・U-20日本代表戦に勝利した（アドバイザー「ノエル・ノア」解放）', gems: 400 },
    { id: 'pass_nel',     name: '新英雄大戦 生存',      desc: '新英雄大戦の年俸足切りを突破した（アドバイザー「ジュリアン・ロキ」解放）', gems: 500 },
    { id: 'clear',        name: '世界一',               desc: 'U-20 W杯を制覇し殿堂入りした',               gems: 1000 },
    { id: 'wc_champion',  name: '真の世界一',           desc: 'FIFA ワールドカップで優勝した',               gems: 2000 },
    { id: 'bid_1oku',     name: '億の男',               desc: '年俸評価 1億円に到達した（アドバイザー「不乱蔦宏俊」解放）', gems: 300 },
    { id: 'stat_1000',    name: '青天井の入口',         desc: '合計ステータス 1,000 を超えた',               gems: 150 },
    { id: 'stat_10000',   name: '人外',                 desc: '合計ステータス 10,000 を超えた',              gems: 400 },
    { id: 'runs_10',      name: '10周目',               desc: '10 回目の育成を開始した（アドバイザー「三笘薫」解放）', gems: 300 },
    { id: 'elim_10',      name: '敗者の山',             desc: '10 回除籍された',                            gems: 300 },
    { id: 'injury',       name: '靭帯断裂',             desc: '危険水域での練習強行で選手生命を終えた',     gems: 100 },
    { id: 'cold',         name: 'コールド',             desc: 'コールド負けで試合を打ち切られた',            gems: 100 },
    { id: 'nomination',   name: '凛の指名',             desc: '二次選考4thステージで敗北しながら糸師凛に指名された', gems: 300 },
    { id: 'gacha_50',     name: 'スカウト50回',         desc: 'スカウトを累計 50 回行った',                  gems: 200 },
    { id: 'lb_10',        name: '完凸への道',           desc: '同一カードの限界突破が 10 に達した',          gems: 300 },
    { id: 'collect_50',   name: 'コレクター',           desc: '50 種類のカードを所持した',                   gems: 400 },
    { id: 'rank_1',       name: 'BLランキング1位',      desc: '青い監獄ランキング 1 位に到達した',           gems: 500 },
    { id: 'part_ss',      name: '編評価 SS',            desc: '編末ランクで SS を獲得した',                  gems: 300 },
    { id: 'exchange_1',   name: 'ピース交換',           desc: 'エゴ・ピースでカードを交換した',              gems: 100 },
    { id: 'five_parts',   name: '五編踏破',             desc: '第五編・決戦に到達した',                      gems: 400 },
    /* v6 */
    { id: 'grad_first',   name: '初卒業',               desc: '第一編を卒業し、選手を次の編へ持ち越した',   gems: 150 },
    { id: 'grad_4',       name: '決戦資格',             desc: '第四編を卒業した（決戦メンバー候補）',       gems: 400 },
    { id: 'grads_5',      name: '五人の卒業生',         desc: '育成済み選手が 5 名以上になった',            gems: 300 },
    { id: 'final_first',  name: '決戦出撃',             desc: '5 人の決戦メンバーで U-20 W杯に出撃した',    gems: 300 },
    { id: 'squad_clear',  name: '五人の世界一',         desc: '決戦メンバー 5 人で世界一を達成した',        gems: 1000 },
    { id: 'star_up',      name: '星上げ',               desc: 'エゴ・ピースでカードの段階を上げた',         gems: 200 },
    { id: 'upgrade_1',    name: 'エゴ強化',             desc: '永続強化を初めて購入した',                   gems: 100 },
    { id: 'upgrade_max',  name: '完全強化',             desc: 'いずれかの永続強化を最大 Lv にした',         gems: 500 },
    { id: 'mastery_5',    name: '熟練の証',             desc: 'いずれかのキャラの熟練度が Lv5 に達した',    gems: 300 },
    { id: 'chem_pair',    name: '原作の化学反応',       desc: '原作ペアの化学反応イベントが発生した',       gems: 150 },
    /* v7：ストーリー分岐 */
    { id: 'route_barou',  name: '王様と組む',           desc: '二次選考 3rd ステージで馬狼・成早と組んだ',   gems: 150 },
    { id: 'route_chigiri',name: '旧友と組む',           desc: '二次選考 3rd ステージで千切・國神と組んだ',   gems: 150 },
    { id: 'choices_10',   name: 'エゴの選択',           desc: 'ストーリーの分岐を 10 回選んだ',              gems: 200 },
    { id: 'gamble_win',   name: '賭けに勝つ',           desc: 'ストーリー分岐のギャンブルに成功した',        gems: 100 }
  ];


  /* ---------------------------------------------------- v6：永続強化（エゴ強化）
   * Ego Gems で購入。Lv→Lv+1 の費用 = cost × (Lv+1)。RUN 開始時にスナップショットされ、その RUN に適用される。
   */
  var UPGRADES = [
    { id: 'train_eff',  name: '練習理論',           icon: '📈', desc: '全属性の成長補正 +2%／Lv',                 max: 10, cost: 200, per: { growthAll: 0.02 } },
    { id: 'base_stat',  name: '入寮前トレーニング', icon: '🏃', desc: '第一編開始時の初期ステータス +2%／Lv',     max: 10, cost: 250, per: { baseStat: 0.02 } },
    { id: 'hp_rest',    name: '回復設備',           icon: '🛏', desc: '休養の HP 回復 +3／Lv',                    max: 5,  cost: 150, per: { restBonus: 3 } },
    { id: 'flow_p',     name: 'ゾーン誘導',         icon: '🌊', desc: 'FLOW 突入率 +1%／Lv',                      max: 5,  cost: 300, per: { flowP: 0.01 } },
    { id: 'awaken_th',  name: '覚醒理論',           icon: '💡', desc: 'スキル・固有覚醒の閾値 −2%／Lv',           max: 5,  cost: 250, per: { thMult: -0.02 } },
    { id: 'event_rate', name: '化学反応の場',       icon: '⚗', desc: '突発化学反応イベント率 +2%／Lv',           max: 5,  cost: 150, per: { eventRate: 0.02 } },
    { id: 'store_disc', name: '購買部コネ',         icon: '🏪', desc: '購買部の価格 −3%／Lv',                     max: 5,  cost: 100, per: { priceMult: -0.03 } },
    { id: 'bid_up',     name: '代理人契約',         icon: '📝', desc: '年俸（入札）評価 +3%／Lv',                 max: 5,  cost: 200, per: { bidMult: 0.03 } },
    { id: 'elim_gems',  name: '再起の契約',         icon: '💎', desc: '除籍時の補償ジェム +10%／Lv',              max: 5,  cost: 150, per: { elimGemMult: 0.10 } },
    { id: 'final_uses', name: '決戦の采配',         icon: '🧭', desc: '決戦で同じ選手を起用できる回数の上限 +1／Lv', max: 2, cost: 800, per: { finalUses: 1 } }
  ];
  /* 熟練度：キャラごとの累積 XP（編を卒業 +1、決戦制覇 +3）。Lv ごとに成長補正 +1%・初期値 +1% */
  var MASTERY_TH = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
  /* 原作ペアの化学反応：相棒（同行カード）がペア相手のとき、成長補正・選択肢補正とペア専用イベントが解放される */
  var CHEMISTRY = [
    { a: 'isagi',    b: 'bachira',   name: '怪物と空間認識',       fx: { growth: { INT: 0.04, TEC: 0.04 }, opt: { B: 2 } } },
    { a: 'isagi',    b: 'nagi',      name: '天才と凡才の共鳴',     fx: { growth: { TEC: 0.04, SHT: 0.04 }, opt: { A: 2 } } },
    { a: 'nagi',     b: 'reo',       name: '相棒',                 fx: { growth: { TEC: 0.04, INT: 0.04 }, opt: { B: 2 }, cashMult: 1.1 } },
    { a: 'chigiri',  b: 'kunigami',  name: '神速とヒーロー',       fx: { growth: { SPD: 0.04, PHY: 0.04 }, opt: { C: 2 } } },
    { a: 'rin',      b: 'sae',       name: '糸師兄弟',             fx: { growth: { SHT: 0.05, TEC: 0.05 }, opt: { A: 3 } } },
    { a: 'isagi',    b: 'rin',       name: '宿敵',                 fx: { growth: { INT: 0.04, SHT: 0.04 }, opt: { D: 2 } } },
    { a: 'isagi',    b: 'barou',     name: '王様と奴隷',           fx: { growth: { SHT: 0.04, PHY: 0.04 }, opt: { A: 2 } } },
    { a: 'rin',      b: 'shidou',    name: '相性最悪の最強',       fx: { growth: { SHT: 0.04, SPD: 0.04 }, all: 1 } },
    { a: 'aryu',     b: 'tokimitsu', name: 'オシャとネガティブ',   fx: { growth: { PHY: 0.06 }, opt: { A: 2 } } },
    { a: 'niko',     b: 'bachira',   name: '影と怪物',             fx: { growth: { INT: 0.04, TEC: 0.04 }, opt: { B: 2 } } },
    { a: 'yukimiya', b: 'hiori',     name: '一瞬と俯瞰',           fx: { growth: { TEC: 0.04, INT: 0.04 }, opt: { B: 2 } } },
    { a: 'karasu',   b: 'otoya',     name: '烏と忍者',             fx: { growth: { SPD: 0.04, INT: 0.04 }, opt: { C: 2 } } },
    { a: 'kaiser',   b: 'ness',      name: '皇帝と魔術師',         fx: { growth: { SHT: 0.05, TEC: 0.05 }, opt: { A: 3 } } },
    { a: 'noa',      b: 'isagi',     name: '世界最高と目撃者',     fx: { growth: { SHT: 0.02, SPD: 0.02, TEC: 0.02, INT: 0.02, PHY: 0.02 }, all: 1 } },
    { a: 'kunigami', b: 'raichi',    name: 'ヒーローと気迫',       fx: { growth: { PHY: 0.04, SHT: 0.04 }, opt: { A: 2 } } },
    { a: 'gagamaru', b: 'igarashi',  name: '野生と生存本能',       fx: { growth: { PHY: 0.04, SPD: 0.04 }, opt: { C: 2 } } },
    { a: 'loki',     b: 'chevalier', name: 'フランスの新星たち',   fx: { growth: { SPD: 0.04, TEC: 0.04 }, opt: { C: 2 } } },
    { a: 'snuffy',   b: 'barou',     name: 'マスターと王様',       fx: { growth: { SHT: 0.05, PHY: 0.05 }, opt: { A: 3 } } },
    { a: 'lavinho',  b: 'nagi',      name: 'マスターと天才',       fx: { growth: { TEC: 0.06 }, opt: { B: 3 } } },
    { a: 'prince',   b: 'chigiri',   name: 'マスターと神速',       fx: { growth: { SPD: 0.06 }, opt: { C: 3 } } },
    { a: 'kurona',   b: 'yukimiya',  name: 'シャークと一瞬',       fx: { growth: { SPD: 0.04, TEC: 0.04 }, opt: { C: 2 } } },
    { a: 'aiku',     b: 'sendou',    name: 'U-20の矛と盾',         fx: { growth: { PHY: 0.04, INT: 0.04 }, opt: { A: 2 } } },
    { a: 'teddy',    b: 'achampong', name: 'イングランドの新世代', fx: { growth: { SHT: 0.04, PHY: 0.04 }, opt: { A: 2 } } },
    { a: 'mitoma',   b: 'isagi',     name: 'ワールドストライカーの教え', fx: { growth: { SPD: 0.04, INT: 0.04 }, opt: { C: 2 } } }
  ];


  /* ------------------------------------------------ 生成アート用の外見（アニメ版の配色に準拠。未定義のキャラはIDから決定的に生成） */
  var LOOKS = {
    isagi: { hair: 'short', color: '#3a2e2a', eye: '#3b82f6' }, bachira: { hair: 'bob', color: '#141414', accent: '#f5d142', eye: '#f5c542' },
    chigiri: { hair: 'long', color: '#e0567f', eye: '#7c3aed' }, kunigami: { hair: 'short', color: '#e8863b', eye: '#f59e0b' },
    nagi: { hair: 'wavy', color: '#e9edf2', eye: '#9ca3af' }, reo: { hair: 'short', color: '#7c4dff', eye: '#a78bfa' },
    barou: { hair: 'spiky', color: '#232323', eye: '#22c55e' }, rin: { hair: 'bangs', color: '#1f2a44', eye: '#38bdf8' },
    sae: { hair: 'bangs', color: '#a83a3a', eye: '#2dd4bf' }, shidou: { hair: 'spiky', color: '#f0d36a', accent: '#f472b6', eye: '#f472b6' },
    raichi: { hair: 'spiky', color: '#f5c542', accent: '#2a2a2a', eye: '#f59e0b' }, gagamaru: { hair: 'buzz', color: '#2a2a2a', eye: '#a3e635' },
    igarashi: { hair: 'short', color: '#6b4f3a', eye: '#78716c' }, naruhaya: { hair: 'short', color: '#1a1a1a', eye: '#a3a3a3' },
    kira: { hair: 'wavy', color: '#8b5a2b', eye: '#60a5fa' }, kuon: { hair: 'short', color: '#333', eye: '#9ca3af' }, iemon: { hair: 'buzz', color: '#222', eye: '#9ca3af' },
    imamura: { hair: 'short', color: '#4b3a2f', eye: '#9ca3af' }, okawa: { hair: 'spiky', color: '#2a2a2a', eye: '#9ca3af' }, niko: { hair: 'bangs', color: '#111', eye: '#111' },
    wanima_j: { hair: 'short', color: '#c9a227', eye: '#eab308' }, wanima_k: { hair: 'short', color: '#c9a227', eye: '#eab308' },
    aryu: { hair: 'long', color: '#d8c9a8', eye: '#a16207' }, tokimitsu: { hair: 'short', color: '#1c1c1c', eye: '#9ca3af' },
    hiori: { hair: 'bob', color: '#a3bffa', eye: '#60a5fa' }, karasu: { hair: 'short', color: '#111', eye: '#111' }, yukimiya: { hair: 'wavy', color: '#f2d16b', eye: '#fbbf24' },
    kurona: { hair: 'bangs', color: '#1e1e2e', eye: '#ef4444' }, nanase: { hair: 'bob', color: '#d9d9d9', accent: '#1f2937', eye: '#22d3ee' },
    mitoma: { hair: 'short', color: '#111', eye: '#111' }, honda: { hair: 'short', color: '#111', eye: '#111' },
    loki: { hair: 'wavy', color: '#f1d27a', eye: '#22c55e' }, noa: { hair: 'short', color: '#2b1f17', eye: '#a3a3a3' }, ego_if: { hair: 'spiky', color: '#111', eye: '#111' },
    snuffy: { hair: 'short', color: '#9aa0a6', eye: '#9ca3af' }, lavinho: { hair: 'curly', color: '#2a1f1a', eye: '#a16207' }, prince: { hair: 'wavy', color: '#f2e6c9', eye: '#60a5fa' },
    kaiser: { hair: 'wavy', color: '#f5e6a3', accent: '#3b82f6', eye: '#3b82f6' }, ness: { hair: 'bob', color: '#a78bfa', eye: '#c084fc' }, lorenzo: { hair: 'long', color: '#111', eye: '#111' },
    achampong: { hair: 'buzz', color: '#111', skin: '#7a4a2a', eye: '#111' }, onaji: { hair: 'buzz', color: '#111', skin: '#5b3a21', eye: '#111' },
    kusso: { hair: 'short', color: '#111', skin: '#6b4226', eye: '#111' }, bello: { hair: 'spiky', color: '#111', skin: '#6b4226', eye: '#111' }
  };

  /* ------------------------------------------------------- 調整パラメータ */
  var PARAMS = {
    BASE_MAIN: 10,     COMP_MAIN: 0.006,
    BASE_SUB: 2,       COMP_SUB: 0.002,
    SKILL_STEP: 0.05,  SKILL_STACK_P: 0.35, /* 練習倍率 = 1 + 0.05×所持スキル数 / 同スキル重複覚醒率 */
    HP_COST: 15,       HP_COST_VAR: 2,
    REST_HEAL: 40,
    HP_EFF_TIRED: 0.5, HP_EFF_DANGER: 0.35,
    INJURY_P: 0.40,
    EVENT_RATE: 0.20,
    SIG_K: 6,          WALL: 0.7,
    FLOW_LO: 0.25,     FLOW_HI: 0.40,      FLOW_P: 0.25, FLOW_BONUS: 20,
    SKILL_BONUS_CAP: 25,
    NOTE_BONUS: 10,
    D_POWER_MULT: 1.0,
    LB_STEP: 0.05,     LB_GROWTH: 0.03,
    SIG_TH: 220,                            /* 固有覚醒：主属性がこの値以上で Climax 成功 → 覚醒 */
    GACHA_SINGLE: 150, GACHA_TEN: 1500,
    INITIAL_GEMS: 1500,
    BID_DOMINANCE: 0.25, GEMS_SURVIVE: 500, GEMS_CLEAR_BONUS: 2000, GEMS_ELIM_PER_ARC: 300,
    MVP_BID_MULT: 1.5, FLOW_BID_MULT: 1.2, BID_SKILL_STEP: 0.04,
    COND_DOWN_P: 0.15, COND_UP_P: 0.12, COND_REST_UP_P: 0.60,
    FLOW_CARD_P: 0.15, FLOW_CARD_BONUS: 5,   /* ★4FLOW 由来カード：FLOW 突入率 +15% / FLOW ボーナス +5pt */
    HOT_MULT: 1.25,                         /* 化学反応練習：週ごとに指定される1属性の主獲得量 ×1.25 */
    POS_BONUS: 2,                           /* ポジション適性 +2% */
    P_CAP: 92,                              /* Climax 成功率の上限(%)。最低保証は無いが、100% も無い（単発の試練は対象外） */
    /* v6 */
    STARUP_MAX: 3,                          /* 1 カードあたりの星上げ回数上限 */
    PIECES_GRAD: 10, PIECES_ELIM: 3,        /* 卒業／除籍で得るピース（× 編番号） */
    FINAL_SQUAD: 5, FINAL_USES: 4, FINAL_MIN_HEALTHY: 3, /* 決戦：5 人編成・同一選手の起用上限（全 18 局面）・故障で 3 人未満なら敗退 */
    PARTNER_GROWTH_BASE: 0.015, PARTNER_GROWTH_TIER: 0.005, /* 相棒：主属性の成長 +1.5% + 0.5%×段階 */
    MASTERY_GROWTH: 0.01, MASTERY_BASE: 0.01, MASTERY_XP_PART: 1, MASTERY_XP_FINAL: 3,
    FINAL_LOSS_KEEPS_GRADS: true            /* 決戦敗退時に卒業生を失わない（原作でも W杯敗退は除籍ではない） */
  };

  BL.DATA = {
    STATS: STATS, STAT_META: STAT_META, TYPE_MAP: TYPE_MAP, RARITY: RARITY, RARITY_ORDER: RARITY_ORDER,
    CHARACTERS: CHARACTERS, POS_AFFINITY: POS_AFFINITY, POLICIES: POLICIES, PIECES: PIECES, PART_RANKS: PART_RANKS, ADVISORS: ADVISORS, SKILLS: SKILLS, FAMILY_JP: FAMILY_JP, OPTIONS: OPTIONS,
    UPGRADES: UPGRADES, MASTERY_TH: MASTERY_TH, CHEMISTRY: CHEMISTRY, LOOKS: LOOKS,
    ITEMS: ITEMS, CONDITIONS: CONDITIONS, COND_ORDER: COND_ORDER, EVENTS: EVENTS, NEL_CLUBS: NEL_CLUBS,
    WORLD_CUP: WORLD_CUP, ACHIEVEMENTS: ACHIEVEMENTS, PARAMS: PARAMS,
    DISCLAIMER: '本ゲームは原作のブルーロックを忠実に再現した、『ブルーロックPWC』の改変版である',
    STARTER_CARD: { char: 'isagi', title: 'チームＺ' }  /* PWC ★1 潔世一【チームＺ】 */
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
