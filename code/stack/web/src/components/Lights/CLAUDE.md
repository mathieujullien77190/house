# Lights – l'onglet Lumière

Lampes du pont Hue (`/hue`, 5 s), rendues par `LightsPanel` de `@house/ui`. Pont et règles : `../../../../docs/hue.md`.

- **Allumer = puissance max** : `{ on: true, bri: 254 }` (`MAX_BRI`) pour une case, une zone, « Tout allumer » et une ampoule de la carte. Éteindre : `{ on: false }`.
- **Seule la lampe « Perruche » (`dimmable`) a un curseur de luminosité**, envoyé au relâchement.
- Sans pont (503) : un message. Erreur passagère : un bandeau. Une lampe qui échoue dans « Tout allumer » ne bloque pas les autres.
- « Tout allumer / éteindre » ne touchent pas la volière.
- Il n'y a **plus de carte dans cet onglet** : elle est dans Home (`../HouseMap/CLAUDE.md`).

## La liste

- Rangée par **zone** (`ZONES`, `constants.ts`, par identifiant de lampe), ordre fixe : Volière, Salon, Cuisine, Entrée, Chambre 1, SdB, WC, Couloir.
- **Une lampe d'aucune zone n'existe pas dans l'application** (ni liste, ni carte, ni consommation de House Sync).
- Zone repliable, ouverte au départ : compte et boutons ON / OFF pour toute la zone (pas de curseur de zone), grille de cases (3, 4 dès `sm:`, 6 dès `lg:`).
- Le groupe « Volière » contient aussi les détecteurs de la cage (mouvement, température, luminosité, pile).
- Section « Automatisations » en bas : les règles du pont.
- Chaque lampe a le même bloc : ON / OFF, bordure jaune allumée qui pâlit avec la luminosité, rond de la carte en haut à droite, curseur dedans.

## Extinction de la perruche

- `components/FadeButton`, `lib/useFade.ts`, `/hue/lights/26/fade` : « Éteindre la lumière en 15 min » devient « Annuler l'extinction (14:32) » (relu toutes les 10 s). Liste de bureau seulement.
- Le curseur descend en ligne droite sur les 15 min (`fadeLevel`, d'après `started_at`, `duration_seconds`, `from_bri`) : le pont annonce tout de suite la cible, sans ce calcul le curseur tombait d'un coup à 0.

## Positions des lampes

- Gardées dans le **plan de l'API** (`items` par identifiant, `usePlan.moveItem`, `PUT /plan`).
- **Migration sans perte** (`planLamps`, `helpers.ts`) : sans place dans le plan, la lampe prend dans l'ordre la place de départ de la cage, `/hue/positions` (puis `localStorage` `house-lights-positions-v1`, `lib/useLegacyPositions.ts`), puis `LAMP_POSITIONS`, le tout converti à la lecture. Une ancienne position dans « À placer » (x >= `SIDE_ZONE.x`) compte pour non placée.
- `/hue/positions` n'est plus écrit. Une lampe n'entre dans le plan qu'une fois déplacée à la main.
