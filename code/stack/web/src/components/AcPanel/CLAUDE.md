# AcPanel – l'onglet Clim

Climatisations Mitsubishi (`/ac`, 10 s). Un bloc par unité : nom, état en une phrase, commandes.

- `AcUnitCard.tsx` et `lib/useAcUnits.ts` sont **partagés** avec l'aperçu de la carte (`../AcPreview/CLAUDE.md`). Une lecture qui échoue garde la dernière liste et dit pourquoi.
- **Le salon est toujours en premier** (`salonFirst`, tri stable), onglet et carte.

## Commandes

Toutes par `POST /ac/<id>`, **un seul champ à la fois**.

- On / Off : interrupteur (`role="switch"`) à droite du nom.
- Cinq modes : Chaud, Froid, Sec, Ventilation, Auto.
- Consigne : - / + par 0,5 °C, de 16 à 31 °C (`stepTarget`).
- Ventilateur : Auto, Silence, 1 à 4.
- **Ailette selon la pièce** :
  - salon : haut / bas (`vane`) ;
  - chambres (`HORIZONTAL_VANE_UNITS`) : gauche / droite (`wideVane`).
- L'API rend l'unité avec le changement appliqué (sans relire le module) ; boutons grisés pendant la requête ; échec : « L'ordre n'est pas parti ».

## Cas particuliers

- Module muet (`reachable: false`) : seulement « Le module Wi-Fi de cette unité ne répond pas ».
- `AC_UNITS` absent : 503, l'onglet le dit.
- Pas de retour du module après une commande à la télécommande : mise à jour à la lecture suivante (10 s).
