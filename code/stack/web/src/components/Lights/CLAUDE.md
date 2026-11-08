# Lights – l'onglet Lumière

Les lampes du pont Philips Hue (API `/hue`, relues toutes les 5 s), rendues par `LightsPanel` de `@house/ui` ; allumer (à puissance max) ou éteindre une zone entière ou une lampe ; **seule la lampe « Perruche » (`dimmable`) garde un curseur de luminosité**, qui envoie sa valeur au relâchement. Côté pont et règles : `../../../../docs/hue.md`. Sans pont configuré (503), un message le dit ; une erreur passagère pendant l'usage laisse l'écran en place (un bandeau), et une lampe qui échoue dans « Tout allumer » ne bloque pas les autres.

## La liste

Rangée par **zone de la maison** (`ZONES` dans `constants.ts`, par identifiant de lampe : Chambre 1, SdB, WC, Cuisine, Couloir, Entrée, Salon, Volière). Les lampes sans zone, à placer, sont dans le groupe « À placer » ; une zone se commande lampe par lampe, seules celles qui répondent.

- Les détecteurs de mouvement de la cage sont dans le groupe « Volière » avec mouvement, température, luminosité et pile.
- Une section « Automatisations » en bas montre les règles du pont ; « Tout allumer » et « Tout éteindre » en haut ne touchent ni la volière ni les lampes à placer.
- Chaque zone est un rectangle repliable : sur la ligne de son nom, le compte et deux petits boutons **ON / OFF** pour toute la zone (pas de curseur de zone) ; dedans, une **grille de petites cases** (3 par ligne sur téléphone, 4 dès `sm:`, 6 dès `lg:`), une par lampe, qui bascule ON / OFF. **ON = puissance max** : allumer envoie `{ on: true, bri: 254 }` (`MAX_BRI`, `constants.ts`) pour une case, une zone, « Tout allumer » et une ampoule de la carte ; éteindre envoie `{ on: false }`. Tous les groupes sont ouverts au départ sauf « À placer ».
- `Lights/useLampCount.ts` : le nombre de lampes de l'en-tête (celles des zones de la maison, sans « À placer »), relu chaque minute.
- **Extinction de la lumière de la perruche** (`components/FadeButton`, `lib/useFade.ts`, API `/hue/lights/26/fade`) : dans la ligne à curseur de la lampe « Perruche » sous la grille de sa zone (liste de bureau, pas dans le détail d'une caméra), le bouton **« Éteindre la lumière en 15 min »** lance une descente de la luminosité au minimum par le pont, puis l'extinction ; il devient **« Annuler l'extinction (14:32) »** avec le temps restant (relu du pont toutes les 10 s).

## La carte

Sous la liste, une section repliable « Plan », **repliée au départ** (la carte n'est fabriquée, tuiles comprises, qu'une fois la section ouverte : `onToggle` de `Collapsible`) : **la même carte que celle des caméras** (`MapPlan` avec `mode="lights"` : même fond, même dessin, mêmes arbres, haies, cage et portes ; `../MapPlan/CLAUDE.md`), sauf que les **lampes remplacent les caméras** et que **le toit est caché au départ**. On voit alors les pièces de `PLAN_ROOMS` et les cloisons de `PLAN_WALLS` (`constants.ts`, repère de l'ancien plan 540 × 300 ; `fromHousePlan` de `MapPlan/helpers.ts` les passe dans celui de la carte : x + `HOUSE_SHIFT`, y × `MAP_HOUSE_HEIGHT` / 300) et une ampoule par lampe :

- rond orange allumée, de la couleur du fond éteinte, contour rouge pâle injoignable (alors montrée éteinte, `allLights` force `on` à faux) ;
- **opacité selon la luminosité** (`bulbOpacity`) ; « Nom · 60 % » en bas de la carte au survol ou au toucher (`bulbLabel`) ;
- **toucher une lampe l'allume ou l'éteint** (`onToggleLamp`) ; avec le bouton **« Modifier »** on la glisse pour la placer (`onMoveLamp`, seules les lampes se déplacent dans cette carte) ;
- **la vue cadre toutes les lampes** (`lampBounds`, `cameraForBounds`, plus `FIT_EXTRA_ZOOM` = 1 cran de zoom) dès qu’elles sont arrivées, une seule fois ; « Recentrer » refait ce cadrage ; pas de bouton du toit sur cette carte ;
- les lampes pas encore placées attendent en rangées sur le carrelage au sud de la maison (`waitingSlot`) et **ne se voient qu'en mode Modifier**.

**Sur téléphone (sous 1024 px) il n'y a pas de carte** : l'onglet montre seulement la liste des lampes (et les automatisations), avec la barre du haut et les onglets comme les autres onglets.

**Sur la carte des caméras**, la lampe « Perruche » se voit toujours ; les autres lampes (`indoor`) n'y sont pas (elles sont sous le toit, qui n'a plus de bouton) (`lib/useLampPlan.ts`, relues toutes les 5 s, toucher = allumer ou éteindre).

## Positions des lampes

Gardées dans le **plan de l'API** (`items`, par identifiant de lampe, en longitude et latitude comme le reste du plan : `usePlan.moveItem`, `PUT /plan`). **Migration sans perte** (`planLamps`, `helpers.ts`) : une lampe sans place dans le plan prend, dans l'ordre, la place de départ de la carte (lampe de la cage), sa position de l'ancien plan lue dans `/hue/positions` (puis l'ancienne copie `localStorage` `house-lights-positions-v1`, `lib/useLegacyPositions.ts`) **convertie à la lecture**, puis celle de `LAMP_POSITIONS` convertie ; une ancienne position dans l'ancienne zone « À placer » (x ≥ `SIDE_ZONE.x`) compte pour « pas placée ». `/hue/positions` n'est plus écrit ni effacé (la lecture reste) ; une lampe n'entre dans le plan qu'une fois déplacée à la main.
