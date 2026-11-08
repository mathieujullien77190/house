# Lights – l'onglet Lumière

Les lampes du pont Philips Hue (API `/hue`, relues toutes les 5 s), rendues par `LightsPanel` de `@house/ui` ; allumer, éteindre ou régler la luminosité d'une pièce entière ou d'une lampe (le curseur envoie sa valeur au relâchement). Côté pont et règles : `../../../../docs/hue.md`. Sans pont configuré (503), un message le dit ; une erreur passagère pendant l'usage laisse l'écran en place (un bandeau), et une lampe qui échoue dans « Tout allumer » ne bloque pas les autres.

## La liste

Rangée par **zone de la maison** (`ZONES` dans `constants.ts`, par identifiant de lampe : Chambre 1, SdB, WC, Cuisine, Couloir, Entrée, Salon, Volière). Les lampes sans zone, à placer, sont dans le groupe « À placer » ; une zone se commande lampe par lampe, seules celles qui répondent.

- Les détecteurs de mouvement de la cage sont dans le groupe « Volière » avec mouvement, température, luminosité et pile.
- Une section « Automatisations » en bas montre les règles du pont ; « Tout allumer » et « Tout éteindre » en haut ne touchent ni la volière ni les lampes à placer.
- Chaque groupe est dans un cadre ; le bouton Allumer / Éteindre et le curseur d'un groupe sont sur la ligne de son nom ; tous les groupes sont ouverts au départ sauf « À placer ».
- `Lights/useLampCount.ts` : le nombre de lampes de l'en-tête (celles des zones de la maison, sans « À placer »), relu chaque minute.
- **Extinction de la lumière de la perruche** (`components/FadeButton`, `lib/useFade.ts`, API `/hue/lights/26/fade`) : sur la ligne de la lampe « Perruche » (liste de bureau, pas dans le détail d'une caméra), le bouton **« Éteindre la lumière en 15 min »** lance une descente de la luminosité au minimum par le pont, puis l'extinction ; il devient **« Annuler l'extinction (14:32) »** avec le temps restant (relu du pont toutes les 10 s).

## La carte

Sous la liste, une section repliable « Plan », ouverte au départ : **la même carte que celle des caméras** (`MapPlan` avec `mode="lights"` : même fond, même dessin, mêmes arbres, haies, cage et portes ; `../MapPlan/CLAUDE.md`), sauf que les **lampes remplacent les caméras** et que **le toit est caché au départ**. On voit alors les pièces de `PLAN_ROOMS` et les cloisons de `PLAN_WALLS` (`constants.ts`, repère de l'ancien plan 540 × 300 ; `fromHousePlan` de `MapPlan/helpers.ts` les passe dans celui de la carte : x + `HOUSE_SHIFT`, y × `MAP_HOUSE_HEIGHT` / 300) et une ampoule par lampe :

- rond orange allumée, de la couleur du fond éteinte, contour rouge pâle injoignable (alors montrée éteinte, `allLights` force `on` à faux) ;
- **opacité selon la luminosité** (`bulbOpacity`) ; « Nom · 60 % » en bas de la carte au survol ou au toucher (`bulbLabel`) ;
- **toucher une lampe l'allume ou l'éteint** (`onToggleLamp`) ; avec le bouton **« Modifier »** on la glisse pour la placer (`onMoveLamp`, seules les lampes se déplacent dans cette carte) ;
- **la vue cadre toutes les lampes** (`lampBounds`, `fitBounds`) dès qu'elles sont arrivées, une seule fois ; « Recentrer » refait ce cadrage ; pas de bouton du toit sur cette carte ;
- les lampes pas encore placées attendent en rangées sur le carrelage au sud de la maison (`waitingSlot`) et **ne se voient qu'en mode Modifier**.

**Sur téléphone (sous 1024 px) l'onglet est un écran à part** : la carte seule en plein écran (`screen`, pas de boutons + et −, le pincement suffit ; tenu droit, la carte est tournée d'un quart de tour de plus pour que la maison remplisse l'écran), sans titre ni menu ni liste, avec une flèche retour en haut à gauche vers l'onglet Caméras (`onBack`).

**Sur la carte des caméras**, la lampe « Perruche » se voit toujours ; les autres lampes (`indoor`) n'apparaissent qu'une fois le toit caché (`lib/useLampPlan.ts`, relues toutes les 5 s, toucher = allumer ou éteindre).

## Positions des lampes

Gardées dans le **plan de l'API** (`items`, par identifiant de lampe, en longitude et latitude comme le reste du plan : `usePlan.moveItem`, `PUT /plan`). **Migration sans perte** (`planLamps`, `helpers.ts`) : une lampe sans place dans le plan prend, dans l'ordre, la place de départ de la carte (lampe de la cage), sa position de l'ancien plan lue dans `/hue/positions` (puis l'ancienne copie `localStorage` `house-lights-positions-v1`, `lib/useLegacyPositions.ts`) **convertie à la lecture**, puis celle de `LAMP_POSITIONS` convertie ; une ancienne position dans l'ancienne zone « À placer » (x ≥ `SIDE_ZONE.x`) compte pour « pas placée ». `/hue/positions` n'est plus écrit ni effacé (la lecture reste) ; une lampe n'entre dans le plan qu'une fois déplacée à la main.
