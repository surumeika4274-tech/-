/* ============================================================================
 * カードアートワーク（生成 SVG）
 *  原作のキャラクター画像は著作物のため同梱しない。代わりに、タイプ色・レアリティ枠・キャラの外見データ
 *  （髪型・髪色・目の色：アニメ版の配色に準拠、未定義キャラは ID から決定的に生成）でバストアップを描き、
 *  段階（チームZ／新英雄大戦／決戦…）に応じたユニフォーム色を付ける。
 *  利用者が権利を持つ画像を設定した場合（meta.portraits[charId] / BL.PORTRAITS）はそれを表示する。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  var D = BL.DATA;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function firstChar(name) { return Array.from(name)[0] || '?'; }
  function stars(n) { var s = ''; for (var i = 0; i < n; i++) s += '★'; return s; }
  var uid = 0;

  /* 髪型テンプレート（100×100 の座標系。頭の中心 (50,42)、横半径 16、縦半径 18） */
  var HAIR = {
    short:   { back: 'M32 44 Q30 18 50 18 Q70 18 68 44 Q60 36 50 36 Q40 36 32 44 Z', front: 'M33 36 Q38 22 50 22 Q62 22 67 36 Q60 30 50 30 Q40 30 33 36 Z' },
    spiky:   { back: 'M31 46 Q28 20 50 17 Q72 20 69 46 Q60 38 50 38 Q40 38 31 46 Z', front: 'M30 38 L36 16 L42 30 L48 12 L54 30 L60 14 L66 32 L70 22 L69 40 Q60 30 50 30 Q40 30 30 38 Z' },
    long:    { back: 'M28 46 Q26 16 50 15 Q74 16 72 46 L76 82 Q50 90 24 82 Z', front: 'M32 38 Q38 20 50 20 Q62 20 68 38 Q62 30 50 30 Q38 30 32 38 Z' },
    bob:     { back: 'M29 44 Q28 16 50 16 Q72 16 71 44 L72 60 Q50 66 28 60 Z', front: 'M32 40 Q34 22 50 22 Q66 22 68 40 L68 38 Q50 34 32 38 Z' },
    wavy:    { back: 'M30 46 Q26 18 50 17 Q74 18 70 46 Q64 40 50 40 Q36 40 30 46 Z', front: 'M31 40 Q34 24 44 24 Q48 30 52 24 Q60 22 66 28 Q70 34 68 40 Q60 32 50 33 Q40 33 31 40 Z' },
    buzz:    { back: 'M33 44 Q32 22 50 21 Q68 22 67 44 Q60 40 50 40 Q40 40 33 44 Z', front: '' },
    curly:   { back: 'M30 46 Q24 30 34 22 Q40 12 50 16 Q60 12 66 22 Q76 30 70 46 Q60 40 50 40 Q40 40 30 46 Z', front: 'M32 40 Q30 30 38 28 Q44 22 50 26 Q56 22 62 28 Q70 30 68 40 Q60 34 50 34 Q40 34 32 40 Z' },
    bangs:   { back: 'M30 46 Q28 16 50 16 Q72 16 70 46 Q62 42 50 42 Q38 42 30 46 Z', front: 'M31 44 Q34 20 50 20 Q66 20 69 44 L66 46 L60 40 L56 48 L50 42 L44 48 L40 40 L34 46 Z' },
    ponytail:{ back: 'M32 44 Q30 18 50 18 Q70 18 68 44 Q60 36 50 36 Q40 36 32 44 Z M62 30 Q80 40 74 70 Q70 76 66 72 Q70 50 60 38 Z', front: 'M33 36 Q38 22 50 22 Q62 22 67 36 Q60 30 50 30 Q40 30 33 36 Z' }
  };
  var HAIR_KEYS = Object.keys(HAIR);
  var HAIR_PALETTE = ['#1f1f1f', '#3a2e2a', '#5b3a21', '#8b5a2b', '#c9a227', '#e8863b', '#a83a3a', '#7c4dff', '#1f2a44', '#9aa0a6', '#e9edf2', '#2f5a3f'];
  var EYE_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#38bdf8', '#ef4444', '#9ca3af', '#111827'];
  /* 国籍・クラブによるユニフォーム色（決戦・新英雄大戦などの段階カード用） */
  var NATION = { teddy: 'en', achampong: 'en', childs: 'en', blake: 'en', onaji: 'ng', kusso: 'ng', bello: 'ng', loki: 'fr', chevalier: 'fr', hugo: 'fr', raiden: 'fr', luna: 'es', dada: 'br', cavazos: 'ar', snuffy: 'it', lorenzo: 'it', lavinho: 'br', prince: 'en', noa: 'fr', kaiser: 'de', ness: 'de' };
  var NATION_KIT = { jp: ['#1e3a8a', '#ffffff'], en: ['#f8fafc', '#dc2626'], ng: ['#15803d', '#ffffff'], fr: ['#1d4ed8', '#ffffff'], es: ['#b91c1c', '#facc15'], br: ['#facc15', '#16a34a'], ar: ['#7dd3fc', '#ffffff'], it: ['#1d4ed8', '#ffffff'], de: ['#f8fafc', '#111827'] };
  var CLUB_KIT = { de: ['#111827', '#dc2626'], en: ['#7dd3fc', '#ffffff'], it: ['#f8fafc', '#111827'], fr: ['#1e3a8a', '#dc2626'], es: ['#b91c1c', '#1d4ed8'] };
  var CLUB_OF = { kaiser: 'de', ness: 'de', noa: 'de', prince: 'en', blake: 'en', snuffy: 'it', lorenzo: 'it', loki: 'fr', chevalier: 'fr', lavinho: 'es', luna: 'es' };

  function lookOf(charId) {
    var l = (D.LOOKS && D.LOOKS[charId]) || null;
    if (l) return { hair: l.hair, color: l.color, accent: l.accent || null, eye: l.eye || '#3b82f6', skin: l.skin || '#f3cfa8' };
    var h = hash(charId);
    return { hair: HAIR_KEYS[h % HAIR_KEYS.length], color: HAIR_PALETTE[(h >>> 4) % HAIR_PALETTE.length], accent: null, eye: EYE_PALETTE[(h >>> 8) % EYE_PALETTE.length], skin: '#f3cfa8' };
  }
  function kitOf(card, typeColor) {
    var stage = card.stage || '';
    if (/W杯|決戦/.test(stage)) { var nk = NATION_KIT[NATION[card.char] || 'jp']; return { main: nk[0], trim: nk[1] }; }
    if (/新英雄大戦|マスター|現役/.test(stage) && CLUB_OF[card.char]) { var ck = CLUB_KIT[CLUB_OF[card.char]]; return { main: ck[0], trim: ck[1] }; }
    if (/チーム/.test(card.title) || /二次選考|一次/.test(stage)) return { main: '#1d4ed8', trim: '#ffffff' };
    return { main: typeColor, trim: '#ffffff' };
  }

  /** バストアップ（100×100 の座標系に描く） */
  function bust(card, look, kit, id, flip) {
    var hs = HAIR[look.hair] || HAIR.short; var out = [];
    out.push('<g transform="translate(50 0) scale(' + flip + ' 1) translate(-50 0)">');
    /* 髪（後ろ） */
    out.push('<path d="' + hs.back + '" fill="' + look.color + '"/>');
    /* 首・ユニフォーム */
    out.push('<path d="M44 58 L44 66 Q50 70 56 66 L56 58 Z" fill="' + shade(look.skin, -18) + '"/>');
    out.push('<path d="M14 100 Q16 74 36 66 L44 66 Q50 72 56 66 L64 66 Q84 74 86 100 Z" fill="' + kit.main + '"/>');
    out.push('<path d="M36 66 L44 66 Q50 72 56 66 L64 66 L60 76 Q50 80 40 76 Z" fill="' + kit.trim + '" fill-opacity=".9"/>');
    out.push('<path d="M22 100 Q24 82 34 74 M78 100 Q76 82 66 74" stroke="' + kit.trim + '" stroke-opacity=".7" stroke-width="2.5" fill="none"/>');
    /* 顔 */
    out.push('<ellipse cx="50" cy="42" rx="16" ry="18" fill="' + look.skin + '"/>');
    out.push('<ellipse cx="34.5" cy="44" rx="2.6" ry="3.4" fill="' + look.skin + '"/><ellipse cx="65.5" cy="44" rx="2.6" ry="3.4" fill="' + look.skin + '"/>');
    /* 目 */
    out.push('<ellipse cx="43.5" cy="45" rx="3.2" ry="2.6" fill="#ffffff"/><ellipse cx="56.5" cy="45" rx="3.2" ry="2.6" fill="#ffffff"/>');
    out.push('<circle cx="44" cy="45.3" r="1.9" fill="' + look.eye + '"/><circle cx="57" cy="45.3" r="1.9" fill="' + look.eye + '"/>');
    out.push('<circle cx="44.6" cy="44.6" r=".6" fill="#fff"/><circle cx="57.6" cy="44.6" r=".6" fill="#fff"/>');
    var brow = { A: 'M39 39 L47 41 M61 39 L53 41', B: 'M40 40 Q44 38 47 40 M53 40 Q56 38 60 40', C: 'M39 41 L47 39 M61 41 L53 39', D: 'M40 39 Q44 37 47 39 M53 39 Q56 37 60 39' }[look.fav] || 'M40 40 Q44 38 47 40 M53 40 Q56 38 60 40';
    var mouth = { A: 'M46 53 Q50 56 54 53', B: 'M47 53 Q50 55 53 53', C: 'M46 54 L54 54', D: 'M47 53 Q50 54 53 53' }[look.fav] || 'M47 53 Q50 55 53 53';
    out.push('<path d="' + brow + '" stroke="' + shade(look.color, -30) + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    out.push('<path d="' + mouth + '" stroke="' + shade(look.skin, -60) + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
    /* 髪（前） */
    if (hs.front) out.push('<path d="' + hs.front + '" fill="' + look.color + '"/>');
    if (look.accent) out.push('<path d="M40 24 Q46 20 52 24 L50 32 Q46 30 42 32 Z" fill="' + look.accent + '" fill-opacity=".95"/>');
    out.push('</g>');
    return out.join('');
  }
  function shade(hex, amt) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    var n = parseInt(m[1], 16); var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * card: BL.CARDS の要素 / opts: { portrait: dataURL|null, size: px幅 }
   */
  function svg(card, opts) {
    opts = opts || {};
    var c = D.CHARACTERS[card.char]; var r = D.RARITY[card.rar]; var t = D.TYPE_MAP[card.type] || {};
    var typeColor = (D.STAT_META[t.stat] || { color: '#4dd2ff' }).color;
    var id = 'a' + (uid++);
    var h = hash(card.id + card.char);
    var flip = (h >>> 3) % 2 === 0 ? 1 : -1;      /* 左右反転（個体差） */
    var W = 120, H = 150;
    var size = opts.size || 120; var hgt = Math.round(size * H / W);
    var initial = firstChar(c.name);
    var holo = r.stars >= 7;
    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + size + '" height="' + hgt + '" class="card-svg r' + r.stars + '" role="img" aria-label="' + esc(c.name + ' ' + card.title) + '">');
    out.push('<defs>' +
      '<radialGradient id="' + id + 'bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="' + typeColor + '" stop-opacity=".55"/><stop offset=".6" stop-color="#0b1020" stop-opacity=".9"/><stop offset="1" stop-color="#05070f"/></radialGradient>' +
      '<linearGradient id="' + id + 'fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + r.color + '"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="' + r.color + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + id + 'nm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070f" stop-opacity="0"/><stop offset="1" stop-color="#05070f" stop-opacity=".92"/></linearGradient>' +
      '<clipPath id="' + id + 'cp"><rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" rx="8"/></clipPath>' +
      '</defs>');
    out.push('<rect x="1.5" y="1.5" width="' + (W - 3) + '" height="' + (H - 3) + '" rx="10" fill="#05070f" stroke="url(#' + id + 'fr)" stroke-width="' + (r.stars >= 6 ? 3 : 2) + '"/>');
    out.push('<g clip-path="url(#' + id + 'cp)">');
    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#' + id + 'bg)"/>');
    if (opts.portrait) {
      out.push('<image href="' + opts.portrait + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid slice"/>');
    } else {
      /* 背景エンブレム（姓の頭文字）とスタジアムの光 */
      out.push('<text x="60" y="98" text-anchor="middle" font-family="Noto Sans JP, sans-serif" font-weight="900" font-size="92" fill="' + typeColor + '" fill-opacity=".14">' + esc(initial) + '</text>');
      out.push('<path d="M-5 30 L45 30 M-5 38 L30 38 M-5 46 L20 46" stroke="' + typeColor + '" stroke-opacity=".35" stroke-width="2"/>');
      out.push('<path d="M-10 128 L130 128 M10 150 L20 128 M110 150 L100 128" stroke="#ffffff" stroke-opacity=".12" stroke-width="1.5" fill="none"/>');
      /* レアリティのオーラ（★6 以上）とタイプ色の光線 */
      if (r.stars >= 6) { out.push('<circle cx="60" cy="62" r="46" fill="none" stroke="' + r.color + '" stroke-opacity=".35" stroke-width="' + (r.stars >= 8 ? 6 : 3) + '" class="aura"/>'); out.push('<circle cx="60" cy="62" r="52" fill="none" stroke="' + r.color + '" stroke-opacity=".15" stroke-width="1.5" stroke-dasharray="3 5" class="aura2"/>'); }
      out.push('<path d="M60 62 L-20 -10 M60 62 L140 -10 M60 62 L-30 60 M60 62 L150 60" stroke="' + typeColor + '" stroke-opacity=".08" stroke-width="10"/>');
      /* バストアップ */
      var look = lookOf(card.char); var kit = kitOf(card, typeColor); look.fav = c.fav;
      out.push('<g transform="translate(-6 2) scale(1.32)">' + bust(card, look, kit, id, flip) + '</g>');
      /* 胸のポジション */
      out.push('<text x="60" y="106" text-anchor="middle" font-family="Oswald, Noto Sans JP, sans-serif" font-weight="700" font-size="11" fill="' + kit.trim + '" fill-opacity=".9">' + (card.pos && card.pos[0] ? esc(card.pos[0]) : '') + '</text>');
    }
    if (holo) {
      out.push('<polygon points="-40,0 20,0 140,150 80,150" fill="url(#' + id + 'sh)"/>');
      if (r.stars >= 8) out.push('<polygon points="40,0 70,0 180,150 150,150" fill="url(#' + id + 'sh)"/>');
    }
    if (card.flow) out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="none" stroke="#ff8c1c" stroke-opacity=".7" stroke-width="6" stroke-dasharray="4 6"/>');
    /* 名前帯 */
    out.push('<rect x="0" y="' + (H - 40) + '" width="' + W + '" height="40" fill="url(#' + id + 'nm)"/>');
    out.push('<text x="8" y="' + (H - 21) + '" font-family="Noto Sans JP, sans-serif" font-weight="900" font-size="13" fill="#ffffff">' + esc(c.name) + '</text>');
    out.push('<text x="8" y="' + (H - 9) + '" font-family="Noto Sans JP, sans-serif" font-size="7.5" fill="#c9d6f2">' + esc(card.title.length > 14 ? card.title.slice(0, 13) + '…' : card.title) + '</text>');
    /* 上部：タイプ／レア */
    out.push('<rect x="6" y="6" width="22" height="14" rx="4" fill="#05070f" fill-opacity=".7"/>');
    out.push('<text x="17" y="17" text-anchor="middle" font-size="10">' + (t.icon || '⚽') + '</text>');
    out.push('<text x="' + (W - 6) + '" y="16" text-anchor="end" font-family="Noto Sans JP, sans-serif" font-size="' + (r.stars >= 6 ? 7 : 8) + '" font-weight="700" fill="' + r.color + '">' + stars(r.stars) + '</text>');
    if (card.origin === 'mod') out.push('<text x="' + (W - 6) + '" y="27" text-anchor="end" font-family="Noto Sans JP, sans-serif" font-size="6" fill="#9aa4b2">改変版</text>');
    out.push('</g></svg>');
    return out.join('');
  }

  /** 敵チームのエンブレム（試合画面用） */
  function emblem(label, color, size) {
    var id = 'e' + (uid++); size = size || 56;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(label) + '">' +
      '<defs><radialGradient id="' + id + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="' + color + '" stop-opacity=".9"/><stop offset="1" stop-color="#05070f"/></radialGradient></defs>' +
      '<path d="M30 3 L54 12 L50 40 L30 57 L10 40 L6 12 Z" fill="url(#' + id + ')" stroke="#ffffff" stroke-opacity=".5" stroke-width="2"/>' +
      '<text x="30" y="37" text-anchor="middle" font-family="Noto Sans JP, sans-serif" font-weight="900" font-size="20" fill="#ffffff">' + esc(firstChar(label)) + '</text></svg>';
  }

  /** タイプアイコン（SVG） */
  var TYPE_ICON = {
    'キック':       '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 5 L15 10 L12 15 L9 10 Z M12 15 L8 19 M12 15 L16 19" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    'スピード':     '<path d="M3 8 H15 M5 12 H18 M3 16 H13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M15 6 L21 12 L15 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    'テクニック':   '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    '賢さ':         '<path d="M8 4 a4 4 0 0 0 -4 4 v2 a4 4 0 0 0 4 4 h1 v5 h6 v-5 h1 a4 4 0 0 0 4 -4 V8 a4 4 0 0 0 -4 -4 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8 v4 M9 10 h6" stroke="currentColor" stroke-width="1.6"/>',
    'フィジカル':   '<path d="M4 10 h3 v-3 h3 v10 h-3 v-3 h-3 Z M20 10 h-3 v-3 h-3 v10 h3 v-3 h3 Z M10 12 h4" fill="none" stroke="currentColor" stroke-width="2"/>',
    'スタミナ':     '<rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="19" y="10" width="2.5" height="4" fill="currentColor"/><rect x="6" y="10" width="3" height="4" fill="currentColor"/><rect x="10" y="10" width="3" height="4" fill="currentColor"/>',
    'コンディション': '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M5 5 l2 2 M17 17 l2 2 M5 19 l2 -2 M17 7 l2 -2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function typeIcon(type, size) {
    var t = D.TYPE_MAP[type]; var color = t ? (D.STAT_META[t.stat] || {}).color : '#fff';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + (size || 16) + '" height="' + (size || 16) + '" class="ticon" style="color:' + color + '" aria-label="' + esc(type) + '">' + (TYPE_ICON[type] || TYPE_ICON['キック']) + '</svg>';
  }
  BL.ART = { svg: svg, emblem: emblem, typeIcon: typeIcon, lookOf: lookOf };
})(typeof globalThis !== 'undefined' ? globalThis : this);
