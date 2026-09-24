/* ============================================================================
 * 効果音（WebAudio 合成・外部アセット不要）。BL.SFX.play('goal') など。
 * ========================================================================== */
(function (root) {
  'use strict';
  var BL = root.BL = root.BL || {};
  var ctx = null; var enabled = true;
  function ac() {
    if (ctx) return ctx;
    try { ctx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, gain, when, slide) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(); var g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + when);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + when + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, c.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.05);
  }
  function noise(dur, gain, when) {
    var c = ac(); if (!c) return;
    var buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate); var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = c.createBufferSource(); s.buffer = buf; var g = c.createGain(); g.gain.value = gain || 0.15;
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + (when || 0));
  }
  var SOUNDS = {
    click:   function () { tone(880, 0.05, 'square', 0.05, 0); },
    train:   function () { tone(520, 0.08, 'triangle', 0.12, 0); tone(780, 0.1, 'triangle', 0.1, 0.06); },
    rest:    function () { tone(392, 0.25, 'sine', 0.12, 0, 523); },
    buy:     function () { tone(1046, 0.08, 'square', 0.08, 0); tone(1318, 0.12, 'square', 0.08, 0.08); },
    event:   function () { tone(660, 0.12, 'sawtooth', 0.08, 0); tone(880, 0.12, 'sawtooth', 0.08, 0.12); },
    whistle: function () { tone(2200, 0.35, 'square', 0.08, 0, 2400); },
    goal:    function () { tone(523, 0.12, 'square', 0.12, 0); tone(659, 0.12, 'square', 0.12, 0.12); tone(784, 0.12, 'square', 0.12, 0.24); tone(1046, 0.4, 'square', 0.14, 0.36); noise(0.6, 0.12, 0.3); },
    lost:    function () { tone(300, 0.3, 'sawtooth', 0.14, 0, 120); noise(0.4, 0.1, 0); },
    flow:    function () { tone(110, 0.9, 'sawtooth', 0.12, 0, 440); tone(220, 0.9, 'sine', 0.1, 0.1, 880); },
    awaken:  function () { tone(784, 0.1, 'sine', 0.12, 0); tone(1046, 0.1, 'sine', 0.12, 0.1); tone(1318, 0.1, 'sine', 0.12, 0.2); tone(1568, 0.5, 'sine', 0.14, 0.3); },
    elim:    function () { tone(220, 0.5, 'sawtooth', 0.16, 0, 60); tone(165, 0.8, 'square', 0.12, 0.2, 40); noise(1.0, 0.14, 0); },
    clear:   function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.14, i * 0.12); }); tone(1568, 0.9, 'triangle', 0.16, 0.6); },
    gacha:   function () { tone(440, 0.08, 'square', 0.08, 0, 880); tone(880, 0.15, 'square', 0.1, 0.1, 1760); },
    rare:    function () { [659, 784, 1046, 1318, 1568, 2093].forEach(function (f, i) { tone(f, 0.2, 'sine', 0.14, i * 0.08); }); },
    blackout:function () { tone(80, 1.0, 'sine', 0.2, 0, 40); noise(0.8, 0.1, 0); },
    ach:     function () { tone(1046, 0.08, 'triangle', 0.1, 0); tone(1568, 0.2, 'triangle', 0.12, 0.08); }
  };
  BL.SFX = {
    setEnabled: function (v) { enabled = !!v; },
    play: function (name) { if (!enabled) return; try { if (ac() && ctx.state === 'suspended') ctx.resume(); var f = SOUNDS[name]; if (f) f(); } catch (e) { /* ignore */ } }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
