# sync/src – le tour de polling et les réglages

Vue d'ensemble, page, découpe, tests : `../CLAUDE.md`.

## Le tour (`poll.ts`, toutes les `POLL_INTERVAL_SECONDS`)

1. **Enregistreurs** (`RECORDER_URLS`, défaut `http://motion:8080`, interne) : liste des caméras et quel enregistreur gère laquelle. Un enregistreur muet est signalé sans bloquer les autres. Écrit `last_images` et `live_streams` (adresse go2rtc, flux dans `?src=`).
2. **Événements terminés avec clip** (`after` = dernier connu − 1 h, pages de 50) : copie chaque clip inconnu, insère ou complète `events` (dont `clip_started_at`, lu dans l'en-tête `X-Clip-Start`).
   - Un clip n'est copié que **20 s après la fin** de l'événement ; d'ici là `clip_path` reste NULL, retenté à chaque tour pendant 6 h.
3. **Événements en cours** (`in_progress=1`) : insérés sans fin ni clip pour la frise ; complétés à la fin, effacés si l'enregistreur répond 404.
4. **Copie légère** H.264 720p (`clips/<caméra>/<id>.h264.mp4`, colonne `clip_web_path`) : retentée tant que l'enregistreur garde le clip (6 h). Les clips plus anciens n'en ont que convertis à la main.
5. **Son** (`syncAudioClips`, `clip_audio_path`, `<id>.aac`) : demandé après la copie légère ; un 404 n'est plus redemandé jusqu'au redémarrage.
6. **Fusions** : l'enregistreur réunit les clips qui se recouvrent, 30 min après (`../../motion/src/CLAUDE.md`).
   - `syncMerges` relit les 6 dernières heures : l'événement absorbé va dans la table `merges`, puis disparaît de `events` avec ses fichiers.
   - Le survivant est recopié (clip, début réel), copie légère redemandée. La fusion efface aussi le son (recopié avec lui).
7. **Réglages** (`control.ts`), imports (plan, visites invité : `imports.ts`) et surveillance de la box (`boxWatcher.ts`), puis ménage quotidien.
8. **Images** toutes les `SNAPSHOT_INTERVAL_SECONDS` (60 s, réglable par caméra, minuteur d'1 s) : dernière image de chaque caméra (720 px) dans `snapshots`.

**Code permanent des images** (`snapshots.code`, `snapshotCodes.ts`) :

- Lettre de la caméra (a `voliere-interieur`, b `voliere-exterieur`, c `salon-de-jardin`, d `voliere-toit` ; une autre prend e, f… dans `app_settings` `snapshot_camera_<caméra>`), puis numéro d'ordre en lettres (1 = a, 26 = z, 27 = aa, 703 = aaa) : `aa`, `bz`, `daa`.
- Compteur `snapshot_seq_<caméra>` : ne fait que monter, un code n'est jamais réutilisé ; un doublon `(caméra, instant)` n'en consomme pas.
- Au démarrage (`initDatabase`) : colonne et index unique ajoutés, images sans code numérotées par `taken_at`. Aucun fichier renommé.

**Délais** : requête vers un enregistreur coupée à 15 s (120 s pour un clip). Une caméra qui ne répond pas est sautée sans bloquer les autres (PoE coupé ne fige pas le tour). Copie en `.part` renommé à la fin ; un clip qui échoue est retenté.

## Réglages par caméra (table `settings`)

`GET`/`PUT /api/settings` avec `{camera, clips_mode?, snapshot_seconds?, live_fps?, light_fps?, live_fps_mobile?, light_fps_mobile?, motion_sensitivity?, motion_min_seconds?, rain_mode?, orientation?}`. Interface : `../web/src/components/SettingsSection/CLAUDE.md`.

- **Clips** `clips_mode` : `always` (défaut), `night` ou `off` (`clips_enabled` pour les anciennes bases).
  - `night` : seuls les événements commençant entre 30 min avant le coucher et 30 min après le lever ont leur clip (`sun.ts`, copie de `api/src/lib/sun.ts` ; `HOUSE_LATITUDE` / `HOUSE_LONGITUDE`, 48,52 et 2,64).
  - `off` ou hors nuit : `copyClip` ne copie rien, les événements restent sans clip ; ceux des dernières heures sont copiés si on rallume.
  - Ce réglage n'efface rien (seule la durée de garde efface).
- **Clip à la main** (`manual`) : toujours copié, quel que soit `clips_mode` (`isManual` dans `copyClip`) ; sauvegardé d'office par l'API.
- **Détection** (`control.ts`) : `PUT <enregistreur>/api/cameras/<caméra>/detection?enabled=0|1` à chaque changement et chaque minute. Elle suit les clips (éteinte en `off`, et en `night` hors nuit) : un mouvement sans clip n'a pas d'intérêt et la coupure économise le décodage.
- **Sensibilité** `motion_sensitivity` (1 à 5, défaut 3) : `PUT …/sensitivity?level=N`, à chaque changement et chaque minute (l'enregistreur la perd s'il redémarre). Détail : `../../motion/src/CLAUDE.md`.
- **Durée minimale** `motion_min_seconds` (0 à 30 s, défaut 1) : `PUT …/min-seconds?seconds=N`, même rythme. Un mouvement plus court n'ouvre aucun événement ; 0 = le premier compte.
- **Zone** : lit le document `zones` de `house_state` (écrit par l'API) et envoie `PUT …/zone` `{"points": ...}` au changement et chaque minute (`null` = toute l'image). Dossier non monté ou fichier abîmé : rien n'est envoyé.
- **Images** `snapshot_seconds` : 5, 10, 15, 30, 60, 120 ou 300 (`SNAPSHOT_CHOICES` ; l'API cherche à 5 min près) ; défaut `SNAPSHOT_INTERVAL_SECONDS`.
- **Directs** `live_fps` (4K) et `light_fps` (léger), de 1 à 25 (défaut 25), plus `*_mobile` pour les écrans de moins de 1024 px (flux `_m`).
  - Changés à chaud par `PATCH /api/streams` de go2rtc (`GO2RTC_URL`, défaut `http://go2rtc:1984`) : source `ffmpeg:<caméra>_main#video=mjpegN` (ou `_sub`), modèle déclaré dans `go2rtc/go2rtc.yaml`.
  - Vérifié chaque minute (go2rtc qui redémarre revient à 25).
- **Orientation** (`landscape` par défaut, ou `portrait`) : chaque événement garde celle de sa caméra à son début (`events.orientation`, posée par le déclencheur SQLite `events_orientation`).
  - **Migration unique** (`app_settings.orientation_migrated`, après copie `events.db.pre-orientation-<date>` par `VACUUM INTO`) : `voliere-exterieur` en paysage avant le 8 nov. 2026 11 h (Paris), portrait après ; tout le reste en paysage ; la caméra passe en portrait.
- **Ordre des caméras** : partout, ordre d'arrivée (`voliere-interieur`, `voliere-exterieur`, `salon-de-jardin`, `voliere-toit`) puis alphabétique : `cameraOrder.ts` (copie de `api/src/lib/cameraOrder.ts`).

### Mode pluie

- `rain_mode` par caméra : `off` ou `on` (anciens `auto`, `rain`, `heavy` valent `on`).
- `weather.ts` lit Open-Meteo toutes les 10 min (position de la maison) et en tire `none`, `rain`, `heavy` ou `fog` d'après le code météo et le cumul horaire :
  - brouillard : 45, 48 (les gouttelettes éclairées par l'infrarouge déclenchent la détection) ;
  - forte : 65, 67, 82, 95 à 99 ; normale : 63, 81 ou au moins 2,5 mm ;
  - **la pluie faible ne compte pas** (51 à 57, 61, 66, 80).
- `settings.setWeatherRain` range le niveau applicable (`rain_now`, `off` si mode éteint) ; l'API le rend dans `GET /direct`.
- `effectiveSettings` : en mode actif, **pas de clips** (détection coupée) et **une image toutes les 5 s**. Les réglages gardés ne changent jamais.

### Yeux qui brillent : retirés

La recherche des yeux qui brillent a été retirée en novembre 2026 (code, réglage, icône de la WebApp), puis **ses données ont été supprimées** à la demande de l'utilisateur : table `eye_detections`, colonnes `settings.eyes_mode` et `eyes_now`, événements de `label` `eyes` avec leurs clips et images. Copies sur le mini PC : `data/backup/events.db.before-eyes-removal-20261117` et `data/clips/events.json.before-eyes-removal-20261117`.

## Réglages globaux (table `app_settings`)

### Durée de garde

- Une durée pour tout : `CLIP_RETENTION_DAYS` (15 par défaut). `GET`/`PUT /api/retention` `{clip_retention_days}` de 1 à 3650 prend le dessus ; la page propose 7, 15, 30, 60, 90, 180.
- **Ménage une fois par jour à 04:00 Paris** (`purgeOldClips`, `PURGE_AT`), ou dès que possible si House Sync était arrêté ; jour fait noté dans `app_settings.clips_purged_on`. Un élément vit donc N jours plus presque 24 h : voulu.
- Il efface, au-delà de maintenant − N jours :
  - **clips non sauvegardés** (original, copie légère, son) dont `ended_at` est dépassé ; un fichier qui ne s'efface pas garde sa ligne (réessayé) ;
  - **images** (`purgeSnapshots`, fichiers et lignes, `taken_at`) ;
  - **journal Hue** (`hue_events`, `purgeHueLog`) ;
  - **événements sans clip** (`started_at`), y compris ceux dont le clip vient de partir ; un événement dont le clip est sauvegardé reste ;
  - lignes de `merges` (`merged_at`).
- Un clip **sauvegardé** n'est jamais effacé : document `saved-clips` de `house_state` (écrit par l'API, `savedClips.ts`).
- **Garde-fou** : dossier non monté ou fichier abîmé (`readSavedIds` rend null) : **rien n'est effacé**, jour non marqué, nouvel essai dans 10 min. Fichier absent dans un dossier existant = aucun clip sauvegardé.
- Les visites de la page invité ont leur durée : `GUEST_VISITS_DAYS` (365).
- Anciennes variables supprimées : `SNAPSHOT_RETENTION_DAYS`, `HUE_LOG_DAYS`.

### Page invité

- `guest_fps` (1 à 25, défaut 2) : images par seconde des flux de la page invité (vignettes légères et caméra agrandie 4K) ; `syncLiveFps` règle `<caméra>_guest_sub_mjpeg` et `_guest_main_mjpeg` de go2rtc.
- **Interrupteur** `guest_enabled` : House Sync écrit `{"enabled": bool}` dans `GUEST_STATE_FILE` (`/guest/state.json`, volume `./data/guest`, `guestState.ts`) ; la page invité ferme son port quand c'est faux. Sans fichier : en ligne ; illisible : coupée (`../../guest/CLAUDE.md`).
- **Lien** `guest_link` `{key, port, url}` dans `GET`/`PUT /api/guest` : vient de `GUEST_KEY`, `GUEST_PORT` (8090), `GUEST_PUBLIC_URL` (`.env`) ; `null` sans `GUEST_KEY`.

### Volets à servos

- `GET`/`PUT /api/servos` (`servos.ts`) : `{url, shutters: {"2": {up, down, stop}, "5": ..., "6": ...}}` : l'adresse de l'ESP32 des servos (commune, défaut `http://192.168.1.115`) et, par volet (n° dans `SHUTTERS` de l'API : 2 salon, 5 PC, 6 porte), `up` (Monter), `down` (Descendre), `stop` : `{channel, start, end, speed, hold}`. Défauts : salon = réglages validés à la main (canaux 0, 1, 2) ; PC (canaux 3, 4, 5) et porte (6, 7, 8) avec angles à 0 (rien ne bouge tant qu'ils ne sont pas saisis). Le `PUT` accepte un corps partiel (fusionné avec l'existant) ; refus 400 si un volet est inconnu, si l'adresse n'est pas http, le canal n'est pas un entier de 0 à 15, un angle sort de −90..90, ou la vitesse ou l'attente sont négatives ou non finies.
- `POST /api/servos/test` `{shutter, command, origin?}` (`servoTest.ts` ; `origin: true` met seulement le servo à 0° à la vitesse réglée, bouton « Origine ») : bouton « Tester » des réglages. Joue la séquence de l'ordre avec les réglages enregistrés, **directement** vers l'ESP32 des servos (même séquence que `api/src/lib/servoDriver.ts`, copie assumée : changer les deux) : `/set` vers le départ (vitesse réglée), attente, `/set` vers l'arrivée, attente, attente `hold`, retour au départ à vitesse 0, puis **relâche le servo** (`GET /off?ch=` après `ms + 800` : plus d'impulsion, donc ni ronronnement ni effort sur le bois). Répond 200 après le premier `/set` ; 502 si l'ESP32 ne répond pas, 400 si volet ou ordre inconnu. La suite est en tâche de fond ; un nouveau test sur le même canal l'annule.
- Stockage : le document `servos` de `house_state` (`servos.ts`), écrit ici, relu par l'API à chaque ordre. Le volume `./data/servos` n'est plus que l'ancien `servos.json`, repris une seule fois au démarrage. Sans document ou document faux : valeurs par défaut ; ancienne forme `{url, up, down, stop}` (salon seul) encore lue ; volets manquants aux défauts.

## Imports des autres services

**`house_state`** (`houseState.ts`) : une ligne par document de l'utilisateur (`key`, `value` JSON, `updated_at`), écrite par l'API ; au démarrage, Sync reprend une seule fois chaque ancien fichier de `data/house` (`HOUSE_DIR`) et `servos.json` dont la clé manque. Journaux du chauffage et des volets : `POST /api/journal/…` (plus bas).

Tous idempotents, fichiers lus en lecture seule. Un fichier absent ou abîmé ne touche pas la table.

- **Plan** : toutes les 30 s, le document `plan` de `house_state` (`plan.ts`) refait la table `plan` s'il a changé. Colonnes : `kind` (`arbre`, `haie`, `cage`, `decalage`, `objet`, `camera`), `id`, `x`, `y`, `data` (JSON). Le fichier reste la source.
- **Visites invité** : toutes les 15 s, `visits.jsonl` (`GUEST_VISITS_FILE`, volume `./data/guest-visits`, `guestVisits.ts`) vers `guest_visits`.
  - `kind` : `page`, `stream`, `refused` ; `origin` : maison, VPN, mini PC, internet ; `cle` : `avec clé`, `sans clé`, `clé fausse`.
  - Position lue dans `app_settings.guest_visits_offset` ; fichier qui a tourné relu depuis le début ; seules les lignes complètes comptent.
  - Au-delà de `GUEST_VISITS_DAYS`, supprimées chaque jour. Ce que la page écrit : `../../guest/CLAUDE.md`.
- **Journaux du chauffage et des volets** (plus d'import de fichier) : House API envoie chaque activation et chaque ordre à `POST /api/journal/heating` et `/api/journal/shutters` (clé `X-House-Key` ou session ; `heatingLog.ts`, `shutterLog.ts`), que Sync range dans `heating_log` (unicité `started_at`, `origin` ; `cost` **calculé par l'API** à l'activation, recopié tel quel) et `shutter_log` (`happened_at`, `shutter`, `name`, `command`, `ok`, `note` ; unicité `happened_at`, `shutter`, `command` ; `ok` à 0 : ESP32 muette ; `note` `simulation` sans radio). L'en-tête de la table du chauffage affiche les sommes (`sumsOf` de `data.ts`). Règles : `../../api/src/routes/CLAUDE.md`.
- **Box** (`boxWatcher.ts`, **pas un import** : Sync surveille lui-même) : toutes les 15 s, `GET /box` de l'API (`apiTargetOf`, `fetchApi` ; le jeton de la box reste chez l'API) vers `box_known` (la maison, photo des appareils actifs au premier tour), `box_guests` (les invités vus connectés) et `box_connections` (`happened_at`, `event` `connect`/`disconnect`, `mac`, `name`, `ip`, `type`, `vendor` ; unicité `happened_at`, `mac`, `event`). Au démarrage, reprise unique des anciens `box-known.json` et `box-guests.json` (`BOX_KNOWN_FILE`, `BOX_GUESTS_FILE`) si les tables sont vides. L'API écrit seulement l'ajout d'un appareil à la maison (action de l'utilisateur). Règles : `../../api/src/routes/CLAUDE.md` (« Invités de la box »).

## Énergie (estimations)

Hors polling : minuteur d'une minute dans `app.ts`. Entre deux relevés, on compte la **dernière valeur connue** × le temps écoulé, **plafonné à 5 min** (un trou après panne n'est pas rattrapé). Source absente : le tour est sauté, aucune valeur inventée. Tranches coupées à la minute entière, chacune dans une heure et un tarif (heure de Paris, `slicesOf` de `cameraEnergy.ts`).

- **Prix et heures creuses constants** : 0,1589 / 0,2142 €/kWh, 23:10 à 07:10 (`cameraEnergy.ts`), **identiques à `api/src/lib/heatingSettings.ts` : à tenir d'accord**.
- Tables (onglet Base), une ligne par entité et par heure, cumulées par UPSERT : colonnes `hour` (début d'heure ISO UTC), `wh_offpeak`, `wh_peak`, `cost`. Début du suivi : `app_settings.<x>_energy_since`.
- Chaque `GET /api/*-energy` rend aussi `watts`, la puissance actuelle (`create*Energy().current()`, null sans relevé).

| Module | Source | Table | Réponse |
|---|---|---|---|
| `cameraEnergy.ts` | `GET /poe` de l'API (`apiTargetOf`, `fetchCameraPower`) | `camera_energy` | `{since, cameras: [{camera, kwh, cost, watts}], total}` |
| `temperatureLog.ts` | météo (Open-Meteo), `GET /ac` (`roomTemp` de chaque pompe à chaleur), `GET /hue/sensors` (température de chaque détecteur) | `temperature_log` (`taken_at` début d'heure, puis une colonne par source : `meteo`, `clim_<nom>`, `hue_<nom>`, ajoutée au premier relevé) ; l'ancienne forme (une ligne par source) est gardée dans `temperature_log_long` | une ligne par heure (relevé tenté chaque minute tant que l'heure n'a aucune ligne) ; `/api/temperatures?days=7` → `{points}` pour le graphique sous la table |
| `heatingEnergy.ts` | la table `heating_log` (minutes allumées × 2000 W, coût du journal) | aucune (lecture seule) | `{since, kwh, cost, watts}` (watts : 2000 pendant une activation, 0 sinon), `/api/heating-energy` |
| `lampEnergy.ts` | `GET /hue` de l'API (`fetchLampPower`) | `lamp_energy` | `{since, lamps: [...], total}`, gourmande d'abord |
| `machineEnergy.ts` | `readCpuPower(config.powerFile)` (RAPL, `power/house-power.sh`) | `machine_energy` (`device` = `mini-pc`) | `{since, kwh, cost, watts}` |

- **Lampes** : `watts` est **calculé par l'API** (`hueWatts.ts`) ; lampe sans estimation ignorée, comme le groupe « À placer » (hors de `PLACED_LAMPS` de `power.ts`, **copie de `ZONES` dans `web/src/components/Lights/constants.ts`** : changer les deux) ; lampe citée par plusieurs pièces comptée une fois.
- **Mini PC** : **processeur seul** (pas de carte mère, SSD, ventilateurs) : la conso réelle est plus haute. Mesure absente ou de plus de 60 s : tour sauté.

## Journal des lampes Hue

- Flux d'événements du pont (`hueStream.ts`, API v2 HTTPS, certificat non vérifié, reconnexion auto) vers `hue_events` (`hueLog.ts`) : lampes, scènes, interrupteurs, mouvements, reconnexions. Températures, luminosité ambiante et piles ne sont pas gardées.
- Nom de lampe = nom de son **appareil**, comme la page Lumière.
- Origine **devinée** (`hueOrigin.ts` : `switch`, `sensor`, `rule`, `scene`, `power`, `device`, `unknown`) : le pont ne dit jamais qui commande ; `unknown` = appli Hue, WebApp, autre.
- Sans `HUE_BRIDGE_IP` ou `HUE_APP_KEY` : inactif (un message de log). Limites et origines : `../../docs/hue.md`.
