# ShuttersPanel – l'onglet Volet

Les volets roulants Somfy RTS (API `/shutters`, relue toutes les 10 s). Quatre volets par défaut (PC, salon, porte, cuisine), un bloc chacun : son nom, trois boutons **▲ Monter**, **■ Stop**, **▼ Descendre**, et le **dernier ordre envoyé** avec son heure.

- **La lecture et les ordres sont le hook partagé `lib/useShutters.ts`** (le même que l'aperçu de la carte, `../ShutterPreview/CLAUDE.md`) ; le bloc d'un volet est `ShutterCard.tsx`, partagé aussi.
- **Action automatique** : chaque volet a deux cases séparées, « Ouvrir au lever du soleil » et « Fermer au coucher du soleil » (`auto` de `GET /shutters`, `PUT /shutters/<id>/auto`) ; une case change tout de suite et revient en arrière si l'API refuse. Un volet absent de `SHUTTERS_AUTO` n'a pas de case.
- **Sens unique.** Le Somfy RTS ne renvoie rien : pas de position, pas de confirmation que le volet a bougé. On n'affiche donc que le dernier ordre (`lastCommand`, `lastAt`), jamais un état « ouvert » ou « fermé » (la note en bas de l'onglet le dit).
- **Simulation.** Tant que `SHUTTERS_ESP_URL` est absent du `.env` du mini PC, l'API est en simulation (`mock: true`) : l'ordre est noté au journal mais aucun signal radio ne part. L'onglet l'écrit en tête pour ne pas faire croire qu'un volet a bougé.
- Aucun volet configuré (`SHUTTERS` vide) : l'API répond 503 et l'onglet le dit ; l'ESP32 qui ne répond pas : 502, « L'ordre n'est pas parti ».
- Le journal des ordres (`shutters-log.jsonl`) est importé par House Sync dans la table `shutter_log` (onglet Base).

Ce que fait l'API, le pilote radio et ce qu'il reste à ajuster avec le matériel : `../../../../api/src/routes/CLAUDE.md` (section « Les volets roulants »). Schémas matériel et logiciel des volets : onglet Architecture du site, vue « Volet ».

## Fermer à moitié

Un volet qui a un temps de fermeture (`closeSeconds`, donné dans `SHUTTERS` côté API) a un bouton **« ◧ Fermer à moitié »** : `POST /shutters/<id>/half`, l'API fait monter le volet à fond, attend, le redescend pendant la moitié de son temps de fermeture puis l'arrête (détail : `api/src/routes/CLAUDE.md`). Pendant ce temps la carte dit « Ouvre à fond, puis ferme à moitié… (Stop l'arrête) », le bouton est grisé et la liste est relue toutes les 2 s (`halfRunning`). Le bouton **Stop** annule la suite.
