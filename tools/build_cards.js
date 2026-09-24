#!/usr/bin/env node
/* data/pwc_cards.json（Game8「全キャラ一覧」から機械抽出した PWC 選手カード一覧）→ js/cards.js を生成
 *   node tools/build_cards.js
 * 各カード: id / char(キャラID) / title(カード名) / rar('1'|'2'|'3'|'4'|'4F'|'5') / type(PWCタイプ) / pos
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
const RAR = { '1': '1', '2': '2', '3': '3', '4': '4', '4FLOW': '4F', '5': '5' };
const order = { '5': 0, '4F': 1, '4': 2, '3': 3, '2': 4, '1': 5 };

const cards = src.map(c => {
  const char = CHAR_ID[c.name];
  if (!char) throw new Error('unknown character: ' + c.name);
  return { char, title: c.title, rar: RAR[c.rar], type: c.type, pos: c.pos };
});
cards.sort((a, b) => order[a.rar] - order[b.rar] || a.char.localeCompare(b.char) || a.title.localeCompare(b.title, 'ja'));
cards.forEach((c, i) => { c.id = 'c' + String(i + 1).padStart(3, '0'); });

const lines = cards.map(c => `  { id: '${c.id}', char: '${c.char}', title: ${JSON.stringify(c.title)}, rar: '${c.rar}', type: '${c.type}', pos: ${JSON.stringify(c.pos)} }`);
const out = `/* ============================================================================
 * PWC 選手カード一覧（自動生成: tools/build_cards.js / 出典: data/pwc_cards.json）
 *  rar: '1' | '2' | '3' | '4' | '4F'(★4 FLOW) | '5'
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
console.log('cards:', cards.length, 'chars:', new Set(cards.map(c => c.char)).size);
