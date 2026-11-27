# volet-clim – boîtier volet + clim sur un seul ESP32

Firmware (Arduino, PlatformIO) d'un boîtier **indépendant de la pile de la maison** : prévu pour la maison d'un proche (Freebox, rien à voir avec nos conteneurs). Un ESP32 sert une page web et pilote :

- des **volets Somfy RTS** par un module radio **CC1101** (433 MHz), comme une télécommande de plus (`src/somfy.cpp`) ;
- une **pompe à chaleur Mitsubishi sans Wi-Fi** par une LED **infrarouge** (`src/aircon.cpp`, bibliothèque IRremoteESP8266).

Câblage et schémas : onglet « Volet + clim » du site (`code/stack/site`, `RemoteBoxSystem` et `RemoteBox3D`), à garder d'accord avec `src/config.h`.

## État

Compile (PlatformIO, ESP32 `esp32dev`). **Testé sur le matériel** : appairage et ordres d'un volet Somfy RTS (radio CC1101). **Testé aussi** (27 nov. 2026) : la LED infrarouge, sur une Mitsubishi Electric MSZ-AY de la maison, avec la famille `mitsubishi_ac` : l'ordre est reçu en ligne de mire (vérifié en relisant la clim par son module Wi-Fi, qui met une quinzaine de secondes à annoncer le changement). **Pas encore testés** : la clim du proche (MSZ-SF35VE, même famille attendue), les horaires du volet et les programmes de la clim. Chaque moitié se teste seule (le boîtier marche sans LED IR, et sans CC1101).

## Fichiers

```
platformio.ini     carte, bibliothèques, mise à jour sans fil (env ota)
src/config.h       broches, nombre de volets (1 pour l'instant), adresse RTS de base, noms réseau
src/somfy.*        la télécommande Somfy RTS (trame, code tournant en flash, CC1101)
src/aircon.*       la clim : état voulu vers la télécommande infrarouge
src/page.h         la page web (HTML + JS embarqués)
src/main.cpp       Wi-Fi, OTA, API JSON, serveur web
tools/mock-server.cjs  maquette de la page sur le PC (`node tools/mock-server.cjs`, http://localhost:8099) : simule l'API, sans matériel
```

## Broches (ESP32 à 38 broches)

CC1101 : SCK 18, MISO 19, MOSI 23, CSN 5, GDO0 13 (émission), GDO2 12 (réception, inutilisée) ; alimenté en **3,3 V**. LED IR : G26 vers la base d'un 2N2222 (330 Ω), LED en série avec 47 Ω sur le 5V.

## API (HTTP, sans authentification : à ne jamais exposer sur internet, seulement derrière le VPN)

- `GET /` : la page. `GET /api/state` : `{radio, mhz, shutters: [{id, name, code}], protocols, ac}`.
- `POST /api/shutter?id=0&cmd=up|down|my|prog` (`my` = stop).
- `POST /api/schedule?up=07:30&down=19:00` : heures de montée et de descente du volet (vide = aucune ; gardées en flash ; fuseau de Paris, heure prise sur internet en NTP, ordre envoyé une fois par jour à la minute près, pas de rattrapage si le boîtier était éteint). `schedule` dans `/api/state`.
- `POST /api/ac/program?time=07:30&mode=heat&temp=21&fan=auto&vane=auto` : ajoute un programme de la clim (huit au plus, rangés par heure, gardés en flash) ; à l'heure dite, ces réglages sont envoyés, clim allumée, avec la famille de télécommande en cours. `POST /api/ac/program/delete?index=0` le supprime. `programs` dans `/api/state`.
- `POST /api/name?id=&name=`, `POST /api/frequency?mhz=433.42`.
- `POST /api/update` (en-tête `X-Update-Key` = `OTA_PASSWORD`, fichier `.bin` en multipart) : met à jour le programme depuis la page ; la mémoire NVS (Wi-Fi, codes tournants) est conservée.
- `POST /api/ac?power=1&mode=heat&temp=21&fan=auto&vane=auto&protocol=heavy152`.
- `POST /api/ir/test?seconds=60` : essai du montage de la LED infrarouge, sans code de télécommande. Pendant la durée demandée (60 s par défaut, 600 au plus, `0` arrête), la broche de la LED reste allumée 3 s puis éteinte 2 s, en boucle : à regarder à travers l'appareil photo d'un téléphone, qui voit l'infrarouge.

## Mise en route

```
python -m pip install --user platformio
python -m platformio run -e esp32dev -t upload     # USB, première fois
python -m platformio run -e ota -t upload          # ensuite, sans fil (mot de passe : config.h)
```

Au premier démarrage le boîtier crée le Wi-Fi `volet-clim-reglage` : s'y connecter et choisir le Wi-Fi de la maison. Puis `http://volet-clim.local`.

## Pièges

- **Reflash par USB** : l'image complète (`dist/volet-clim-complet.bin` à l'adresse 0x0) **efface la mémoire NVS** : Wi-Fi perdu et codes tournants remis à 1 (les volets ne répondent plus, à réappairer). Pour garder l'existant, ne flasher que le programme `dist/volet-clim-mise-a-jour.bin` à l'adresse **0x10000**, ou passer par la page (« Mise à jour du programme »).

- **Code tournant** : gardé en flash (`Preferences`, clé `rcN`). Un effacement complet de la flash le remet à 1 : le volet ne répond plus, il faut le réappairer (ou `somfy::setRollingCode`). Ne pas faire `erase_flash`.
- **Appairage** : appui long sur PROG de la télécommande d'origine (va-et-vient du volet), puis le bouton « Appairage » de la page (roue des réglages, section Volet). Adresse RTS d'un volet = `SHUTTER_ADDRESS_BASE + n`, unique par volet.
- **Fréquence** : 433,42 MHz par défaut, 433,36 sur certains boîtiers (réglage dans la page).
- **Clim** : la famille de télécommande (`mitsubishi_ac` par défaut : Mitsubishi Electric, comme la MSZ-SF35VE ; puis `mitsubishi112`, `heavy152`, `heavy88`) dépend du modèle ; la page les laisse essayer une à une. L'IR est à sens unique : le boîtier ne sait pas l'état réel de la clim.
- **Résistances** : bien lire l'étiquette du sachet : une 47 kΩ à la place de la 47 Ω (ou 330 kΩ pour 330 Ω) et la LED ne s'allume pas. `POST /api/ir/test` sert à vérifier le montage à travers l'appareil photo d'un téléphone.
- **Ligne de mire** : l'infrarouge ne passe pas les obstacles ; la LED doit viser l'unité intérieure.
- Les mots de passe de `config.h` (mise à jour sans fil) sont à changer avant de donner le boîtier.
