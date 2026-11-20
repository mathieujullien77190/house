# Mangeoire de la volière – caméra et deux servos sur une seule carte

**État au 19 novembre 2026 : projet, rien n'est commandé ni codé.** Ce fichier garde le montage choisi et ce qui reste à faire. Le code fait foi : quand le programme existera, corriger ce document.

## Le besoin

Une mangeoire où des graines sont distribuées par un servo. Il faut **voir** si la gamelle est vide ou pleine de coques (les perruches laissent les coques, donc un capteur de poids ne marche pas), et pouvoir la **vider**. Une photo de la gamelle, regardée dans la WebApp, suffit : c'est la personne qui décide de remplir ou de vider. Aucune analyse d'image.

- **Servo 1** : remplit la gamelle (ouvre la trémie, attend, referme).
- **Servo 2** : vide la gamelle (la bascule, attend, la remet en place).
- Les deux servos **ne bougent jamais en même temps** : le courant est celui d'un seul servo.
- **Une seule carte** fait tout, sans carte d'extension : la caméra est déjà dessus, les servos se branchent sur deux broches.

## Le matériel

| Pièce | Détail |
|---|---|
| Carte | **Freenove ESP32-S3 WROOM CAM** (Amazon, vendu par Freenove-EU, 20,95 € le 18 nov 2026) : ESP32-S3, 8 Mo de flash, 8 Mo de PSRAM, WiFi 2,4 GHz, caméra intégrée (nappe orange), deux prises USB-C (programmeur et USB-OTG), lecteur de carte mémoire au dos, 2,8 × 5,7 cm. Livrée avec une carte mémoire de 1 Go (inutile ici). |
| Servos | Deux **MF90** (micro servo 9 g, 5 V) : ceux du projet des volets (`ServoWiring3D`, lot de 10). |
| Alimentation | Un chargeur **USB-C 5 V, 2 A au moins** (3 A de préférence) et un câble court et épais. |
| Caméra | L'objectif de la carte est un capteur de 2 Mpx à **mise au point fixe** (probablement OV2640 : l'annonce ne le dit pas), réglable à la main avec la bague. Pour une gamelle à moins de 20 cm, un module OV5640 autofocus à 24 broches peut le remplacer (compatibilité à vérifier sur la fiche Freenove). |

Pas de condensateur ni de convertisseur : les deux servos ne tournent pas ensemble, un chargeur correct suffit. Si la carte redémarre un jour quand un servo force, ajouter un condensateur de 470 à 1000 µF entre le 5 V et la masse, près des servos.

## Les broches

Sur la carte, la rangée de gauche porte `3V3, EN, 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, 5V` et celle de droite `RX, TX, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, GND` (relevé sur les photos de l'annonce). La caméra occupe les broches 4 à 13 et 15 à 18.

| Signal | Broche | Pourquoi |
|---|---|---|
| Servo 1 (remplir), signal | **GPIO 1** | libre : ni caméra, ni démarrage, ni mémoire |
| Servo 2 (vider), signal | **GPIO 2** | idem |
| 5 V des deux servos | broche **5V** (bas de la rangée de gauche) | le 5 V de l'USB, sans passer par le régulateur de la carte |
| Masse des deux servos | broche **GND** (bas de la rangée de droite) | |

**À confirmer à la réception** avec le chapitre « Notes for GPIO » du tutoriel de Freenove (le lien est sur la boîte). À éviter : 35, 36, 37 (mémoire PSRAM), 19 et 20 (USB), 0 et 45 (démarrage), 48 (LED RGB). Les broches 38 à 40 sont celles de la carte mémoire : libres si la carte n'est pas insérée.

## Le montage

```
 Chargeur USB-C 5 V (2 à 3 A)
          │  câble court et épais
          ▼
 ┌─────────────────────────────────────────────┐
 │  Freenove ESP32-S3 CAM  (prise USB-C)       │
 │                                             │
 │   [objectif caméra] ← la gamelle            │
 │                                             │
 │   GPIO 1 ───────────────────┐               │
 │   GPIO 2 ──────────────┐    │               │
 │   5V ──────────┬───────┼────┼──┐            │
 │   GND ─────┬───┼───────┼────┼──┼──┐         │
 └────────────┼───┼───────┼────┼──┼──┼─────────┘
              │   │       │    │  │  │
              │   │       │    │  │  │
        ┌─────┴───┴───────┘    │  │  │
        │  Servo 2 (vider)     │  │  │
        │  marron  rouge orange│  │  │
        └──────────────────────┘  │  │
        ┌─────────────────────────┴──┴─┐
        │  Servo 1 (remplir)           │
        │  rouge ← 5V, marron ← GND,   │
        │  orange ← GPIO 1             │
        └──────────────────────────────┘
```

Lecture plus simple, servo par servo (couleurs usuelles d'un MF90) :

| Fil du servo | Servo 1 (remplir) | Servo 2 (vider) |
|---|---|---|
| Orange ou jaune (signal) | GPIO 1 | GPIO 2 |
| Rouge (5 V) | 5V | 5V |
| Marron ou noir (masse) | GND | GND |

Le courant des servos vient du chargeur par la broche 5V : l'ESP32 ne l'alimente pas lui-même. Ne jamais brancher un fil rouge sur 3V3.

## Le programme de la carte (à écrire)

- Photo : l'exemple `CameraWebServer` de Freenove donne `http://<ip>/capture` (une image JPEG) et un flux MJPEG ; les réglages de la bague ou de l'autofocus se font avec lui.
- Servos : un mouvement à la fois, signal **coupé** après chaque mouvement, et une limite de durée si un servo force (graine coincée), pour qu'il ne chauffe pas.
- Ordres : « remplir » et « vider » reçus par WiFi (HTTP sur le réseau de la maison), comme la carte des servos des volets (`servo-page.local`, mise à jour par OTA).

## L'intégration dans la pile (à faire)

- La carte devient une **cinquième caméra** de go2rtc (source MJPEG ou image), vue dans la WebApp avec le direct et la frise. Elle n'est pas une Reolink : pas de PoE à couper, pas de flux principal et secondaire ; le code qui déclare les caméras (`SWITCH_PORTS`, `go2rtc.yaml`, `motion`) est à adapter.
- Deux boutons dans la WebApp : « Remplir » et « Vider », qui appellent l'API de la carte.
- Plus tard, si besoin : une ration automatique (par exemple deux fois par jour) réglée dans House Sync.

## Pièges connus

- L'ESP32 NodeMCU WROOM-32 achetée pour les volets n'a **ni prise caméra ni PSRAM** : elle ne convient pas pour la caméra. La carte Freenove est une carte à part.
- Les servos doivent être sur le 5 V, jamais sur le 3,3 V de la carte.
- Le WiFi de la carte est en 2,4 GHz : vérifier le signal à l'endroit de la mangeoire avant de la fixer.
- Un boîtier étanche (imprimé en 3D dans le projet `cnc`) doit avoir une vitre devant l'objectif et quelques ouvertures d'aération, à l'abri de la pluie.
