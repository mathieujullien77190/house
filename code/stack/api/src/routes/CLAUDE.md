# api/src/routes – les services de House API

Vue d'ensemble : `../../CLAUDE.md`. Clé, session, certificat : `../../../docs/securite.md`.

## Sans clé

- `GET /welcome`, `GET /rootCA.crt` (certificat **public** de la CA, `CA_CERT`), `/logout`.
- Le reste est derrière la clé ou la session (`SECURED_PATHS`), y compris `GET /openapi.json` (document OpenAPI 3) et `GET /docs` (Swagger UI).
- **Chaque route est décrite dans `../openapi/routes.ts`** (méthode, chemin `/x/{id}`, groupe, `secured`, paramètres, corps, erreurs) : à mettre à jour avec la route, un test le vérifie.
- `/auth` vérifie la clé et ouvre la session par cookie (renouvelée à chaque appel).

## Caméras, événements, images

- `GET /direct` : par caméra, orientation (réglage de House Sync, paysage par défaut), `rain` (`off`, `rain`, `heavy`, `fog`) et `eyes` (recherche des yeux en cours).
- `/events` : les 200 derniers ; `?last=1` ; `?saved=1` ; `?camera=&from=&to=` (secondes, 1000 au plus, `&limit=`).
- Un événement porte `saved`, `clip` (original H.265 4K), `clip_h264` (720p, null si absente), `clip_audio`, `clip_shapes`, `note`, `emoji`, `orientation`.
- Orientation `portrait` : la vidéo se lit tournée d'un quart de tour horaire ; null (base ancienne) = paysage.
- `GET /clips/:id`, `/h264`, `/audio` (AAC à part, lu dans `events.clip_audio_path`), `/shapes` (contours du mouvement, 404 pour un clip ancien).
- `PUT /clips/:id/saved` `{"saved": bool}` : House Sync n'efface jamais un clip sauvegardé ; `saved-clips.json` est lu par lui avant le ménage.
- `PUT /clips/:id/note` `{"note"}` : 200 caractères au plus, vide = supprime ; fichier `clip-notes.json` (à part, House Sync ne le lit pas).
- `PUT /clips/:id/emoji` `{"emoji"}` : un seul pictogramme, 16 caractères au plus, `null` = retire ; `clip-emojis.json`.
- 404 pour ces `PUT` si le clip n'existe pas.
- `/snapshots?camera=&from=&to=` ; `/snapshot?camera=&at=` : image la plus proche (tolérance 5 min), en-têtes `X-Snapshot-At` et `X-Snapshot-Code` (code posé par House Sync, l'API ne l'écrit pas).
- `/stream?camera=` : MJPEG relayé de go2rtc tant que le client reste connecté. `&quality=hd` : flux `<nom>_main_mjpeg` ; `&screen=mobile` : flux `…_mjpeg_m`.
- `/frame?camera=` : image à l'instant.
- `/audio?camera=` : AAC en flux continu (`/api/stream.aac` de go2rtc), seulement tant que le client reste connecté ; la WebApp l'ouvre au clic, jamais avant.

## Switch (PoE)

- `GET /poe` : par caméra, PoE activé, alimentée, watts, `streaming` (octets go2rtc qui augmentent = démarrée).
- `POST /poe/:camera` `{"on": bool}` ; 503 sans switch.
- Variables : `SWITCH_URL`, `SWITCH_USER`, `SWITCH_PASSWORD` (absent = PoE désactivé), `SWITCH_PORTS` (`voliere-exterieur:3,voliere-interieur:4`).
- Pas d'API officielle : le client imite la page web du firmware 1.0.1 (`logon.cgi`, `poe_port_config.cgi`, `logout.cgi`). Un autre firmware peut casser.
- Après un refus de connexion, aucun nouvel essai pendant 1 min (le switch pourrait verrouiller le compte).
- Couper le PoE éteint la caméra ; l'enregistreur réessaie jusqu'au retour du courant.

## Pont Hue

Détail des automatisations et du journal : `../../../docs/hue.md` (le journal est tenu par House Sync).

- `GET /hue` : pièces et lampes `{id, name, on, bri, reachable, color, watts}`.
- `color` : `#rrggbb` à pleine luminosité (`lib/hueColor.ts`), null sans couleur.
- `watts` : puissance **estimée** par `lib/hueWatts.ts` (0 si injoignable, 0,4 en veille, sinon veille + (max − veille) × (bri/254)², max par modèle) ; null si modèle inconnu. Une approximation.
- `GET /hue/sensors` : détecteurs avec température et luminosité.
- `GET /hue/automations` : règles du pont en phrases (API v2, certificat non vérifié : équipement du réseau).
- `GET`/`PUT /hue/positions` : positions fusionnées avec celles gardées (`lights-positions.json`).
- `PUT /hue/rooms/:id`, `PUT /hue/lights/:id` : `{"on"}` et/ou `{"bri": 1..254}`.
- 503 sans `HUE_BRIDGE_IP` et `HUE_APP_KEY` (clé : bouton du pont puis `POST http://<pont>/api` avec `{"devicetype":"house#mini"}`).

**Extinction en douceur** : `GET`/`POST`/`DELETE /hue/lights/<id>/fade`.

- Rend `{fading, ends_at, started_at, duration_seconds, from_bri}` (le pont annonce tout de suite la cible, la WebApp interpole).
- `POST {"minutes": 1..60}` (15 par défaut ; 409 si éteinte ou injoignable) : transition du pont (`transitiontime`) plus **minuteur du pont** (`house-fade-<id>`) qui éteint puis rend la luminosité d'avant (gardée dans la description : `bri=<n>`). L'API peut s'arrêter.
- `DELETE` supprime le minuteur et rend la luminosité d'avant en 2 s.

## Prise Kasa HS100

- `PLUG_HOST` (absent = 503), `PLUG_PORT` (9999). Protocole local (`lib/kasaClient.ts`), sans cloud.
- `GET /plug` : `{alias, model, on, rssi, onTime, timerSeconds, offOnMotion}`.
- `POST /plug {"on": false}` éteint (502 si muette).
- **Allumer sans durée est refusé (400)** : jamais allumée sans fin.
- `{"on": true, "minutes": 1..120}` (curseur WebApp 1 à 30) : c'est le **minuteur de la prise** (`count_down` Kasa), pas de l'API ; l'extinction a lieu même si l'API tombe.
- Si le minuteur ne se programme pas, la prise est rééteinte.
- Allumer ou éteindre pour de bon annule le minuteur en cours.

**Option « éteindre au mouvement »** (`"offOnMotion": true`, `services/plugService.ts`) :

- Lit toutes les 3 s le détecteur `PLUG_MOTION_SENSOR` (défaut `motion interieur`) et éteint au premier front montant (un mouvement déjà en cours à l'armement ne compte pas).
- Puis l'option s'efface ; état dans `plug-guard.json` (survit au redémarrage) ; 503 sans pont Hue. Dépend de l'API et du pont, contrairement au minuteur.
- **Le chauffage automatique l'arme toujours** : un mouvement qui coupe un chauffage de la règle **désactive la règle** (`enabled: false`, `onAutoCut`) ; réactivation à la main. Un allumage manuel coupé ne touche pas à la règle (`origin` dans `plug-guard.json`).

**Retrouver la prise** : `PLUG_MAC` (défaut `D8:0D:17:1C:84:E3`). Si `PLUG_HOST` ne répond plus, scan du port 9999 du `/24`, reconnaissance par MAC dans `get_sysinfo`, nouvelle adresse gardée jusqu'au redémarrage (un scan par minute au plus).

## Chauffage automatique

Fichiers : `services/heatingService.ts`, `lib/heatingSettings.ts`, `heatingLog.ts`, `heatingCost.ts`, `sun.ts`.

**Règle** : un tour toutes les 60 s ; elle fait `plug.startTimer(minutes)` quand tout est vrai :

- règle activée ;
- température de la volière sous le seuil ;
- nuit (coucher à lever du soleil pour `HOUSE_LATITUDE` / `HOUSE_LONGITUDE`, 48,52 et 2,64 par défaut) ;
- prise éteinte ;
- au moins `cooldownMinutes` depuis le **début** de la dernière activation du journal (toute origine).

Défauts : seuil 3 °C, 5 min allumée, délai 20 min, règle activée. C'est le minuteur de la prise qui éteint. Un geste direct sur la prise (bouton, appli Kasa) n'est ni vu ni noté.

**Température** : détecteur Hue `PLUG_TEMPERATURE_SENSOR` (défaut : le nom de `PLUG_MOTION_SENSOR`). Inconnue ou pont injoignable : pas de chauffage, une ligne de log par panne. Sans `HUE_*`, la règle ne tourne pas.

**Routes** :

- `GET /plug/heating` : `{enabled, thresholdC, minutes, cooldownMinutes, lastActivationAt, nextAllowedAt, temperature, night, cold}` ; 503 sans prise ou sans pont.
- `PUT /plug/heating` : une valeur absente garde l'ancienne ; 400 sinon : `thresholdC` de -30 à 30, `minutes` entier 1 à 120, `cooldownMinutes` entier entre `minutes` et 1440.
- Prix, heures creuses et puissance ne sont **pas** des réglages (ignorés). Fichier `heating.json` (écriture temporaire puis renommage ; absent ou abîmé = défauts).
- `GET /plug/log?limit=50` : journal, récent d'abord (1 à 500, 400 sinon ; 503 sans prise).

**Journal** `heating-log.jsonl` :

- Une ligne par activation commandée par notre système : `{at, origin: "auto"|"manuel", minutes, temperature, note, cost}`.
- Écrit par `plugService` à chaque `startTimer` réussi ; 5000 lignes gardées ; ligne abîmée ignorée.
- Seul House Sync écrit la base : il importe ce fichier (`../../../sync/src/CLAUDE.md`).

**Coût** (`cost`) : calculé **à l'activation** et figé (le tarif d'aujourd'hui ne change pas le passé).

- `HEATER_WATTS` / 1000 × heures × prix du kWh, 4 décimales (5 min à 2000 W en heures creuses : 0,0265 €).
- Constantes de `lib/heatingSettings.ts`, **recopiées dans `sync/src/cameraEnergy.ts` : à tenir d'accord**.
- Prix TTC : 0,1589 €/kWh en heures creuses, 0,2142 € en heures pleines (TotalEnergies, tarifs du 8 nov. 2026).
- Heures creuses 23:10 à 07:10, heure de Paris (Enedis). Chauffage 2000 W (`HEATER_WATTS` ; la HS100 ne mesure rien).
- Anciennes lignes sans coût : `cost: null`.

## Zones de surveillance

- `GET /zones` : `{"<caméra>": [[x, y], ...]}` (3 à 1000 sommets, parts de l'image 0 à 1).
- `PUT /zones/<caméra>` `{"points": [...]}` ou `null` (toute l'image).
- `zones.json` (écriture temporaire puis renommage) ; House Sync le lit et le donne à l'enregistreur.

## Repères de caméras

- `GET /markers` : `{"<caméra>": [{target, x, y}, ...]}`, 8 au plus, `x` et `y` de -0,5 à 1,5 (hors vidéo permis).
- `PUT /markers/<caméra>` `{"markers": [...]}` ou `null` (places de départ). Fichier `markers.json`.

## Plan de la maison

- `GET /plan` : `{"plan": {...}}` ou `{"plan": null}` ; `PUT /plan` remplace (128 ko au plus). Fichier `plan.json`, seul ce qui est bien formé est gardé (7 décimales).
- **Positions en longitude/latitude** (`version`: 2), tailles en mètres, angles en caps (degrés depuis le nord).
- House Sync l'importe dans la table `plan`.

## Clip à la main (`routes/record.ts`)

- `GET`/`POST`/`DELETE /record/<caméra>` relaient l'enregistreur (`RECORDER_URL`, `http://motion:8080`) : 503 sans lui, 502 s'il ne répond pas, 409 à l'arrêt sans enregistrement, arrêt auto à 3 min.
- Au `POST`, l'API **ajoute le clip aux clips sauvegardés** : un clip voulu n'est jamais effacé.

## Climatisations Mitsubishi (`/ac`)

Fichiers : `services/acService.ts`, `lib/mitsubishiClient.ts`.

- Module Wi-Fi MAC-577IF-E, API **locale** sans cloud : `POST http://<ip>/smart`, XML chiffré AES-128-CBC (clé par défaut d'un module non enregistré), IV devant le chiffré, base64 dans `<ESV>`.
- Réponse en trames hexadécimales (CN105) : type `0x02` (alimentation, mode, consigne, ventilateur), `0x03` (température). Octet de contrôle : `0xFC` moins la somme des octets.
- Le module refuse (403) `fetch` : le client passe par `node:http`. Une file par module.
- `AC_UNITS="chambre-invite:Chambre invité:192.168.1.130"` (id, nom, adresse) ; vide = 503. Réserver l'adresse de chaque module dans la Freebox.
- `GET /ac` : `{units: [{id, name, reachable, power, mode, targetTemp, roomTemp, fan, vane, wideVane}]}` ; injoignable : `reachable: false`. État en cache 3 s.
- Valeurs : `mode` heat/cool/dry/fan/auto ; `fan` auto/quiet/1 à 4 ; `vane` auto/1 (haut) à 5 (bas)/swing ; `wideVane` left/left-center/center/right-center/right/swing.
- `POST /ac/<id>` : un ou plusieurs de `on`, `mode`, `temperature` (16 à 31, pas de 0,5), `fan`, `vane`, `wideVane` ; les autres ne bougent pas (trame `0x41`, octets de drapeaux).
- Rend l'état d'avant avec le changement appliqué, **sans relire** (le module met 2 à 3 s). 404 unité inconnue, 400 corps vide ou faux, 502 injoignable.

## Freebox (`/box`)

Fichiers : `lib/freebox.ts` (client), `services/boxService.ts`, `routes/box.ts`. API locale v16 de la box (Freebox Pop v8), HTTP, sans cloud.

- `FREEBOX_URL` (défaut `http://mafreebox.freebox.fr`, joignable depuis le conteneur), `FREEBOX_APP_ID` (`fr.house.home`), `FREEBOX_APP_TOKEN` (**secret**, `.env` du mini PC, jamais dans une réponse ni un log). Jeton absent : non configurée.
- Session : défi de `/login/`, mot de passe = HMAC-SHA1(jeton, défi) en hexadécimal, `/login/session/` ; `session_token` en cache dans l'en-tête `X-Fbx-App-Auth`, renouvelé une fois sur 403 / `auth_required`. Délai de 5 s par requête.
- `GET /box` : `{configured, reachable, model, firmware, uptime, connection: {state, type, ipv4, rateDown, rateUp}, wifi: {enabled}, devices: [{name, ip, mac, active, type, vendor}]}`. Débits en octets par seconde, `uptime` en secondes. Appareils actifs d'abord, puis par nom.
- Sans jeton : 200 avec `configured: false`. Les quatre lectures (`/system/`, `/connection/`, `/wifi/config/`, `/lan/browser/pub/`) sont indépendantes ; aucune ne répond : `reachable: false`.
- `PUT /box/wifi` `{"enabled": bool}` (droit `settings` de l'application) : rend `{enabled}` ; 400 corps faux, 503 non configurée, 502 box muette ou droit refusé.

## Télécommande TV (`/tv`)

Fichiers : `lib/tvRemote.ts` (client injectable), `tvWire.ts` / `tvMessages.ts` (protobuf écrit à la main), `tvKeys.ts`, `tvCert.ts`, `tvStore.ts`, `routes/tv.ts`. Le Freebox Player POP tourne sous Android TV : il n'a **pas** de « code télécommande réseau » (l'ancienne API `hd1.freebox.fr/pub/remote_control` est abandonnée). On parle le protocole **Android TV Remote v2** (celui de l'appli Google TV).

- **Implémentation maison**, sans bibliothèque : `androidtv-remote` (npm) est abandonné depuis 2022 et tire `systeminformation`, `crypto-js`, `node-forge` 0.10 et `protobufjs` 6 ; `androidtvremote2` n'existe pas sur npm. Les messages sont ceux des `.proto` de tronikos/androidtvremote2 (Apache-2.0). Aucune dépendance ajoutée (`node:tls`, `node:crypto`).
- `TV_HOST` : adresse du Player, `192.168.1.47` par défaut (réserver l'adresse dans la Freebox). Plus de secret dans l'environnement.
- **Appairage** (port 6467) : TLS avec un certificat client neuf ; `pairing_request` → `options` → `configuration` (code hexadécimal de 6 caractères, rôle INPUT) ; la TV affiche le code. Le client répond par `SHA-256(modulo + exposant du client, modulo + exposant de la TV, code sans ses 2 premiers caractères)` ; le premier octet du hash doit valoir les 2 premiers caractères du code : un code faux est détecté **sans rien envoyer** et peut être ressaisi. Un appairage ouvert expire après 5 min. À la réussite, `tvStore` écrit `STATE_DIR/tv/client.key` (0600) et `client.crt`.
- **Télécommande** (port 6466) : TLS avec ce certificat, poignée de main (`remote_configure`, `remote_set_active`), ping de la TV à répondre. La connexion est gardée ouverte (fermée après 60 s sans touche, jugée morte après 20 s de silence) ; une touche = `remote_key_inject` (KeyCode Android, `SHORT`) ; appui long = `START_LONG`, 800 ms, `END_LONG`.
- `GET /tv` : `{configured, paired, online, name?}`. `paired` = certificat présent ; `online` = `active` du Player dans `/lan/browser/pub/` de la box (l'appareil dont le nom contient « Player » ; le Freebox Server est aussi de type `freebox_pop`), `null` si inconnu ; `name` = son nom dans la box. Aucune connexion au Player pour cet état (il est souvent éteint ou en veille).
- `POST /tv/pair/start` : le Player affiche le code sur la TV. `POST /tv/pair/code` `{"code"}` : termine et garde le certificat. `DELETE /tv/pair` : oublie le certificat. `POST /tv/key` `{"key", "long"?}` : liste blanche `TV_KEYS` (mêmes noms qu'avant : power, up, down, left, right, ok, back, home, vol_inc, vol_dec, mute, prgm_inc, prgm_dec, 0 à 9, play, prev, next, bwd, fwd, rec, info, epg, red, green, yellow, blue, options, list, media, tv, swap, mail, help, pip) mappée sur un KeyCode Android (`lib/tvKeys.ts`).
- Erreurs (corps `{error, reason}`, jamais de détail interne) : 400 corps ou code mal formé, 409 aucun appairage ouvert / Player non appairé, 422 code faux, 502 Player éteint, injoignable ou appairage refusé, 503 sans service (tests), 504 le Player ne répond pas.
- Le certificat, la clé et le code ne figurent dans aucune réponse, aucun message d'erreur, aucun log (`../../../docs/securite.md`). L'état détaillé (chaîne, volume) n'est pas lu.
- Tests : TV simulée par des sockets en mémoire (`lib/tvRemote.test.ts`) ; seul `connectTls` est testé en boucle locale, jamais contre le Player.

## Invités de la box (`/box/guests`, `/box/known`)

Fichiers : `services/boxWatcher.ts`, `lib/boxConnectionLog.ts`, `lib/boxKnownStore.ts`, `lib/boxGuestsStore.ts`. Lecture de la Freebox en GET seulement, sauf l'exclusion d'un invité (plus bas).

- **La maison** : au tout premier démarrage (pas de `box-known.json`), la photo des appareils **actifs** à cet instant (MAC, nom, IP) est écrite dans `box-known.json` ; le surveillant ne la réécrit jamais ensuite. Le nom du fichier est resté « known » (il existait avant le mot « maison »).
- **Invité** = tout appareil dont la MAC n'est pas dans la maison. Dès qu'il est vu connecté il entre dans `box-guests.json` (`mac`, `name`, `ip`, `type`, `vendor`, `firstSeen`, `lastSeen` en secondes), y reste **même hors ligne** jusqu'à ce qu'on l'ajoute à la maison ; `lastSeen`, nom et adresse sont remis à jour à chaque lecture où il est actif (écrits au plus une fois par minute, sauf nouvel invité ou changement de nom, d'adresse ou de type). Un invité déjà connecté au démarrage de l'API entre dans la liste dès la première lecture, sans ligne de journal.
- Un tour toutes les 15 s : pour chaque invité **actif** qui ne l'était pas à la lecture d'avant, une ligne `connect` ; pour chaque invité parti (inactif ou disparu de la liste), une ligne `disconnect`. Plusieurs appareils d'un même tour = plusieurs lignes.
- Journal `box-connections.jsonl` : `{at, event, mac, name, ip, type, vendor}` (`at` en secondes), 5000 lignes gardées, importé par House Sync dans `box_connections` (`BOX_LOG_FILE` côté House Sync). Les noms de ces fichiers et de la table viennent d'avant le mot « invité » : ils restent.
- **Compromis** : l'état précédent n'est gardé qu'en mémoire. La première lecture après un démarrage de l'API ne logge rien ; une connexion ou déconnexion pendant un redémarrage n'est pas notée, et un invité resté connecté n'est pas re-loggé. Une lecture qui échoue ne change rien (pas de fausse déconnexion).
- `GET /box/guests?limit=100` (1 à 500, 400 sinon ; 503 sans box) : `{filterState, guests: [{mac, name, ip, type, vendor, firstSeen, lastSeen, active, excluded}], events}`, invités les plus récemment vus d'abord, événements du plus récent au plus ancien. `filterState` (`disabled`, `blacklist`, `whitelist`) et `excluded` viennent de la box (lecture) ; null quand elle ne répond pas.
- `GET /box/known` : `{home: [{mac, name, ip}]}`. `PUT /box/known` `{"mac"}` : ajoute l'appareil à la maison (écrit `box-known.json`, retire l'invité de `box-guests.json`, la box n'est pas touchée) et rend `{mac, name, ip}` ; 400 MAC fausse, 503 sans box ou photo de départ pas encore prise. Il ne génère plus de lignes.
- `PUT /box/guests/<mac>/exclude` `{"excluded": bool}` : **seule écriture de la box de ce bloc**, par le filtrage MAC **du WiFi** (un appareil branché par câble n'est pas touché). Droit « Modification des réglages » de l'application Freebox requis.
  - Exclure : si le mode du filtrage (`/wifi/config/` `mac_filter_state`) est `disabled`, `PUT /wifi/config/` `{mac_filter_state: "blacklist"}` ; puis `POST /wifi/mac_filter/` `{mac, type: "blacklist", comment: "House : invité exclu"}` (rien si la MAC y est déjà). Mode `whitelist` : **409**, la box n'est pas modifiée.
  - Réadmettre : `DELETE /wifi/mac_filter/<id>` de chaque entrée liste noire de la MAC. Le mode du filtrage n'est pas remis à `disabled`.
  - 400 MAC fausse, corps faux, ou MAC de la maison (dont le mini PC et la box : ils y sont) ; 404 si ce n'est pas un invité de la liste ; 502 box muette ou droit refusé (message lisible) ; 503 sans box.

## Volets roulants (`/shutters`)

Somfy RTS via ESP32 + CC1101 (firmware ESPSomfy-RTS ; onglet Architecture, vue « Volet »). **Simulation tant que `SHUTTERS_ESP_URL` est absent.**

- `GET /shutters` : `{mock, shutters: [{id, name, lastCommand, lastAt, closeSeconds, halfRunning, auto}]}` ; 503 sans volet.
- `POST /shutters/<id>` `{"command": "up"|"down"|"stop"}` ; 400 ordre inconnu, 404 volet inconnu, 502 ESP32 muette.
- Le RTS ne dit pas où est le volet : le dernier ordre vient du journal au démarrage.
- Configuration : `SHUTTERS="1:Salon,2:Chambre"` (numéro dans le firmware = identifiant, puis nom ; défaut : PC 1, salon 2, porte 3, cuisine 4) et `SHUTTERS_ESP_URL` (ex. `http://192.168.1.60`).

**Fermer à moitié** : `POST /shutters/<id>/half` (202 ; 404, 409 sans temps de fermeture, 502).

- Le RTS est à sens unique : c'est le **temps** qui fait la moitié.
- `up`, attente temps de fermeture **+ 6 s**, `down`, attente de la moitié du temps, `stop` (19 s : monter 25 s, descendre 9 s).
- Le premier ordre part avant la réponse ; la suite tourne en tâche de fond (`closeHalf` de `services/shuttersService.ts`) et chaque ordre est journalisé.
- **Tout autre ordre au même volet l'annule.** Un redémarrage de l'API perd la suite.
- Temps de fermeture dans `SHUTTERS` : `SHUTTERS="1:Volet cuisine:19"` (3ᵉ partie facultative ; sans elle, pas de bouton).

**Action automatique** (`services/shuttersAutoService.ts`, `shutters-auto.json`, désactivée par défaut) :

- Pour les volets de `SHUTTERS_AUTO` (défaut tous) : **ouvrir au lever**, **fermer au coucher**, deux options séparées, volet par volet.
- `auto` de `GET /shutters` : `null` (pas d'action) ou `{open, close}`. `PUT /shutters/<id>/auto` `{"open"?, "close"?}` ; 404 / 400.
- Un tour par minute (`crossedEvents`, `lib/sun.ts`) ; notes de journal « auto : lever du soleil » / « coucher ».
- Un lever manqué (API arrêtée) est joué s'il date de moins de 2 h. **Activer après un lever ne l'ouvre pas.**
- Ancien fichier avec une seule case `enabled` : vaut pour les deux options.

**Pilote** (`lib/shutterDriver.ts`) : `createMockDriver` (simulation) et `createEspSomfyDriver` (HTTP `PUT /shadeCommand` `{"shadeId": 1, "command": "up"}`, sans authentification, `stop` envoyé comme `my` ; vérifié sur le volet cuisine).

**Journal** `shutters-log.jsonl` (5000 lignes) : `{at, shutter, name, command, ok, note}`, importé par House Sync dans `shutter_log`.
