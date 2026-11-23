# volet-clim – boîtier volet + clim sur un seul ESP32

Firmware (Arduino, PlatformIO) d'un boîtier **indépendant de la pile de la maison** : prévu pour la maison d'un proche (Freebox, rien à voir avec nos conteneurs). Un ESP32 sert une page web et pilote :

- des **volets Somfy RTS** par un module radio **CC1101** (433 MHz), comme une télécommande de plus (`src/somfy.cpp`) ;
- une **pompe à chaleur Mitsubishi sans Wi-Fi** par une LED **infrarouge** (`src/aircon.cpp`, bibliothèque IRremoteESP8266).

Câblage et schémas : onglet « Volet + clim » du site (`code/stack/site`, `RemoteBoxSystem` et `RemoteBox3D`), à garder d'accord avec `src/config.h`.

## État

Compile (PlatformIO, ESP32 `esp32dev`) mais **jamais testé sur le matériel** : ni l'appairage d'un volet, ni la portée radio, ni la clim. Chaque moitié se teste seule (le boîtier marche sans LED IR, et sans CC1101).

## Fichiers

```
platformio.ini     carte, bibliothèques, mise à jour sans fil (env ota)
src/config.h       broches, nombre de volets, adresse RTS de base, noms réseau
src/somfy.*        la télécommande Somfy RTS (trame, code tournant en flash, CC1101)
src/aircon.*       la clim : état voulu vers la télécommande infrarouge
src/page.h         la page web (HTML + JS embarqués)
src/main.cpp       Wi-Fi, OTA, API JSON, serveur web
```

## Broches (ESP32 à 38 broches)

CC1101 : SCK 18, MISO 19, MOSI 23, CSN 5, GDO0 13 (émission), GDO2 12 (réception, inutilisée) ; alimenté en **3,3 V**. LED IR : G26 vers la base d'un 2N2222 (330 Ω), LED en série avec 47 Ω sur le 5V.

## API (HTTP, sans authentification : à ne jamais exposer sur internet, seulement derrière le VPN)

- `GET /` : la page. `GET /api/state` : `{radio, mhz, shutters: [{id, name, code}], protocols, ac}`.
- `POST /api/shutter?id=0&cmd=up|down|my|prog` (`my` = stop).
- `POST /api/name?id=&name=`, `POST /api/frequency?mhz=433.42`.
- `POST /api/ac?power=1&mode=heat&temp=21&fan=auto&vane=auto&protocol=heavy152`.

## Mise en route

```
python -m pip install --user platformio
python -m platformio run -e esp32dev -t upload     # USB, première fois
python -m platformio run -e ota -t upload          # ensuite, sans fil (mot de passe : config.h)
```

Au premier démarrage le boîtier crée le Wi-Fi `volet-clim-reglage` : s'y connecter et choisir le Wi-Fi de la maison. Puis `http://volet-clim.local`.

## Pièges

- **Code tournant** : gardé en flash (`Preferences`, clé `rcN`). Un effacement complet de la flash le remet à 1 : le volet ne répond plus, il faut le réappairer (ou `somfy::setRollingCode`). Ne pas faire `erase_flash`.
- **Appairage** : appui long sur PROG de la télécommande d'origine (va-et-vient du volet), puis « Appairer » dans la page. Adresse RTS d'un volet = `SHUTTER_ADDRESS_BASE + n`, unique par volet.
- **Fréquence** : 433,42 MHz par défaut, 433,36 sur certains boîtiers (réglage dans la page).
- **Clim** : la famille de télécommande (`heavy152`, `heavy88`, `mitsubishi_ac`, `mitsubishi112`) dépend du modèle ; la page les laisse essayer une à une. L'IR est à sens unique : le boîtier ne sait pas l'état réel de la clim.
- Les mots de passe de `config.h` (mise à jour sans fil) sont à changer avant de donner le boîtier.
