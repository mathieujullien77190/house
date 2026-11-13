# MapPlan – la carte de la maison

Carte **MapLibre GL** en haut de **Home** (`HouseMap/CLAUDE.md`, `Home/CLAUDE.md`). Types du plan (`PlanTree`, `PlanCamera`…) dans `@house/ui` (`ui/src/plan.ts`).

## Fond et vue

- Un seul fond : la **photo aérienne IGN** (Géoplateforme, sans clé), sur un style MapLibre vide. Aucun texte écrit avec les polices de la carte.
- Carte **tournée de 37,7°** (`MAP_ROTATION_DEG`), hauteur 530 px (`MAP_CLASS`), zoom jusqu'à 22.
- Vue de départ : centre `MAP_VIEW_CENTER`, zoom `MAP_ZOOM` (19,85), choisis à la main.
- `MAP_CENTER` est autre chose : l'**origine du plan**. Il ne doit pas bouger, tout le dessin en dépend.
- Le plan est dessiné en longitude et latitude : `projection.ts` le pose sur le centre du bâti (43,5 unités par mètre, bâti au cadastre 12,4 m sur 7,65 m, parcelle AO 0018) et le tourne comme lui, donc il ne glisse pas au zoom.
- Pas de boutons de zoom +/- (molette ou pincement). Pas d'anticrénelage WebGL ni de suréchantillonnage : essayés, moins nets (`SCALE` = 1 dans `icons.ts`).

## Couches

`features.ts` fabrique les données (GeoJSON), `layers.ts` les couches (traits en mètres, ils suivent le zoom).

- Toit, béton (derrière la maison, **au-dessus des carreaux**), carreaux en **un seul polygone** (`polygon-clipping`), cage, chemin du garage, portes, haies.
- Arbres **au-dessus des caméras** (translucides, on voit les icônes à travers) : buisson de 7 à 9 lobes (`bushRing`, décalé par `seedOf`).
- `parcel.ts` : contour du cadastre (API Carto IGN), il guide haies, portes et limite des carreaux.
- Le champ de vision d'une caméra (`plan-vue`) est un cône (`coneRing`), affiché au survol ou à la sélection.

## Murs et toit caché

- Le toit (`plan-toit`) est **toujours caché** : la carte montre les pièces en **un seul polygone** (séparées, elles se chevauchaient à 60 % d'opacité), avec leurs traits de mur.
- La maison n'est pas rectangulaire : le carré de l'entrée (1,5 m, même hauteur que la pièce Entrée) est un second rectangle de « Entrée » (`PLAN_ROOMS`, `Lights/constants.ts`).
- Ouvertures dans les murs : `PLAN_OPENINGS` (ex. le mur cuisine / salon s'arrête à « Bar 2 »). Cloisons : `PLAN_WALLS`. Mur de l'entrée plein + claustra en pointillé (`entranceWall`, `PLAN_ENTRANCE_WALL`).
- **Les murs ne se modifient pas** : ce sont les rectangles des pièces (`RoomRects`, `defaultRoomRects`). Ceux du plan gardé (`room-<pièce>-<rectangle>-a/b`, `roomRectsFrom`) remplacent ceux de départ, lus seulement.

## Les icônes du plan

Caméras, ampoules, clims, prise, volet : **icônes react-icons** rendues en SVG puis en canvas (`icons.ts`, `addMapIcons`), sur un rond blanc à contour noir. Symboles de taille presque fixe. Sans canvas (jsdom), pas d'icône.

| Élément | Icône | Pastille sur le contour |
|---|---|---|
| Caméra | `HiOutlineVideoCamera`, tournée vers où elle regarde | verte allumée, rouge éteinte (PoE coupé), grise si liée à aucune vraie caméra (`plan-cameras-etat`) |
| Ampoule | `RiLightbulbFill` dans sa vraie couleur (`color` de `GET /hue`, orange si inconnue) | aucune |
| Prise (chauffage) | `LuHeater` | verte allumée, rouge éteinte (`plan-prises-etat`) |
| Volet cuisine | `MdOutlineSensorWindow` (ouvert) / `MdSensorWindow` (fermé) | bleu pâle `#8fd0f7` ouvert, violet `#8b5cf6` baissé (`plan-volets-etat`) |
| Clim | `TbAirConditioning`, orientée selon son mur (`ROTATIONS` de `useAcPlan.ts`) | verte allumée, rouge éteinte, grise injoignable (`plan-clims-etat`) |

- **Ampoule** : grise éteinte, rouge injoignable. La luminosité ne fait pâlir que la couleur (`bulbColor`, 16 crans), jamais l'opacité. Une image par couleur, dessinée à la demande (`watchDynamicImages`).
- **Volet** : fermé seulement si le dernier ordre était « descendre » ; monter, stop et la position du milieu valent ouvert.
- **Pompe à chaleur** (`decors`, `decor-pac`) et **routeur** (`BsRouter`, id `box`) : icône seule, sans rond (`drawBare`), toujours visibles. La pompe à chaleur ne réagit à rien ; **la box est cliquable** (`clickable` du décor) : clic = choisir (`onSelectDecor`), double clic = onglet Box (`onOpenDecor`), `selectedDecorId` pour la ligne bleue.
- **Étiquettes de température** (`labels`, `plan-etiquettes`, au-dessus de tous les objets) : dehors, deux dans la cage, une par pièce climatisée. Rectangle blanc sans bordure, texte noir, image dessinée à la demande (`watchTemperatureImages`).
- **Emoji des clips** (`emojis`, `plan-emojis`) : pictogramme seul (`drawEmoji`).
- Une lampe sans place sur le plan n'est pas sur la carte (`planLamps`).

## Cases à cocher

- En bas à gauche, sur une ligne (`FILTERS_BAR_CLASS`) : **Clim, Caméra, Lumière, Volet, Chauffage, Clip** (`FILTERS`).
- Toutes cochées au départ, **sauf Clip**.
- Une case décochée cache les calques et retire la zone de saisie de `plan-saisie`.
- Étiquettes, toit et reste du plan restent visibles.
- **Téléphone (`fill`)** : la carte prend la place restante (`fitHeight`, mesurée au redimensionnement et quand la Home redevient visible) et les cases passent dans un menu « Filtres » fermé au départ.
- Bouton « Modifier » : tout en bas à gauche (`ACTIONS_CLASS`), absent sur téléphone. Rien ne doit s'ajouter sous la carte dans `WRAPPER_CLASS`.

## Interactions

- **Caméra** : clic = choisir (`onSelectCamera`) ; double clic = ouvrir sa page (`onOpenCamera`). `doubleClickZoom: false`.
- **Prise** : clic = choisir (`onSelectPlug`), double clic = onglet Prise (`onOpenPlug`).
- **Clim** : clic = choisir (`onSelectAc`, `selectedAcId`), double clic = onglet Clim (`onOpenAc`). Sans `onSelectAc`, un clic ouvre l'onglet.
- **Volet** : clic = choisir (`onSelectShutter`), double clic = onglet Volet (`onOpenShutter`). Sans `onSelectShutter`, un clic donne l'ordre (`onToggleShutter`).
- **Emoji** : clic = choisir (`onToggleEmoji`), double clic = ouvrir (`onOpenEmoji`).
- **Lampe** : toucher une lampe éteinte ou à 0 % l'allume à 100 %, sinon l'éteint. « Nom · 60 % » s'écrit en bas au survol (`bulbLabel`).
- **Survol** : rond bleu pâle (`plan-survol`, `showHalo`). Curseur (`cursorFor`) : main pour déplacer (modification), doigt pour un clic utile, rien pour la pompe à chaleur. Les noms de caméra et du chauffage s'écrivent en bas (`onHoverCamera`, `onHoverPlug`).
- **Inactifs** : une lampe injoignable et une caméra liée à aucune vraie caméra ne réagissent pas hors modification (`inactive`, `disabled` de `edit.ts`). **Une caméra éteinte reste cliquable.** En modification, tous se déplacent.
- **Zones de saisie superposées** : priorité `HIT_PRIORITY` (`edit.ts`) : caméra, clim, volet, prise, ampoule, étiquette en dernier (sinon elle cachait la caméra).
- **Clic après un geste ignoré** (`justDragged`) : sinon, quand la carte bouge entre le choix et le clic (`focusView`), le clic passerait pour un clic dans le vide et fermerait la miniature.
- **Lien vers le bloc** : `linkBox` (place du bloc, en pixels) donne le calque `plan-lien`, sous les icônes. `onAnchor` rend au parent la position écran de l'objet choisi. `focusView` impose une vue (centre, zoom, cap).

## Modifier

- Le plan ne se modifie que bouton **« Modifier »** enfoncé (éteint au départ). La carte ne bouge pas pendant un geste.
- **On ne déplace que les objets connectés** (`edit.ts`) : caméras (poignée `camera-handle` qui tourne et allonge la vue), lampes, prise, clims, volet, étiquettes, emoji, pompe à chaleur et routeur.
- **Plus rien de fixe ne se modifie** (arbres, haies, cage, chemin du garage, portes, coins des carreaux et des murs). Ils restent dessinés d'après le plan gardé, sans rien supprimer :
  - arbres, haies, cage, décalages : `liveFeatures` ;
  - contours des carreaux et du garage : `tiles-corner-<n>`, `garage-corner-<n>` (`tilesRingFrom`, `garageRingFrom`), sinon l'union calculée.
- Seules `plan-saisie` et `plan-poignees` se prennent à la souris.
- **Lien avec les vraies caméras** : une caméra choisie montre « Caméra liée » (`lib/usePlanLinks.ts` ; par défaut les deux de la cage vers `voliere-interieur` et `voliere-exterieur`). Il sert au survol croisé avec la vignette et au contour rouge si la vraie caméra est éteinte.

## Où le plan est gardé

- **Par House API seule** (`lib/usePlan.ts`) : lu une fois (`GET /plan`), chaque changement part en `PUT /plan` 500 ms plus tard (House Sync l'importe dans la table `plan`). Rien n'est envoyé tant que le plan n'est pas lu. Le dernier qui envoie gagne ; un autre appareil le voit en rechargeant.
- **Vraies coordonnées** (`lib/planCoords.ts`) : longitude / latitude, mètres, caps (version 2 : `../../../../api/src/routes/CLAUDE.md`). Un plan en unités est converti puis renvoyé en version 2.
