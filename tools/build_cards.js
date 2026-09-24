#!/usr/bin/env node
/* data/pwc_cards.json（PWC 選手カード一覧）→ js/cards.js を生成（8段階レアリティ版）
 *   node tools/build_cards.js
 *
 * 8段階への割り当て：キャラごとの原作の「格」を (floor, peak) で定義し、PWC のレアリティで内挿する。
 *   t = { ★1:0, ★2:0.25, ★3:0.5, ★4:0.8, ★4FLOW:0.8, ★5:1 }
 *   tier = round(floor + t × (peak − floor))   ※ ★4FLOW は flow フラグ付き
 * PWC に選手カードが無い世界最強／マスター／世界11傑クラスは「改変版オリジナル」カードとして追加する。
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
  luna: [5, 7], blake: [5, 7], dada: [5, 7], cavazos: [5, 7], loki: [6, 8]
};
const T = { '1': 0, '2': 0.25, '3': 0.5, '4': 0.8, '4FLOW': 0.8, '5': 1 };

const cards = src.map(c => {
  const char = CHAR_ID[c.name]; if (!char) throw new Error('unknown character: ' + c.name);
  const [lo, hi] = BAND[char];
  const tier = Math.max(1, Math.min(8, Math.round(lo + T[c.rar] * (hi - lo))));
  return { char, title: c.title, rar: String(tier), flow: c.rar === '4FLOW', pwc: c.rar, type: c.type, pos: c.pos, origin: 'pwc' };
});
/* 改変版オリジナル（PWC に選手カードが無い上位クラス） */
const ORIGINAL = [
  { char: 'noa',       title: '世界最高のストライカー',   rar: '8', type: 'キック',     pos: ['CF', 'OMF'] },
  { char: 'ego_if',    title: '現役if・青い監獄の設計者', rar: '8', type: '賢さ',       pos: ['OMF', 'DMF'] },
  { char: 'snuffy',    title: 'マスター・ユーヴァース',   rar: '7', type: '賢さ',       pos: ['DMF', 'CB'] },
  { char: 'lavinho',   title: 'マスター・FCバルチャ',     rar: '7', type: 'テクニック', pos: ['LWG', 'OMF'] },
  { char: 'prince',    title: 'マスター・マンシャイン',   rar: '7', type: 'キック',     pos: ['CF', 'RWG'] },
  { char: 'kaiser',    title: '皇帝',                     rar: '6', type: 'キック',     pos: ['CF', 'LWG'] },
  { char: 'lorenzo',   title: '守備の魔物',               rar: '6', type: 'フィジカル', pos: ['CB', 'DMF'] },
  { char: 'chevalier', title: '電光石火の騎士',           rar: '6', type: 'スピード',   pos: ['RWG', 'CF'] },
  { char: 'ness',      title: '皇帝の魔術師',             rar: '5', type: 'テクニック', pos: ['OMF', 'LMF'] }
].map(c => Object.assign({ flow: false, pwc: null, origin: 'mod' }, c));
const all = cards.concat(ORIGINAL);
all.sort((a, b) => Number(b.rar) - Number(a.rar) || a.char.localeCompare(b.char) || a.title.localeCompare(b.title, 'ja'));
all.forEach((c, i) => { c.id = 'k' + String(i + 1).padStart(3, '0'); });

const lines = all.map(c => `  { id: '${c.id}', char: '${c.char}', title: ${JSON.stringify(c.title)}, rar: '${c.rar}', flow: ${c.flow}, pwc: ${JSON.stringify(c.pwc)}, origin: '${c.origin}', type: '${c.type}', pos: ${JSON.stringify(c.pos)} }`);
const out = `/* ============================================================================
 * 選手カード一覧（自動生成: tools/build_cards.js / 出典: data/pwc_cards.json + 改変版オリジナル）
 *  rar: '1'〜'8'（8段階） flow: ★4FLOW 由来  pwc: PWC でのレアリティ（null = 改変版オリジナル）
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
