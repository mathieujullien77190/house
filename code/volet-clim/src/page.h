// La page web du boîtier : un seul fichier HTML + JS, gardé dans la mémoire de l'ESP32 et servi sur `/`.
#pragma once

#include <Arduino.h>

static const char PAGE[] PROGMEM = R"HTML(<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Volets et clim</title>
<script>
try {
  const saved = localStorage.getItem('theme')
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
} catch (e) {
  document.documentElement.dataset.theme = 'light'
}
</script>
<style>
  :root { color-scheme: light; --bg:#f4f6fa; --card:#fff; --fg:#1b2230; --muted:#6a7486; --line:#d9dee8; --accent:#2f6fe4; --ok:#2e9e5b; --bad:#d64545; }
  :root[data-theme="dark"] { color-scheme: dark; --bg:#0e1320; --card:#171e2f; --fg:#e9edf6; --muted:#98a2b6; --line:#2a3550; --accent:#6ea0ff; }
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
  .field { display:flex; flex-direction:column; gap:4px; font-size:.85rem; color:var(--muted); flex:1; min-width:120px; margin-top:10px; }
  .row > label, .field { flex:1 1 100%; }
  .seg { display:flex; }
  .seg button { flex:1 1 0; min-width:0; margin-left:-1px; padding:10px 4px; border-radius:0; font-size:.85rem; overflow-wrap:anywhere; }
  .seg button:first-child { margin-left:0; border-radius:10px 0 0 10px; }
  .seg button:last-child { border-radius:0 10px 10px 0; }
  .seg button:only-child { border-radius:10px; }
  .seg button.on { position:relative; z-index:1; background:var(--accent); border-color:var(--accent); color:#fff; font-weight:600; }
  label { display:flex; flex-direction:column; gap:4px; font-size:.85rem; color:var(--muted); flex:1; min-width:120px; }
  .muted { color:var(--muted); font-size:.85rem; margin:6px 0 0; }
  .top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; }
  .check { flex-direction:row; align-items:center; gap:10px; font-size:1rem; color:var(--fg); }
  .check input { width:22px; height:22px; accent-color:var(--accent); }
  .stack { display:flex; flex-direction:column; gap:8px; }
  .stack button { width:100%; }
  .prog { display:flex; align-items:center; gap:8px; padding:8px 0; border-top:1px solid var(--line); font-size:.9rem; }
  .prog span { flex:1; }
  .prog button { flex:0 0 auto; min-width:0; width:36px; padding:6px 0; }
  .tools { display:flex; gap:8px; }
  .gear { flex:0 0 auto; min-width:0; width:44px; height:44px; padding:0; font-size:1.4rem; line-height:1; position:relative; }
  .gear.alert::after { content:""; position:absolute; top:6px; right:6px; width:10px; height:10px; border-radius:50%; background:var(--bad); }
  h3 { font-size:.95rem; margin:14px 0 6px; }
  [hidden] { display:none !important; }
  #toast { position:fixed; left:16px; right:16px; bottom:16px; background:var(--fg); color:var(--bg); padding:12px; border-radius:10px; text-align:center; opacity:0; transition:opacity .2s; pointer-events:none; max-width:608px; margin-inline:auto; }
  #toast.show { opacity:1; }
  details summary { cursor:pointer; color:var(--muted); }
</style>
</head>
<body>
<div class="top">
  <h1>Volets et clim</h1>
  <div class="tools">
    <button id="theme" class="gear" onclick="toggleTheme()" aria-label="Thème jour ou nuit"></button>
    <button id="gear" class="gear" onclick="toggleSettings()" aria-label="Réglages" aria-expanded="false">⚙</button>
  </div>
</div>

<div id="settings" class="card" hidden>
  <h2>Réglages</h2>

  <h3>Volet</h3>
  <div class="row"><button onclick="shutter(0,'prog')">Appairage</button></div>

  <h3>Radio (volets)</h3>
  <p id="radioError" class="muted" style="margin:0 0 8px;color:var(--bad)" hidden>Module radio CC1101 introuvable : vérifie les 8 fils.</p>
  <div class="row">
    <label>Fréquence (MHz)
      <input id="mhz" type="number" step="0.01" min="433" max="434">
    </label>
    <button onclick="setFrequency()">Appliquer</button>
  </div>
  <p class="muted">433,42 par défaut ; 433,36 sur certains boîtiers. Si un volet ne répond pas, essaie l'autre.</p>

  <h3>Clim</h3>
  <div class="field"><span class="lab">Famille de télécommande</span><div class="seg" id="protocol"></div></div>
  <p class="muted">Essaie les familles une par une : la bonne fait « bip ». La clim est visée par la LED infrarouge, à moins de 5 m, sans obstacle. Le boîtier ne sait pas l'état réel de la clim : il envoie ce qu'affichent les réglages.</p>

  <h3>Programme</h3>
  <div class="row">
    <label>Fichier .bin (volet-clim-mise-a-jour.bin)
      <input id="file" type="file" accept=".bin">
    </label>
    <label>Mot de passe
      <input id="updateKey" type="password" value="">
    </label>
  </div>
  <div class="row" style="margin-top:8px"><button onclick="sendUpdate()">Envoyer et redémarrer</button></div>
  <p class="muted">Le Wi-Fi et l'appairage des volets sont conservés. Mot de passe : celui de config.h (OTA_PASSWORD).</p>
</div>

<div id="shutters"></div>

<div class="card">
  <h2>Pompe à chaleur</h2>
  <div class="row">
    <button class="main" onclick="ac({power:1})">Marche</button>
    <button onclick="ac({power:0})">Arrêt</button>
  </div>
  <div class="row" style="margin-top:10px">
    <div class="field"><span class="lab">Mode</span><div class="seg" id="mode"><button data-v="heat">Chaud</button><button data-v="cool">Froid</button><button data-v="dry">Sec</button><button data-v="fan">Ventilation</button><button data-v="auto">Auto</button></div></div>
    <label>Température
      <input id="temp" type="number" min="16" max="31" step="1" value="21" onchange="ac({power:1})">
    </label>
  </div>
  <div class="row" style="margin-top:10px">
    <div class="field"><span class="lab">Ventilateur</span><div class="seg" id="fan"><button data-v="auto">Auto</button><button data-v="min">Min</button><button data-v="low">Bas</button><button data-v="medium">Moyen</button><button data-v="high">Haut</button><button data-v="max">Max</button></div></div>
    <div class="field"><span class="lab">Ailettes</span><div class="seg" id="vane"><button data-v="auto">Auto</button><button data-v="highest">Très haut</button><button data-v="high">Haut</button><button data-v="middle">Milieu</button><button data-v="low">Bas</button><button data-v="lowest">Très bas</button><button data-v="off">Fixe</button></div></div>
  </div>
  <div class="row" style="margin-top:10px">
    <button id="saveBtn" onclick="showSave()">Sauvegarder cette configuration</button>
  </div>
  <div id="timeRow" hidden>
    <label style="margin-top:10px">Heure
      <input type="time" id="progTime">
    </label>
    <div class="row" style="margin-top:10px"><button class="main" onclick="saveProgram()">Enregistrer</button></div>
  </div>
  <div id="programs"></div>
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
  if (done && cmd !== 'prog') toast('Ordre envoyé : ' + ({ up: 'ouvrir', down: 'fermer', my: 'stop' }[cmd]))
}
const ac = async (extra) => {
  const params = new URLSearchParams({
    power: extra.power, mode: getSeg('mode'), temp: $('temp').value, fan: getSeg('fan'), vane: getSeg('vane'), protocol: getSeg('protocol'),
  })
  const done = await post('/api/ac?' + params)
  if (done) toast(extra.power ? 'Clim : envoyé' : 'Clim : arrêt envoyé')
}
const DEFAULT_TIMES = { up: '07:00', down: '19:00' }
const toggleAuto = (id) => {
  const on = $(id + 'On').checked
  $(id + 'Box').hidden = !on
  $(id + 'Time').value = on ? $(id + 'Time').value || DEFAULT_TIMES[id] : ''
  saveSchedule()
}
const saveSchedule = async () => {
  const done = await post('/api/schedule?up=' + encodeURIComponent($('upTime').value) + '&down=' + encodeURIComponent($('downTime').value))
  if (done) toast('Horaires enregistrés')
}
const labelOf = (id, value) => {
  const button = [...$(id).children].find((b) => b.dataset.v === value)
  return button ? button.textContent : value
}
const showSave = () => {
  $('timeRow').hidden = false
  $('saveBtn').hidden = true
}
const refresh = () => fetch('/api/state').then((r) => r.json()).then(render).catch(() => toast('Le boîtier ne répond pas'))
const saveProgram = async () => {
  const time = $('progTime').value
  if (!time) return toast('Choisis une heure')
  const params = new URLSearchParams({ time, mode: getSeg('mode'), temp: $('temp').value, fan: getSeg('fan'), vane: getSeg('vane') })
  if (await post('/api/ac/program?' + params)) {
    $('timeRow').hidden = true
    $('saveBtn').hidden = false
    $('progTime').value = ''
    refresh()
  }
}
const deleteProgram = async (index) => {
  if (await post('/api/ac/program/delete?index=' + index)) refresh()
}
const setFrequency = async () => {
  const done = await post('/api/frequency?mhz=' + $('mhz').value)
  if (done) toast('Fréquence : ' + done.mhz + ' MHz')
}

const sendUpdate = async () => {
  const file = $('file').files[0]
  if (!file) return toast('Choisis le fichier .bin')
  const form = new FormData()
  form.append('firmware', file)
  toast('Envoi en cours, ne coupe pas le courant…')
  try {
    const res = await fetch('/api/update', { method: 'POST', headers: { 'X-Update-Key': $('updateKey').value }, body: form })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
    toast('Mise à jour réussie : le boîtier redémarre, recharge la page dans 20 s')
  } catch (e) {
    toast('Erreur : ' + e.message)
  }
}

const getSeg = (id) => $(id).dataset.value
const setSeg = (id, value) => {
  $(id).dataset.value = value
  for (const button of $(id).children) button.classList.toggle('on', button.dataset.v === value)
}
document.addEventListener('click', (e) => {
  const button = e.target.closest('.seg button')
  if (!button) return
  setSeg(button.parentElement.id, button.dataset.v)
  ac({ power: 1 })
})

const showTheme = () => {
  // L'icône montre ce qu'on obtient en cliquant : le soleil la nuit, la lune le jour.
  $('theme').textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'
}
const toggleTheme = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem('theme', next)
  } catch (e) {}
  showTheme()
}
showTheme()

const toggleSettings = () => {
  const panel = $('settings')
  panel.hidden = !panel.hidden
  $('gear').setAttribute('aria-expanded', String(!panel.hidden))
}

const render = (state) => {
  $('gear').classList.toggle('alert', !state.radio)
  $('radioError').hidden = state.radio
  $('mhz').value = state.mhz
  $('shutters').innerHTML = state.shutters
    .map((s) => '<div class="card"><h2>Volet</h2>' +
      '<div class="stack"><button class="main" onclick="shutter(' + s.id + ',&quot;up&quot;)">▲ Ouvrir</button><button class="main" onclick="shutter(' + s.id + ',&quot;down&quot;)">▼ Fermer</button><button onclick="shutter(' + s.id + ',&quot;my&quot;)">■ Stop</button></div>' +
      '<div class="field"><label class="check"><input type="checkbox" id="upOn" onchange="toggleAuto(\'up\')"' + (state.schedule.up ? ' checked' : '') + '>Ouverture automatique</label>' +
      '<label id="upBox"' + (state.schedule.up ? '' : ' hidden') + '>Heure d’ouverture<input type="time" id="upTime" value="' + state.schedule.up + '" onchange="saveSchedule()"></label></div>' +
      '<div class="field"><label class="check"><input type="checkbox" id="downOn" onchange="toggleAuto(\'down\')"' + (state.schedule.down ? ' checked' : '') + '>Fermeture automatique</label>' +
      '<label id="downBox"' + (state.schedule.down ? '' : ' hidden') + '>Heure de fermeture<input type="time" id="downTime" value="' + state.schedule.down + '" onchange="saveSchedule()"></label></div>' +
      '</div>')
    .join('')
  const protocol = $('protocol')
  if (!protocol.children.length) {
    for (const name of state.protocols) {
      const button = document.createElement('button')
      button.dataset.v = name
      button.textContent = name
      protocol.appendChild(button)
    }
  }
  const a = state.ac
  setSeg('mode', a.mode)
  $('temp').value = a.temperature
  setSeg('fan', a.fan)
  setSeg('vane', a.vane)
  setSeg('protocol', a.protocol)
  $('programs').innerHTML = state.programs
    .map((p, i) => '<div class="prog"><span><b>' + p.time + '</b> · ' + labelOf('mode', p.mode) + ' · ' + p.temperature + ' °C · ventilateur ' + labelOf('fan', p.fan) + ' · ailettes ' + labelOf('vane', p.vane) + '</span><button onclick="deleteProgram(' + i + ')" aria-label="Supprimer">✕</button></div>')
    .join('')
}

refresh()
</script>
</body>
</html>
)HTML";
