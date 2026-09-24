#!/usr/bin/env node
/* 単一 HTML ビルド：index.html に CSS / JS をすべてインライン化して dist/bluelock-pwc-egoist.html を生成
 *   node tools/build_single.js
 * 生成物はダブルクリックで開くだけでプレイ可能（外部依存は Google Fonts のみ・未接続でもフォールバック）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + code + '\n</script>';
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'bluelock-pwc-egoist.html');
fs.writeFileSync(out, html);
console.log('built', out, Math.round(fs.statSync(out).size / 1024) + ' KB');

/* Artifact 用（claude.ai の公開スケルトンが doctype/html/head/body を付与するため、それらを除いた本文のみ） */
const title = '<title>BLUE LOCK Egoist Roguelite</title>\n';
const fonts = (html.match(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g) || []).join('\n') + '\n';
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const art = title + fonts + style + '\n' + body;
const outA = path.join(root, 'dist', 'artifact.html');
fs.writeFileSync(outA, art);
console.log('built', outA, Math.round(fs.statSync(outA).size / 1024) + ' KB');
