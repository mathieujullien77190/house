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
7. **Réglages** (`control.ts`), imports (plan, visites invité, journaux chauffage et volets : `imports.ts`), puis ménage quotidien.
8. **Images** toutes les `SNAPSHOT_INTERVAL_SECONDS` (60 s, réglable par caméra, minuteur d'1 s) : dernière image de chaque caméra (720 px) dans `snapshots`.

**Code permanent des images** (`snapshots.code`, `snapshotCodes.ts`) :

- Lettre de la caméra (a `voliere-interieur`, b `voliere-exterieur`, c `salon-de-jardin`, d `voliere-toit` ; une autre prend e, f… dans `app_settings` `snapshot_camera_<caméra>`), puis numéro d'ordre en lettres (1 = a, 26 = z, 27 = aa, 703 = aaa) : `aa`, `bz`, `daa`.
- Compteur `snapshot_seq_<caméra>` : ne fait que monter, un code n'est jamais réutilisé ; un doublon `(caméra, instant)` n'en consomme pas.
- Au démarrage (`initDatabase`) : colonne et index unique ajoutés, images sans code numérotées par `taken_at`. Aucun fichier renommé.

**Délais** : requête vers un enregistreur coupée à 15 s (120 s pour un clip). Une caméra qui ne répond pas est sautée sans bloquer les autres (PoE coupé ne fige pas le tour). Copie en `.part` renommé à la fin ; un clip qui échoue est retenté.

## Réglages par caméra (table `settings`)

`GET`/`PUT /api/settings` avec `{camera, clips_mode?, snapshot_seconds?, live_fps?, light_fps?, live_fps_mobile?, light_fps_mobile?, motion_sensitivity?, motion_min_seconds?, rain_mode?, eyes_mode?, orientation?}`. Interface : `../web/src/components/SettingsSection/CLAUDE.md`.

- **Clips** `clips_mode` : `always` (défaut), `night` ou `off` (`clips_enabled` pour les anciennes bases).
  - `night` : seuls les événements commençant entre 30 min avant le coucher et 30 min après le lever ont leur clip (`sun.ts`, copie de `api/src/lib/sun.ts` ; `HOUSE_LATITUDE` / `HOUSE_LONGITUDE`, 48,52 et 2,64).
  - `off` ou hors nuit : `copyClip` ne copie rien, les événements restent sans clip ; ceux des dernières heures sont copiés si on rallume.
  - Ce réglage n'efface rien (seule la durée de garde efface).
- **Clip à la main** (`manual`) : toujours copié, quel que soit `clips_mode` (`isManual` dans `copyClip`) ; sauvegardé d'office par l'API.
- **Détection** (`control.ts`) : `PUT <enregistreur>/api/cameras/<caméra>/detection?enabled=0|1` à chaque changement et chaque minute. Elle suit les clips (éteinte en `off`, et en `night` hors nuit) : un mouvement sans clip n'a pas d'intérêt et la coupure économise le décodage.
- **Sensibilité** `motion_sensitivity` (1 à 5, défaut 3) : `PUT …/sensitivity?level=N`, à chaque changement et chaque minute (l'enregistreur la perd s'il redémarre). Détail : `../../motion/src/CLAUDE.md`.
- **Durée minimale** `motion_min_seconds` (0 à 30 s, défaut 1) : `PUT …/min-seconds?seconds=N`, même rythme. Un mouvement plus court n'ouvre aucun événement ; 0 = le premier compte.
- **Zone** : lit `zones.json` (écrit par l'API dans `data/house`, monté en `/house`, `ZONES_FILE`) et envoie `PUT …/zone` `{"points": ...}` au changement et chaque minute (`null` = toute l'image). Dossier non monté ou fichier abîmé : rien n'est envoyé.
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
- `effectiveSettings` : en mode actif, **pas de clips** (détection coupée) et **une image toutes les 5 s**. Exception : les événements des yeux gardent leur clip. Les réglages gardés ne changent jamais.

### Yeux qui brillent (`eyes.ts`)

- `eyes_mode` par caméra : `off` (défaut) ou `on` (ancien `night` migré à l'ouverture de la base, encore accepté par `PUT`).
- Actif seulement en pleine nuit : de 30 min **après** le coucher à 30 min **avant** le lever (`isNight` à marge négative, `EYES_MARGIN_SECONDS`, `settings.eyesActive`) : le contraire des clips de nuit.
- Chaque image prise est envoyée à `POST /api/eyes` de l'enregistreur (délai 8 s ; règle de détection : `../../motion/src/CLAUDE.md`, point 11).
- Si un œil (ou deux : `pair`) est trouvé :
  - une ligne dans `eye_detections` (`camera`, `taken_at`, `path`, `x`, `y`, `size`, `peak`, `contrast`, `pair`, `distance`), une par caméra et par minute au plus ;
  - **un événement de mouvement** : `POST …/trigger?reason=eyes` (point 12 de `../../motion/src/CLAUDE.md`), un appel par caméra toutes les 30 s au plus.
- L'image de la détection est **réécrite avec un carré rouge** autour de l'œil (`POST /api/eyes/mark` de l'enregistreur, `mark` dans `eyes.ts`) ; si le dessin échoue, l'image reste telle quelle.
- Le clip n'est copié que si `keepsClip` le veut. Une panne de l'enregistreur est loguée une fois et ne bloque pas la prise d'image.
- Lignes et images suivent la durée de garde (`purgeSnapshots`).
- `settings.eyes_now` (0/1) : recherche en cours ; rangé chaque minute par `settings.refreshEyes` (minuteur de `app.ts`) et après un changement ; l'API le rend dans `GET /direct` (`eyes`).
- Colonnes `eyes_mode` et `eyes_now` ajoutées au démarrage : **déployer House Sync avant House API**.

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
- Un clip **sauvegardé** n'est jamais effacé : liste dans `saved-clips.json` (écrit par l'API dans `data/house`, `/house` en lecture seule, `SAVED_CLIPS_FILE`, `savedClips.ts`).
- **Garde-fou** : dossier non monté ou fichier abîmé (`readSavedIds` rend null) : **rien n'est effacé**, jour non marqué, nouvel essai dans 10 min. Fichier absent dans un dossier existant = aucun clip sauvegardé.
- Les visites de la page invité ont leur durée : `GUEST_VISITS_DAYS` (365).
- Anciennes variables supprimées : `SNAPSHOT_RETENTION_DAYS`, `HUE_LOG_DAYS`.

### Page invité

- `guest_fps` (1 à 25, défaut 2) : images par seconde des flux de la page invité (vignettes légères et caméra agrandie 4K) ; `syncLiveFps` règle `<caméra>_guest_sub_mjpeg` et `_guest_main_mjpeg` de go2rtc.
- **Interrupteur** `guest_enabled` : House Sync écrit `{"enabled": bool}` dans `GUEST_STATE_FILE` (`/guest/state.json`, volume `./data/guest`, `guestState.ts`) ; la page invité ferme son port quand c'est faux. Sans fichier : en ligne ; illisible : coupée (`../../guest/CLAUDE.md`).
- **Lien** `guest_link` `{key, port, url}` dans `GET`/`PUT /api/guest` : vient de `GUEST_KEY`, `GUEST_PORT` (8090), `GUEST_PUBLIC_URL` (`.env`) ; `null` sans `GUEST_KEY`.

## Imports des autres services

Tous idempotents, fichiers lus en lecture seule. Un fichier absent ou abîmé ne touche pas la table.

- **Plan** : toutes les 30 s, `plan.json` (`PLAN_FILE`, `plan.ts`) refait la table `plan` s'il a changé. Colonnes : `kind` (`arbre`, `haie`, `cage`, `decalage`, `objet`, `camera`), `id`, `x`, `y`, `data` (JSON). Le fichier reste la source.
- **Visites invité** : toutes les 15 s, `visits.jsonl` (`GUEST_VISITS_FILE`, volume `./data/guest-visits`, `guestVisits.ts`) vers `guest_visits`.
  - `kind` : `page`, `stream`, `refused` ; `origin` : maison, VPN, mini PC, internet ; `cle` : `avec clé`, `sans clé`, `clé fausse`.
  - Position lue dans `app_settings.guest_visits_offset` ; fichier qui a tourné relu depuis le début ; seules les lignes complètes comptent.
  - Au-delà de `GUEST_VISITS_DAYS`, supprimées chaque jour. Ce que la page écrit : `../../guest/CLAUDE.md`.
- **Chauffage** : toutes les 30 s, `heating-log.jsonl` (`HEATING_LOG_FILE`, `heatingLog.ts`) vers `heating_log`.
  - Unicité (`started_at`, `origin`). `cost` est **calculé par l'API** à l'activation et recopié tel quel : aucune logique de tarif ici.
  - Le fichier garde 5000 lignes, la table tout. L'en-tête de la table affiche les sommes (`sumsOf` de `data.ts`, `heating_log` seulement). Règles : `../../api/src/routes/CLAUDE.md`.
- **Volets** : toutes les 30 s, `shutters-log.jsonl` (`SHUTTER_LOG_FILE`, `shutterLog.ts`) vers `shutter_log` (`happened_at`, `shutter`, `name`, `command`, `ok`, `note`). Unicité (`happened_at`, `shutter`, `command`). `ok` à 0 : ESP32 muette ; `note` `simulation` sans radio.
- **Invités de la box** : toutes les 30 s, `box-connections.jsonl` (`BOX_LOG_FILE`, `boxConnections.ts`) vers `box_connections` (`happened_at`, `event` `connect`/`disconnect`, `mac`, `name`, `ip`, `type`, `vendor`). Unicité (`happened_at`, `mac`, `event`). Table créée par `CREATE TABLE IF NOT EXISTS` : les bases existantes ne sont pas touchées. Les noms viennent d'avant le mot « invité » et ont été gardés. Règles côté API : `../../api/src/routes/CLAUDE.md` (« Invités de la box »).

## Énergie (estimations)

Hors polling : minuteur d'une minute dans `app.ts`. Entre deux relevés, on compte la **dernière valeur connue** × le temps écoulé, **plafonné à 5 min** (un trou après panne n'est pas rattrapé). Source absente : le tour est sauté, aucune valeur inventée. Tranches coupées à la minute entière, chacune dans une heure et un tarif (heure de Paris, `slicesOf` de `cameraEnergy.ts`).

- **Prix et heures creuses constants** : 0,1589 / 0,2142 €/kWh, 23:10 à 07:10 (`cameraEnergy.ts`), **identiques à `api/src/lib/heatingSettings.ts` : à tenir d'accord**.
- Tables (onglet Base), une ligne par entité et par heure, cumulées par UPSERT : colonnes `hour` (début d'heure ISO UTC), `wh_offpeak`, `wh_peak`, `cost`. Début du suivi : `app_settings.<x>_energy_since`.
- Chaque `GET /api/*-energy` rend aussi `watts`, la puissance actuelle (`create*Energy().current()`, null sans relevé).

| Module | Source | Table | Réponse |
|---|---|---|---|
| `cameraEnergy.ts` | `GET /poe` de l'API (`apiTargetOf`, `fetchCameraPower`) | `camera_energy` | `{since, cameras: [{camera, kwh, cost, watts}], total}` |
| `lampEnergy.ts` | `GET /hue` de l'API (`fetchLampPower`) | `lamp_energy` | `{since, lamps: [...], total}`, gourmande d'abord |
| `machineEnergy.ts` | `readCpuPower(config.powerFile)` (RAPL, `power/house-power.sh`) | `machine_energy` (`device` = `mini-pc`) | `{since, kwh, cost, watts}` |

- **Lampes** : `watts` est **calculé par l'API** (`hueWatts.ts`) ; lampe sans estimation ignorée, comme le groupe « À placer » (hors de `PLACED_LAMPS` de `power.ts`, **copie de `ZONES` dans `web/src/components/Lights/constants.ts`** : changer les deux) ; lampe citée par plusieurs pièces comptée une fois.
- **Mini PC** : **processeur seul** (pas de carte mère, SSD, ventilateurs) : la conso réelle est plus haute. Mesure absente ou de plus de 60 s : tour sauté.

## Journal des lampes Hue

- Flux d'événements du pont (`hueStream.ts`, API v2 HTTPS, certificat non vérifié, reconnexion auto) vers `hue_events` (`hueLog.ts`) : lampes, scènes, interrupteurs, mouvements, reconnexions. Températures, luminosité ambiante et piles ne sont pas gardées.
- Nom de lampe = nom de son **appareil**, comme la page Lumière.
- Origine **devinée** (`hueOrigin.ts` : `switch`, `sensor`, `rule`, `scene`, `power`, `device`, `unknown`) : le pont ne dit jamais qui commande ; `unknown` = appli Hue, WebApp, autre.
- Sans `HUE_BRIDGE_IP` ou `HUE_APP_KEY` : inactif (un message de log). Limites et origines : `../../docs/hue.md`.
