#!/usr/bin/env node
/* assets/portraits/<charId|キャラ名>.(png|jpg|jpeg|webp|gif) → js/portraits.js（data URL マップ）
 *   node tools/build_portraits.js
 * 画像はリサイズしない（ブラウザ側で object-fit）。合計サイズが大きい場合は警告する。 */
'use strict';
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'js', 'data.js'));
const CH = globalThis.BL.DATA.CHARACTERS;
const dir = path.join(root, 'assets', 'portraits');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
function charIdOf(base) {
  if (CH[base]) return base;
  const norm = base.replace(/[・ ]/g, '');
  for (const id in CH) if (CH[id].name === base || CH[id].name.replace(/[・ ]/g, '') === norm) return id;
  return null;
}
const map = {}; let total = 0; const skipped = [];
if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).sort()) {
  const ext = path.extname(f).toLowerCase(); if (!MIME[ext]) continue;
  const id = charIdOf(path.basename(f, ext)); if (!id) { skipped.push(f); continue; }
  const buf = fs.readFileSync(path.join(dir, f)); total += buf.length;
  map[id] = 'data:' + MIME[ext] + ';base64,' + buf.toString('base64');
}
const out = '/* 生成ファイル：assets/portraits/ に置いた画像を node tools/build_portraits.js で取り込むと、ここに data URL のマップが書き出される。\n * キー = キャラID（js/data.js の CHARACTERS）。端末内（localStorage）の設定画像が優先される。 */\n' +
  '(function (root) { root.BL = root.BL || {}; root.BL.PORTRAITS = ' + JSON.stringify(map) + '; })(typeof globalThis !== \'undefined\' ? globalThis : this);\n';
fs.writeFileSync(path.join(root, 'js', 'portraits.js'), out);
console.log('portraits:', Object.keys(map).length, 'chars,', Math.round(total / 1024) + ' KB', skipped.length ? '/ skipped (unknown name): ' + skipped.join(', ') : '');
if (total > 8 * 1024 * 1024) console.warn('WARNING: total exceeds 8MB; the single-file build may exceed the artifact size limit');
