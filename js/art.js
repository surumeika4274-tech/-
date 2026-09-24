/* ============================================================================
 * カードアートワーク（生成 SVG）
 *  原作のキャラクター画像は著作物のため同梱しない。代わりに、タイプ色・レアリティ枠・キャラ固有の
 *  エンブレム（姓の頭文字）とストライカーのシルエットで各カード固有の絵柄を生成する。
 *  利用者が権利を持つ画像を設定した場合（meta.portraits[charId]）はそれを表示する。
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

  /**
   * card: BL.CARDS の要素 / opts: { portrait: dataURL|null, size: px幅, compact: bool }
   */
  function svg(card, opts) {
    opts = opts || {};
    var c = D.CHARACTERS[card.char]; var r = D.RARITY[card.rar]; var t = D.TYPE_MAP[card.type] || {};
    var typeColor = (D.STAT_META[t.stat] || { color: '#4dd2ff' }).color;
    var id = 'a' + (uid++);
    var h = hash(card.id + card.char);
    var tilt = ((h % 7) - 3) * 2;                 /* シルエットの微妙な傾き（個体差） */
    var flip = (h >> 3) % 2 === 0 ? 1 : -1;       /* 左右反転（個体差） */
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
      /* 背景エンブレム（姓の頭文字） */
      out.push('<text x="60" y="98" text-anchor="middle" font-family="Noto Sans JP, sans-serif" font-weight="900" font-size="92" fill="' + typeColor + '" fill-opacity=".14">' + esc(initial) + '</text>');
      /* ピッチのライン */
      out.push('<path d="M-10 118 L130 118 M10 150 L20 118 M110 150 L100 118" stroke="#ffffff" stroke-opacity=".12" stroke-width="1.5" fill="none"/>');
      out.push('<ellipse cx="60" cy="118" rx="26" ry="6" stroke="#ffffff" stroke-opacity=".12" fill="none"/>');
      /* ストライカーのシルエット */
      out.push('<g transform="translate(60 80) rotate(' + tilt + ') scale(' + flip + ' 1) translate(-50 -58)">');
      out.push('<path d="M100 56 a7 7 0 1 0 0.1 0" fill="#f3f4f6"/><path d="M96 52 l4 3 l-1 5 l-5 -1 z M102 60 l4 -2 l1 4 l-3 3 z" fill="#111827"/>');
      out.push('<circle cx="48" cy="22" r="9" fill="#111827"/>');
      out.push('<path d="M38 32 L58 32 L63 60 L35 60 Z" fill="' + typeColor + '"/>');
      out.push('<path d="M38 32 L58 32 L56 44 L40 44 Z" fill="#ffffff" fill-opacity=".18"/>');
      out.push('<path d="M40 36 L22 50 M58 36 L76 28" stroke="#111827" stroke-width="6" stroke-linecap="round" fill="none"/>');
      out.push('<path d="M44 60 L40 92 M54 60 L74 74 L92 62" stroke="#111827" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>');
      out.push('<path d="M36 92 L46 94 M90 58 L96 66" stroke="#111827" stroke-width="5" stroke-linecap="round"/>');
      out.push('<g transform="translate(49 0) scale(' + flip + ' 1) translate(-49 0)"><text x="49" y="52" text-anchor="middle" font-family="Oswald, Noto Sans JP, sans-serif" font-weight="700" font-size="14" fill="#05070f" fill-opacity=".85">' + (card.pos && card.pos[0] ? esc(card.pos[0]) : '') + '</text></g>');
      out.push('</g>');
      /* タイプ色のスピードライン */
      out.push('<path d="M-5 30 L45 30 M-5 38 L30 38 M-5 46 L20 46" stroke="' + typeColor + '" stroke-opacity=".35" stroke-width="2"/>');
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

  BL.ART = { svg: svg, emblem: emblem };
})(typeof globalThis !== 'undefined' ? globalThis : this);
