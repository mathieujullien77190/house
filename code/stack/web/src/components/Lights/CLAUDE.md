# Lights – l'onglet Lumière

Les lampes du pont Philips Hue (API `/hue`, relues toutes les 5 s), rendues par `LightsPanel` de `@house/ui` ; allumer (à puissance max) ou éteindre une zone entière ou une lampe ; **seule la lampe « Perruche » (`dimmable`) garde un curseur de luminosité**, qui envoie sa valeur au relâchement. Côté pont et règles : `../../../../docs/hue.md`. Sans pont configuré (503), un message le dit ; une erreur passagère pendant l'usage laisse l'écran en place (un bandeau), et une lampe qui échoue dans « Tout allumer » ne bloque pas les autres.

## La liste

Rangée par **zone de la maison** (`ZONES` dans `constants.ts`, par identifiant de lampe : Chambre 1, SdB, WC, Cuisine, Couloir, Entrée, Salon, Volière). Les lampes sans zone, à placer, sont dans le groupe « À placer » ; une zone se commande lampe par lampe, seules celles qui répondent.

- Les détecteurs de mouvement de la cage sont dans le groupe « Volière » avec mouvement, température, luminosité et pile.
- Une section « Automatisations » en bas montre les règles du pont ; « Tout allumer » et « Tout éteindre » en haut ne touchent ni la volière ni les lampes à placer.
- Chaque zone est un rectangle repliable : sur la ligne de son nom, le compte et deux petits boutons **ON / OFF** pour toute la zone (pas de curseur de zone) ; dedans, une **grille de petites cases** (3 par ligne sur téléphone, 4 dès `sm:`, 6 dès `lg:`), une par lampe, qui bascule ON / OFF. **ON = puissance max** : allumer envoie `{ on: true, bri: 254 }` (`MAX_BRI`, `constants.ts`) pour une case, une zone, « Tout allumer » et une ampoule de la carte ; éteindre envoie `{ on: false }`. Tous les groupes sont ouverts au départ sauf « À placer ».
- **Extinction de la lumière de la perruche** (`components/FadeButton`, `lib/useFade.ts`, API `/hue/lights/26/fade`) : dans la ligne à curseur de la lampe « Perruche » sous la grille de sa zone (liste de bureau, pas dans le détail d'une caméra), le bouton **« Éteindre la lumière en 15 min »** lance une descente de la luminosité au minimum par le pont, puis l'extinction ; il devient **« Annuler l'extinction (14:32) »** avec le temps restant (relu du pont toutes les 10 s). **Le curseur de la lampe descend de sa luminosité d'avant au minimum en ligne droite sur les 15 minutes** (`fadeLevel` de `lib/useFade.ts`, d'après `started_at`, `duration_seconds` et `from_bri` que donne `GET /hue/lights/<id>/fade`) : le pont annonce tout de suite la luminosité cible, il ne dit pas le trajet, donc sans ce calcul le curseur tombait d'un coup à 0. `Lights` tient le hook `useFade` et le passe au bouton.

## La carte

**Il n'y a plus de carte dans cet onglet** : la carte des lampes est dans **Home** (`../HouseMap/CLAUDE.md`).

## Positions des lampes

Gardées dans le **plan de l'API** (lues et déplacées depuis la carte de Home) (`items`, par identifiant de lampe, en longitude et latitude comme le reste du plan : `usePlan.moveItem`, `PUT /plan`). **Migration sans perte** (`planLamps`, `helpers.ts`) : une lampe sans place dans le plan prend, dans l'ordre, la place de départ de la carte (lampe de la cage), sa position de l'ancien plan lue dans `/hue/positions` (puis l'ancienne copie `localStorage` `house-lights-positions-v1`, `lib/useLegacyPositions.ts`) **convertie à la lecture**, puis celle de `LAMP_POSITIONS` convertie ; une ancienne position dans l'ancienne zone « À placer » (x ≥ `SIDE_ZONE.x`) compte pour « pas placée ». `/hue/positions` n'est plus écrit ni effacé (la lecture reste) ; une lampe n'entre dans le plan qu'une fois déplacée à la main.
- **Chaque lampe a son bloc, le même pour toutes (celle de la perruche comprise)** : son bouton ON / OFF, **une bordure jaune quand elle est allumée (qui pâlit avec la luminosité, comme l'ampoule)**, un rond en haut à droite, **le même que sur la carte** (fond blanc, bordure noire, icône d'ampoule dont le jaune pâlit avec la luminosité), et son curseur de luminosité dedans (envoyé au relâchement) ; le bouton d'extinction en douceur de la lampe de la perruche est dessous. **Les zones qui ont au moins une lampe allumée sont en haut**, les lampes gardent leur place dans leur zone.
