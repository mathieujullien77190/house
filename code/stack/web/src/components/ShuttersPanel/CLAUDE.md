# ShuttersPanel – l'onglet Volet

Volets roulants Somfy RTS (`/shutters`, 10 s). Quatre par défaut (PC, salon, porte, cuisine), un bloc chacun : Monter, Stop, Descendre, dernier ordre et son heure.

- `lib/useShutters.ts` est **partagé** avec la vue 3D de Home (`../Kitchen3D/CLAUDE.md`).
- **Sens unique** : le Somfy RTS ne renvoie rien. On n'affiche que le dernier ordre (`lastCommand`, `lastAt`), jamais « ouvert » ou « fermé ».
- **Volets salon (2), PC (5) et porte (6)** : pilotés par des servos qui appuient sur une télécommande Nice, pas par le Somfy ; même bloc, mêmes trois boutons (`../../../../api/src/routes/CLAUDE.md`, « Volets à servos »). Leurs réglages sont dans House Sync, onglet Réglages.
- **Simulation** : sans `SHUTTERS_ESP_URL` dans le `.env`, l'API est en `mock: true` (ordre noté au journal, aucun signal radio) ; l'onglet l'écrit en tête.
- `SHUTTERS` vide : 503, l'onglet le dit. ESP32 muet : 502, « L'ordre n'est pas parti ».
- Chaque ordre est envoyé par l'API à House Sync (`POST /api/journal/shutters`), qui le range dans `shutter_log` (onglet Base).
- API, pilote radio, réglages restants : `../../../../api/src/routes/CLAUDE.md` (« Les volets roulants »). Schémas : site, onglet Architecture, vue « Volet ».

## Action automatique

- Deux interrupteurs Oui / Non (`ToggleField`) par volet : « Ouvrir au lever du soleil » et « Fermer au coucher du soleil » (`auto`, `PUT /shutters/<id>/auto`).
- La case change tout de suite, et revient en arrière si l'API refuse.
- Un volet absent de `SHUTTERS_AUTO` n'a pas de case.

## Fermer à moitié

- Pour un volet avec `closeSeconds` (dans `SHUTTERS`, côté API) : `POST /shutters/<id>/half`. L'API monte à fond, attend, redescend la moitié du temps de fermeture, puis arrête.
- Pendant ce temps : message « Ouvre à fond, puis ferme à moitié… », bouton grisé, liste relue toutes les 2 s (`halfRunning`). **Stop** annule la suite.
