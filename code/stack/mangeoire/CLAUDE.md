# mangeoire – firmware de la carte Freenove ESP32-S3 WROOM CAM

Programme PlatformIO de la carte de la mangeoire de la volière (caméra de la gamelle + servos). Hors Docker : la carte est flashée en USB depuis le PC. Montage, broches, matériel et reste à faire : `../docs/mangeoire.md`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `platformio.ini` | carte `esp32-s3-devkitc-1`, 8 Mo de flash, PSRAM octale (`qio_opi`), WiFiManager, port **COM4** en dur (prise USB UART) |
| `src/main.cpp` | caméra, WiFi (WiFiManager, portail `mangeoire-setup`), serveur HTTP, servos |
| `src/page.h` | la page de commande `/` (image en boucle + boutons des servos) |

## Routes HTTP (port 80, `192.168.1.31`, `mangeoire.local`)

- `/` : la page de commande.
- `/capture` : une image JPEG.
- `/stream` : flux MJPEG. **Bloque le serveur** tant qu'un client le regarde (un seul client) : la page utilise `/capture` en boucle.
- `/servo?n=<1|2>&deg=<0-180>` : bouge un servo (un seul à la fois, signal coupé après 1,2 s).

## Servos

- Servo 1 (GPIO 1), la trémie : ouvert 4°, fermé 94° ; ouvertures 27°, 49°, 60°.
- Servo 2 (GPIO 2) : curseur libre, pas encore réglé (le servo n'est pas arrivé).
- Canaux LEDC 2 et 4 : le canal 0 et le timer 0 sont pris par l'horloge de la caméra.

## Commandes

```
cd code/stack/mangeoire
python -m platformio run                # compile
python -m platformio run -t upload      # flashe par COM4
python -m platformio device monitor     # port série, 115200
```

## Pièges

- Le capteur de la carte reçue est un **GC0308** (PID 0x9B), pas l'OV2640 prévu : pas de JPEG, image 320x240 en RGB565 compressée par la carte (`frame2jpg`).
- Rendre le tampon caméra (`esp_camera_fb_return`) **avant** l'envoi, et copier l'image hors PSRAM (dans un `String`) avant l'envoi WiFi : sinon la carte se bloque.
- Aucun secret dans le code : le mot de passe WiFi est saisi dans le portail WiFiManager et gardé en flash.
- `.pio/` (compilation) est ignoré par git. Pas de tests unitaires, pas de CI pour ce dossier.
