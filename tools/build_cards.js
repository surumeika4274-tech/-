#!/usr/bin/env node
/* data/pwc_cards.json（PWC 選手カード一覧）+ 改変版オリジナル → js/cards.js を生成（8段階レアリティ版）
 *   node tools/build_cards.js
 *
 * 8段階への割り当て：キャラごとの原作の「格」を (floor, peak) で定義し、PWC のレアリティで内挿する。
 *   t = { ★1:0, ★2:0.25, ★3:0.5, ★4:0.8, ★4FLOW:0.8, ★5:1 }
 *   tier = round(floor + t × (peak − floor))   ※ ★4FLOW は flow フラグ付き
 * 改変版オリジナル：PWC に選手カードが無いキャラを、ストーリー段階（若手／二次選考／新英雄大戦／マスター 等）ごとに複数個体生成する。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'pwc_cards.json'), 'utf8'));

const CHAR_ID = {
  '潔世一': 'isagi', '蜂楽廻': 'bachira', '千切豹馬': 'chigiri', '國神錬介': 'kunigami', '凪誠士郎': 'nagi', '御影玲王': 'reo',
  '馬狼照英': 'barou', '糸師凛': 'rin', '糸師冴': 'sae', '士道龍聖': 'shidou', '雷市陣吾': 'raichi', '我牙丸吟': 'gagamaru',
  '五十嵐栗夢': 'igarashi', '成早朝日': 'naruhaya', '吉良涼介': 'kira', '伊右衛門送人': 'iemon', '今村遊大': 'imamura', '久遠渉': 'kuon',
  '大川響鬼': 'okawa', '二子一揮': 'niko', '鰐間淳壱': 'wanima_j', '鰐間計助': 'wanima_k', '蟻生十兵衛': 'aryu', '時光青志': 'tokimitsu',
  '剣城斬鉄': 'zantetsu', '清羅刃': 'kiyora', '氷織羊': 'hiori', '烏旅人': 'karasu', '乙夜影汰': 'otoya', '雪宮剣優': 'yukimiya',
  '黒名蘭世': 'kurona', '七星虹郎': 'nanase', 'オリヴァ・愛空': 'aiku', '閃堂秋人': 'sendou', '三笘薫': 'mitoma', '本田圭佑': 'honda',
  'レオナルド・ルナ': 'luna', 'アダム・ブレイク': 'blake', 'ダダ・シウバ': 'dada', 'パブロ・カバソス': 'cavazos', 'ジュリアン・ロキ': 'loki'
};
/* 原作の格：[floor, peak]（★1相当の版 〜 最強版） */
const BAND = {
  isagi: [1, 7], bachira: [1, 6], chigiri: [1, 6], kunigami: [1, 6], nagi: [2, 6], reo: [2, 6], barou: [2, 6], rin: [3, 7], sae: [5, 7], shidou: [3, 7],
  raichi: [1, 5], gagamaru: [1, 5], igarashi: [1, 4], naruhaya: [1, 3], kira: [1, 4], iemon: [1, 3], imamura: [1, 3], kuon: [1, 3], okawa: [1, 3],
  niko: [1, 5], wanima_j: [1, 3], wanima_k: [1, 3], aryu: [2, 5], tokimitsu: [2, 5], zantetsu: [2, 5], kiyora: [3, 5], hiori: [3, 6], karasu: [3, 6],
  otoya: [3, 6], yukimiya: [3, 6], kurona: [4, 5], nanase: [3, 5], aiku: [4, 6], sendou: [4, 6], mitoma: [5, 7], honda: [5, 7],
  luna: [5, 7], blake: [5, 7], dada: [5, 7], cavazos: [5, 7], loki: [6, 8], childs: [4, 6], bello: [4, 6]
};
const T = { '1': 0, '2': 0.25, '3': 0.5, '4': 0.8, '4FLOW': 0.8, '5': 1 };

const cards = src.map(c => {
  const char = CHAR_ID[c.name]; if (!char) throw new Error('unknown character: ' + c.name);
  const [lo, hi] = BAND[char];
  const tier = Math.max(1, Math.min(8, Math.round(lo + T[c.rar] * (hi - lo))));
  return { char, title: c.title, rar: String(tier), flow: c.rar === '4FLOW', pwc: c.rar, type: c.type, pos: c.pos, origin: 'pwc' };
});

/* ------------------------------------------------ 改変版オリジナル（ストーリー段階ごとの複数個体） */
const O = (char, title, rar, type, pos, stage) => ({ char, title, rar: String(rar), flow: false, pwc: null, origin: 'mod', type, pos, stage });
const ORIGINAL = [
  /* 世界最強／マスター（若手時代 → 現役 → 指導者） */
  O('noa', '若き日のノア', 6, 'フィジカル', ['CF', 'OMF'], '若手時代'), O('noa', 'バスタードの規律', 7, '賢さ', ['CF', 'DMF'], '指導者'), O('noa', '世界最高のストライカー', 8, 'キック', ['CF', 'OMF'], '世界最強'),
  O('ego_if', '若き日の絵心', 6, 'キック', ['CF', 'OMF'], '若手時代'), O('ego_if', '現役if・青い監獄の設計者', 8, '賢さ', ['OMF', 'DMF'], '現役if'),
  O('snuffy', '現役時代の名将', 6, 'テクニック', ['DMF', 'OMF'], '現役時代'), O('snuffy', 'マスター・ユーヴァース', 7, '賢さ', ['DMF', 'CB'], 'マスター'),
  O('lavinho', 'ブラジルの遊び人', 6, 'スピード', ['LWG', 'RWG'], '現役時代'), O('lavinho', 'マスター・FCバルチャ', 7, 'テクニック', ['LWG', 'OMF'], 'マスター'),
  O('prince', 'マンシャインの王子', 6, 'スピード', ['RWG', 'CF'], '現役'), O('prince', 'マスター・マンシャイン', 7, 'キック', ['CF', 'RWG'], 'マスター'),
  /* 新世代世界11傑・バスタード／各クラブの看板 */
  O('kaiser', '青い薔薇', 5, 'テクニック', ['CF', 'LWG'], '新英雄大戦'), O('kaiser', '皇帝', 6, 'キック', ['CF', 'LWG'], '新英雄大戦'), O('kaiser', '世界11傑の皇帝', 7, 'キック', ['CF', 'OMF'], '世界11傑'),
  O('ness', 'カイザーの従者', 4, '賢さ', ['OMF', 'LMF'], '新英雄大戦'), O('ness', '皇帝の魔術師', 5, 'テクニック', ['OMF', 'LMF'], '新英雄大戦'),
  O('lorenzo', 'イタリアの守護者', 5, 'フィジカル', ['CB', 'DMF'], '新英雄大戦'), O('lorenzo', '守備の魔物', 6, 'フィジカル', ['CB', 'DMF'], '新英雄大戦'),
  O('chevalier', 'P・X・Gの騎士', 5, 'スピード', ['RWG', 'CF'], '新英雄大戦'), O('chevalier', '電光石火の騎士', 6, 'スピード', ['RWG', 'CF'], '新英雄大戦'), O('chevalier', 'フランス代表の刃', 7, 'キック', ['CF', 'RWG'], 'U-20 W杯'),
  /* 青い監獄組（二次選考 → 新英雄大戦） */
  O('otoru', '二次選考', 2, 'スピード', ['LWG', 'LMF'], '二次選考'), O('otoru', '新英雄大戦', 4, 'スピード', ['LWG', 'RWG'], '新英雄大戦'),
  O('nio', '二次選考', 2, 'フィジカル', ['CB', 'RSB'], '二次選考'), O('nio', 'U-20日本代表', 4, '賢さ', ['CB', 'DMF'], 'U-20日本代表'), O('nio', '新英雄大戦', 5, 'フィジカル', ['CB', 'DMF'], '新英雄大戦'),
  O('tsunzaki', '二次選考', 2, 'フィジカル', ['CF', 'CB'], '二次選考'), O('tsunzaki', '新英雄大戦', 4, 'フィジカル', ['CF', 'OMF'], '新英雄大戦'),
  O('saramadara', '二次選考', 2, 'コンディション', ['CB', 'DMF'], '二次選考'), O('saramadara', '新英雄大戦', 4, 'フィジカル', ['CB', 'DMF'], '新英雄大戦'),
  O('hiiragi', '二次選考', 2, 'テクニック', ['OMF', 'RMF'], '二次選考'), O('hiiragi', '新英雄大戦', 4, 'テクニック', ['OMF', 'DMF'], '新英雄大戦'),
  O('nishioka', '二次選考', 2, 'スピード', ['RWG', 'RSB'], '二次選考'), O('nishioka', '新英雄大戦', 4, 'スピード', ['RWG', 'RMF'], '新英雄大戦'),
  O('fukaku', '二次選考', 2, 'フィジカル', ['CB', 'CF'], '二次選考'), O('fukaku', '新英雄大戦', 4, 'スタミナ', ['CB', 'DMF'], '新英雄大戦'),
  O('tanaka', '二次選考', 2, '賢さ', ['DMF', 'OMF'], '二次選考'), O('tanaka', '新英雄大戦', 4, '賢さ', ['DMF', 'CB'], '新英雄大戦'),
  O('shiguma', '二次選考', 2, 'フィジカル', ['CB', 'LSB'], '二次選考'), O('shiguma', '新英雄大戦', 4, 'フィジカル', ['CB', 'CF'], '新英雄大戦'),
  O('ishikari', '二次選考', 2, 'キック', ['CF', 'RWG'], '二次選考'), O('ishikari', '新英雄大戦', 4, 'キック', ['CF', 'OMF'], '新英雄大戦'),
  O('chou', '二次選考', 2, 'スピード', ['RMF', 'RWG'], '二次選考'), O('chou', '新英雄大戦', 4, 'テクニック', ['RMF', 'OMF'], '新英雄大戦'),
  O('yuzu', '二次選考', 2, 'テクニック', ['LMF', 'OMF'], '二次選考'), O('yuzu', '新英雄大戦', 4, 'テクニック', ['LMF', 'DMF'], '新英雄大戦'),
  O('sendouji', '二次選考', 2, 'キック', ['CF', 'LWG'], '二次選考'), O('sendouji', '新英雄大戦', 4, 'フィジカル', ['CF', 'CB'], '新英雄大戦'),
  O('hayate', '二次選考', 2, 'スピード', ['LWG', 'LSB'], '二次選考'), O('hayate', '新英雄大戦', 4, 'スピード', ['LWG', 'RWG'], '新英雄大戦'),
  O('jarai', '二次選考', 2, 'テクニック', ['OMF', 'LMF'], '二次選考'), O('jarai', '新英雄大戦', 4, 'テクニック', ['OMF', 'CF'], '新英雄大戦'),
  O('kori', '二次選考', 2, '賢さ', ['RMF', 'OMF'], '二次選考'), O('kori', '新英雄大戦', 4, '賢さ', ['RMF', 'DMF'], '新英雄大戦'),
  O('wakatsuki', '二次選考', 2, 'スタミナ', ['CB', 'LSB'], '二次選考'), O('wakatsuki', '新英雄大戦', 4, 'フィジカル', ['CB', 'RSB'], '新英雄大戦'),
  O('sokura', '二次選考', 2, 'キック', ['CF', 'OMF'], '二次選考'), O('sokura', '新英雄大戦', 4, 'キック', ['CF', 'LWG'], '新英雄大戦'),
  O('himizu', '二次選考', 2, 'スピード', ['RSB', 'RWG'], '二次選考'), O('himizu', '新英雄大戦', 4, '賢さ', ['RSB', 'RMF'], '新英雄大戦'),
  O('haiji', '二次選考', 2, '賢さ', ['DMF', 'LMF'], '二次選考'), O('haiji', '新英雄大戦', 4, 'テクニック', ['DMF', 'OMF'], '新英雄大戦'),
  /* U-20 W杯 各国代表 */
  O('teddy', 'イングランドの新星', 5, 'キック', ['CF', 'LWG'], 'U-20 W杯'), O('teddy', '新世代世界11傑', 6, 'スピード', ['CF', 'RWG'], 'U-20 W杯'), O('teddy', '騎士の覚醒', 7, 'キック', ['CF', 'OMF'], 'U-20 W杯'),
  O('achampong', 'イングランドの司令塔', 4, '賢さ', ['OMF', 'DMF'], 'U-20 W杯'), O('achampong', '魔法の指揮者', 6, 'テクニック', ['OMF', 'RMF'], 'U-20 W杯'),
  O('onaji', 'ナイジェリアの猛獣', 4, 'フィジカル', ['CF', 'CB'], 'U-20 W杯'), O('onaji', '灼熱のエース', 6, 'キック', ['CF', 'RWG'], 'U-20 W杯'),
  O('kusso', 'ナイジェリアの頭脳', 4, '賢さ', ['OMF', 'DMF'], 'U-20 W杯'), O('kusso', 'クッソの魔術', 5, 'テクニック', ['OMF', 'LMF'], 'U-20 W杯'),
  O('hugo', 'フランスの巨躯', 4, 'フィジカル', ['CF', 'CB'], 'U-20 W杯'), O('hugo', 'フランス代表FW', 6, 'キック', ['CF', 'OMF'], 'U-20 W杯'),
  O('raiden', '雷光のサイド', 4, 'スピード', ['RSB', 'RWG'], 'U-20 W杯'), O('raiden', 'フランス代表DF', 5, 'フィジカル', ['RSB', 'CB'], 'U-20 W杯'),
  O('childs', 'イングランドの守護者', 4, 'フィジカル', ['CB', 'DMF'], 'U-20 W杯'), O('childs', '世界標準の壁', 6, 'フィジカル', ['CB', 'DMF'], 'U-20 W杯'),
  O('bello', 'ナイジェリアの疾風', 4, 'スピード', ['RWG', 'CF'], 'U-20 W杯'), O('bello', '灼熱のスプリンター', 5, 'スピード', ['LWG', 'CF'], 'U-20 W杯'),
  /* 決戦（U-20 W杯）の BL.JAPAN 個体 */
  O('isagi', 'BL.JAPANの心臓', 7, '賢さ', ['OMF', 'CF'], '決戦'), O('rin', '決戦の破壊者', 7, 'キック', ['CF', 'OMF'], '決戦'), O('bachira', 'W杯の怪物', 6, 'テクニック', ['OMF', 'LWG'], '決戦'),
  O('nagi', '天才の本気', 6, 'テクニック', ['CF', 'OMF'], '決戦'), O('chigiri', '世界に届く神速', 6, 'スピード', ['LWG', 'RWG'], '決戦'), O('kunigami', '蘇ったヒーロー', 5, 'フィジカル', ['CF', 'LWG'], '決戦'),
  O('reo', '万能の司令塔', 5, '賢さ', ['OMF', 'DMF'], '決戦'), O('barou', '王様の凱旋', 6, 'キック', ['CF', 'RWG'], '決戦'), O('shidou', '世界を喰う悪魔', 7, 'キック', ['CF', 'OMF'], '決戦'),
  O('karasu', '世界の弱点を読む', 6, '賢さ', ['DMF', 'OMF'], '決戦'), O('otoya', '忍術は世界に通じる', 6, 'スピード', ['RWG', 'LWG'], '決戦'), O('yukimiya', '一瞬の極限・世界', 6, 'テクニック', ['RWG', 'CF'], '決戦'),
  O('hiori', '氷の司令塔', 6, '賢さ', ['OMF', 'DMF'], '決戦'), O('aryu', 'オシャの頂点', 5, 'フィジカル', ['CB', 'CF'], '決戦'), O('niko', '世界の影', 5, '賢さ', ['DMF', 'OMF'], '決戦'),
  O('kurona', 'シャークの牙', 5, 'スピード', ['LWG', 'RWG'], '決戦'), O('nanase', '虹の躍動', 5, 'スタミナ', ['RMF', 'LMF'], '決戦'), O('kiyora', '境界線を越えて', 5, 'コンディション', ['OMF', 'RMF'], '決戦'),
  O('sae', '美しく壊す・決戦', 7, 'テクニック', ['OMF', 'DMF'], '決戦')
];
const all = cards.concat(ORIGINAL);
all.sort((a, b) => Number(b.rar) - Number(a.rar) || a.char.localeCompare(b.char) || a.title.localeCompare(b.title, 'ja'));
all.forEach((c, i) => { c.id = 'k' + String(i + 1).padStart(3, '0'); });

const lines = all.map(c => `  { id: '${c.id}', char: '${c.char}', title: ${JSON.stringify(c.title)}, rar: '${c.rar}', flow: ${c.flow}, pwc: ${JSON.stringify(c.pwc)}, origin: '${c.origin}', type: '${c.type}', pos: ${JSON.stringify(c.pos)}${c.stage ? ', stage: ' + JSON.stringify(c.stage) : ''} }`);
const out = `/* ============================================================================
 * 選手カード一覧（自動生成: tools/build_cards.js / 出典: data/pwc_cards.json + 改変版オリジナル）
 *  rar: '1'〜'8'（8段階） flow: ★4FLOW 由来  pwc: PWC でのレアリティ（null = 改変版オリジナル） stage: ストーリー段階（オリジナルのみ）
 *  type: PWC のタイプ（キック / スピード / テクニック / 賢さ / フィジカル / スタミナ / コンディション）
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  BL.CARDS = [
${lines.join(',\n')}
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'cards.js'), out);
const dist = {}; all.forEach(c => { dist[c.rar] = (dist[c.rar] || 0) + 1; });
console.log('cards:', all.length, 'chars:', new Set(all.map(c => c.char)).size, 'dist:', JSON.stringify(dist));
