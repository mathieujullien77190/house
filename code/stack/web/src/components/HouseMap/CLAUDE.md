# HouseMap – la carte de la maison de l'accueil

Conteneur de `MapPlan` (`../MapPlan/CLAUDE.md`) en haut de **Home** (`../Home/CLAUDE.md`).

- Le plan vient de House API seule (`lib/usePlan.ts`). En écriture : `moveItem`, `moveCamera`, `adjustCamera`, `link`.
- **La sélection est globale** (`lib/homeSelection.ts`, `useSyncExternalStore`) : le bloc choisi reste choisi au retour sur Home. Un seul objet à la fois ; un clic à côté le lâche.

## Aperçus (grand écran)

Règle commune à caméra, chauffage, clim, volet et emoji de clip :

- **Clic** : choisit l'objet, la carte prend `PREVIEW_VIEW` et son bloc s'affiche **en haut à droite** (`top-2.5 right-2.5`), 320 px de large.
- **Double clic** : ouvre l'onglet de l'objet.
- **Clic à côté** : ferme (pas de bouton de fermeture). Un clic choisit toujours, il ne bascule pas.
- **Téléphone** : un clic ouvre directement l'onglet, pas de bloc.
- **Modification** : un clic ne fait rien, on déplace.
- Une **ligne bleue** (`plan-lien`, `linkBox`) relie l'icône au bloc ; `HouseMap` mesure le bloc et la suit.
- Textes des blocs réduits (`COMPACT_CLASS`, 0,72 à 0,78 rem) ; la règle du chauffage passe en deux colonnes (`compact` de `HeatingPanel`).
- **Bordures de 2 px** : caméra verte allumée / rouge éteinte (`CAMERA_ON_CLASS`, `CAMERA_OFF_CLASS`), clim verte / rouge (`AcPreview`), volet bleu pâle `#8fd0f7` ouvert / violet `#8b5cf6` baissé (`ShutterPreview`).

## Par objet

- **Caméras** : miniature en direct `LiveTile` (celle de la mosaïque, avec dernier événement et Lu / Non lu).
  - Un clic sur la ligne de l'événement ouvre la caméra sur son clip.
  - En portrait, la miniature est réduite pour tenir dans la carte : largeur = (hauteur carte - marges - 70 px) x 9/16.
  - Les flux légers des caméras liées sont ouverts dès l'ouverture de la Home (miniatures seulement `hidden`).
  - Une caméra du plan sans vraie caméra liée est seulement choisie (champ de vision).
- **Lampes** : toutes celles du pont (`lib/useLampPlan.ts`, 5 s). Un clic allume à 100 % si éteinte ou à 0 %, sinon éteint.
- **Box** (routeur `box`, décor cliquable) : aperçu `BoxPreview` (`lib/useBox.ts`, `/box`, 12 s), liseré rouge si la box ne répond pas ; double clic = onglet Box ; sélection `box` de `homeSelection`.
- **Prise / chauffage** (`lib/usePlug.ts`) : aperçu = tout le bloc de l'onglet Prise (`PlugPanel` en `embedded`).
- **Clims** (`lib/useAcPlan.ts`, `/ac`, 10 s) : aperçu `AcPreview`. Survol : « Salon · Allumée · Chaud · pièce 20 °C · consigne 21 °C ». Place sous `ac-<id>` ; sans place, au mur de sa pièce (`START_POSITIONS`).
- **Volet cuisine** (`lib/useShutterPlan.ts`, `/shutters`, 10 s) : aperçu `ShutterPreview`. Place sous `shutter-<id>` ; seul le volet « cuisine » a une place de départ (son numéro dépend de `SHUTTERS` dans le `.env`, `1` sur le mini PC). **Un clic ne donne plus d'ordre.**
- **Emoji des clips** (`lib/useClipEmojis.ts`, `GET /events?saved=1`, 30 s) : **cachés au départ** (case Clip), en rangée au sud de la maison. Place sous `emoji-<id du clip>`. Aperçu `ClipPreview`, double clic = clip lancé dans Caméras (`onOpenCamera(caméra, id)`).
- **Températures** (`lib/useTemperatureLabels.ts`) : une par pièce climatisée, une dehors (météo), deux dans la cage (`CAMERA_SENSOR`). Place sous `label-<id>` ; température inconnue = rien.
