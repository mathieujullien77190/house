// Page d'accueil de la mangeoire : image de la caméra et deux servos réglables au degré près.
#pragma once
#include <Arduino.h>

static const char PAGE[] PROGMEM = R"HTML(<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mangeoire</title>
<style>
  :root { color-scheme: light dark; --bg:#f4f4f5; --card:#fff; --fg:#18181b; --mut:#71717a; --acc:#2563eb; --bd:#d4d4d8; }
  @media (prefers-color-scheme: dark) { :root { --bg:#18181b; --card:#27272a; --fg:#f4f4f5; --mut:#a1a1aa; --acc:#60a5fa; --bd:#3f3f46; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:16px system-ui,sans-serif; max-width:560px; margin-inline:auto; }
  h1 { font-size:1.2rem; margin:0 0 12px; }
  .card { background:var(--card); border:1px solid var(--bd); border-radius:12px; padding:12px; margin-bottom:12px; }
  img { width:100%; display:block; border-radius:8px; background:#000; aspect-ratio:4/3; object-fit:contain; }
  .row { display:flex; gap:8px; align-items:center; justify-content:space-between; }
  .mut { color:var(--mut); font-size:.85rem; }
  h2 { font-size:1rem; margin:0; }
  .deg { font-size:1.6rem; font-variant-numeric:tabular-nums; }
  input[type=range] { width:100%; margin:12px 0; accent-color:var(--acc); }
  .btns { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .two { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-top:12px; }
  .two button { min-height:64px; font-size:1.1rem; font-weight:600; }
  .preset { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px; }
  button { min-height:44px; border:1px solid var(--bd); border-radius:8px; background:var(--card); color:var(--fg); font:inherit; cursor:pointer; }
  button:active { background:var(--acc); color:#fff; }
</style>
</head>
<body>
<h1>Mangeoire</h1>

<div class="card">
  <img id="cam" alt="camera">
  <div class="row mut" style="margin-top:8px"><span id="fps">…</span><label><input type="checkbox" id="live" checked> direct</label></div>
</div>

<div class="card" id="s1">
  <div class="row"><h2>Trémie <span class="mut">(servo 1, GPIO 1)</span></h2><span class="deg" id="s1state">–</span></div>
  <div class="two">
    <button data-a="4">Ouvert</button>
    <button data-a="94">Fermé</button>
  </div>
  <div class="preset">
    <button data-a="27">Grande ouverture</button>
    <button data-a="49">Ouverture moyenne</button>
    <button data-a="60">Petite ouverture</button>
  </div>
</div>

<div class="card" id="s2">
  <div class="row"><h2>Servo 2 <span class="mut">(vider, GPIO 2)</span></h2><span class="deg"><span class="v">90</span>°</span></div>
  <input type="range" min="0" max="180" value="90">
  <div class="btns"><button data-d="-10">−10</button><button data-d="-1">−1</button><button data-d="1">+1</button><button data-d="10">+10</button></div>
  <div class="preset"><button data-a="0">0°</button><button data-a="90">90°</button><button data-a="180">180°</button></div>
</div>

<p class="mut">Le signal du servo est coupé 1,2 s après chaque mouvement. Un seul servo bouge à la fois.</p>

<script>
const cam = document.getElementById('cam');
const live = document.getElementById('live');
const fps = document.getElementById('fps');
let last = performance.now();
const loop = () => {
  if (!live.checked) { setTimeout(loop, 500); return; }
  cam.onload = () => {
    const now = performance.now();
    fps.textContent = (1000 / (now - last)).toFixed(1) + ' images/s';
    last = now;
    setTimeout(loop, 30);
  };
  cam.onerror = () => { fps.textContent = 'erreur image'; setTimeout(loop, 1000); };
  cam.src = '/capture?t=' + Date.now();
};
loop();

const wire = (id, n) => {
  const box = document.getElementById(id);
  const range = box.querySelector('input');
  const v = box.querySelector('.v');
  let timer = 0;
  const send = (a) => {
    a = Math.max(0, Math.min(180, a));
    range.value = a;
    v.textContent = a;
    clearTimeout(timer);
    timer = setTimeout(() => fetch('/servo?n=' + n + '&deg=' + a).catch(() => {}), 120);
  };
  range.addEventListener('input', () => send(+range.value));
  box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => send(+range.value + +b.dataset.d)));
  box.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => send(+b.dataset.a)));
};
const NAMES = { 4: 'Ouvert', 94: 'Fermé', 27: 'Grande ouverture', 49: 'Ouverture moyenne', 60: 'Petite ouverture' };
document.getElementById('s1').querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
  const a = +b.dataset.a;
  document.getElementById('s1state').textContent = NAMES[a];
  fetch('/servo?n=1&deg=' + a).catch(() => {});
}));
wire('s2', 2);
</script>
</body>
</html>
)HTML";
