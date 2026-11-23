// La page web du boîtier : un seul fichier HTML + JS, gardé dans la mémoire de l'ESP32 et servi sur `/`.
#pragma once

#include <Arduino.h>

static const char PAGE[] PROGMEM = R"HTML(<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Volets et clim</title>
<style>
  :root { color-scheme: light dark; --bg:#f4f6fa; --card:#fff; --fg:#1b2230; --muted:#6a7486; --line:#d9dee8; --accent:#2f6fe4; --ok:#2e9e5b; --bad:#d64545; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0e1320; --card:#171e2f; --fg:#e9edf6; --muted:#98a2b6; --line:#2a3550; --accent:#6ea0ff; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:16px/1.4 system-ui, sans-serif; max-width:640px; margin-inline:auto; }
  h1 { font-size:1.3rem; margin:0 0 4px; }
  h2 { font-size:1.05rem; margin:0 0 10px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; margin:12px 0; }
  .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  button { flex:1; min-width:64px; padding:12px 8px; font:inherit; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--fg); cursor:pointer; }
  button.main { background:var(--accent); border-color:var(--accent); color:#fff; font-weight:600; }
  button:active { opacity:.7; }
  input, select { font:inherit; padding:10px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--fg); min-width:0; }
  input.name { flex:1; font-weight:600; }
  label { display:flex; flex-direction:column; gap:4px; font-size:.85rem; color:var(--muted); flex:1; min-width:120px; }
  .muted { color:var(--muted); font-size:.85rem; margin:6px 0 0; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--bad); margin-right:6px; }
  .dot.on { background:var(--ok); }
  #toast { position:fixed; left:16px; right:16px; bottom:16px; background:var(--fg); color:var(--bg); padding:12px; border-radius:10px; text-align:center; opacity:0; transition:opacity .2s; pointer-events:none; max-width:608px; margin-inline:auto; }
  #toast.show { opacity:1; }
  details summary { cursor:pointer; color:var(--muted); }
</style>
</head>
<body>
<h1>Volets et clim</h1>
<p class="muted"><span id="radio" class="dot"></span><span id="radioText">radio…</span></p>

<div id="shutters"></div>

<div class="card">
  <h2>Pompe à chaleur</h2>
  <div class="row">
    <button class="main" onclick="ac({power:1})">Marche</button>
    <button onclick="ac({power:0})">Arrêt</button>
  </div>
  <div class="row" style="margin-top:10px">
    <label>Mode
      <select id="mode"><option value="heat">Chaud</option><option value="cool">Froid</option><option value="dry">Sec</option><option value="fan">Ventilation</option><option value="auto">Auto</option></select>
    </label>
    <label>Consigne (°C)
      <input id="temp" type="number" min="16" max="31" step="1" value="21">
    </label>
  </div>
  <div class="row" style="margin-top:10px">
    <label>Ventilateur
      <select id="fan"><option value="auto">Auto</option><option value="min">Minimum</option><option value="low">Bas</option><option value="medium">Moyen</option><option value="high">Haut</option><option value="max">Maximum</option></select>
    </label>
    <label>Ailettes
      <select id="vane"><option value="auto">Auto</option><option value="highest">Tout en haut</option><option value="high">Haut</option><option value="middle">Milieu</option><option value="low">Bas</option><option value="lowest">Tout en bas</option><option value="off">Fixe</option></select>
    </label>
  </div>
  <div class="row" style="margin-top:10px">
    <button class="main" onclick="ac({power:1})">Envoyer ces réglages</button>
  </div>
  <details style="margin-top:10px">
    <summary>Si la clim ne réagit pas</summary>
    <label style="margin-top:8px">Famille de télécommande
      <select id="protocol"></select>
    </label>
    <p class="muted">Essaie les familles une par une : la bonne fait « bip ». La clim est visée par la LED infrarouge, à moins de 5 m, sans obstacle. Le boîtier ne sait pas l'état réel de la clim : il envoie ce qu'affichent ces réglages.</p>
  </details>
</div>

<div class="card">
  <details>
    <summary>Réglages de la radio (volets)</summary>
    <div class="row" style="margin-top:8px">
      <label>Fréquence (MHz)
        <input id="mhz" type="number" step="0.01" min="433" max="434">
      </label>
      <button onclick="setFrequency()">Appliquer</button>
    </div>
    <p class="muted">433,42 par défaut ; 433,36 sur certains boîtiers. Si un volet ne répond pas, essaie l'autre.</p>
  </details>
</div>

<div id="toast"></div>

<script>
const $ = (id) => document.getElementById(id)
let toastTimer
const toast = (text) => {
  $('toast').textContent = text
  $('toast').classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2500)
}
const post = async (url) => {
  try {
    const res = await fetch(url, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || res.status)
    return body
  } catch (e) {
    toast('Erreur : ' + e.message)
    return null
  }
}
const shutter = async (id, cmd) => {
  const done = await post('/api/shutter?id=' + id + '&cmd=' + cmd)
  if (done) toast('Ordre envoyé : ' + ({ up: 'monter', down: 'descendre', my: 'stop', prog: 'appairage' }[cmd]))
}
const progOnce = (id) => {
  if (confirm('Appairage : le volet doit déjà être en mode programmation (appui long sur PROG de sa télécommande, jusqu\'au petit va-et-vient). Envoyer maintenant ?')) shutter(id, 'prog')
}
const rename = (id, value) => post('/api/name?id=' + id + '&name=' + encodeURIComponent(value))
const ac = async (extra) => {
  const params = new URLSearchParams({
    power: extra.power, mode: $('mode').value, temp: $('temp').value, fan: $('fan').value, vane: $('vane').value, protocol: $('protocol').value,
  })
  const done = await post('/api/ac?' + params)
  if (done) toast(extra.power ? 'Clim : envoyé' : 'Clim : arrêt envoyé')
}
const setFrequency = async () => {
  const done = await post('/api/frequency?mhz=' + $('mhz').value)
  if (done) toast('Fréquence : ' + done.mhz + ' MHz')
}

const render = (state) => {
  $('radio').classList.toggle('on', state.radio)
  $('radioText').textContent = state.radio ? 'module radio CC1101 détecté' : 'module radio CC1101 introuvable : vérifie les 8 fils'
  $('mhz').value = state.mhz
  $('shutters').innerHTML = state.shutters
    .map((s) => '<div class="card"><div class="row"><input class="name" value="' + s.name.replace(/"/g, '&quot;') + '" onchange="rename(' + s.id + ', this.value)" aria-label="Nom du volet ' + (s.id + 1) + '">' +
      '<span class="muted">code ' + s.code + '</span></div>' +
      '<div class="row" style="margin-top:10px"><button class="main" onclick="shutter(' + s.id + ',\'up\')">▲ Monter</button><button onclick="shutter(' + s.id + ',\'my\')">■ Stop</button><button class="main" onclick="shutter(' + s.id + ',\'down\')">▼ Descendre</button></div>' +
      '<details style="margin-top:8px"><summary>Appairage</summary><p class="muted">Pour ajouter ce volet : appui long sur PROG de sa télécommande Somfy jusqu\'au petit va-et-vient, puis ci-dessous.</p><button onclick="progOnce(' + s.id + ')">Appairer ce volet</button></details></div>')
    .join('')
  const protocol = $('protocol')
  if (!protocol.options.length) state.protocols.forEach((name) => protocol.add(new Option(name, name)))
  const a = state.ac
  $('mode').value = a.mode
  $('temp').value = a.temperature
  $('fan').value = a.fan
  $('vane').value = a.vane
  protocol.value = a.protocol
}

fetch('/api/state').then((r) => r.json()).then(render).catch(() => toast('Le boîtier ne répond pas'))
</script>
</body>
</html>
)HTML";
