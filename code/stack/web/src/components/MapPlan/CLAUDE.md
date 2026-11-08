# MapPlan – la carte de la maison

Le plan de la maison de la WebApp est une **carte MapLibre GL** (`maplibre-gl` dans `package.json`), utilisée par la mosaïque des caméras (`CameraMosaic/CLAUDE.md`, `mode="cameras"`) et par l'onglet Lumière (`Lights/CLAUDE.md`, `mode="lights"`). Les types du plan (`PlanTree`, `PlanCamera`…) sont dans `@house/ui` (`ui/src/plan.ts`).

## Fond et vue

- Fond **Satellite** (photo aérienne IGN, par défaut) ou **Vectoriel** (Plan IGN en tuiles vectorielles, net à tout zoom ; style officiel de la Géoplateforme, sans clé), choisi en haut à droite.
- La carte est **tournée de 37,7°** (`MAP_ROTATION_DEG`) pour que la maison soit droite à l'écran ; zoom de départ 19,7, jusqu'à 22. Hauteur 530 px (`MAP_CLASS`) ; en plein écran téléphone `SCREEN_MAP_CLASS`.
- **Le plan de la maison est dessiné par la carte elle-même, en longitude et latitude** : `projection.ts` pose le plan en unités (43,5 par mètre : le bâti de la maison au cadastre, parcelle AO 0018, fait 12,4 m sur 7,65 m, `MAP_UNITS_PER_METER`, `MAP_HOUSE_HEIGHT`) sur le centre du bâti et le tourne comme lui, donc il ne glisse jamais pendant un zoom.

## Les couches

`features.ts` fabrique les données (GeoJSON), `layers.ts` les couches (largeurs de trait en mètres, donc elles suivent le zoom) :

- le toit, le béton, **tous les carreaux en un seul polygone** (union de la terrasse de 1,5 m, du carrelage plus large au sud (+ 50 cm) qui va jusqu'à la limite de propriété, des sols à droite de la maison qui montent jusqu'au bas de la cage et du chemin du portillon ; `polygon-clipping`) ;
- la cage (5,1 m sur 3,4 m, 6 × 85 cm sur 4 × 85 cm), le chemin du garage (béton, du portail à la terrasse), les deux portes (portail du garage, portillon), les haies, les arbres ;
- les caméras (icône de caméscope, champ de vision en croissant au clic), la lampe et la prise.

**Contours** des lampes, caméras et prises : 1 px de loin, 2 px dès le zoom `ICON_STROKE_ZOOM` (20,5), par une couche `line` dédiée (`plan-lampes-trait`, `plan-cameras-trait`, `plan-prises-trait`) ; le rond d'une lampe a 96 côtés pour rester rond au zoom maximal.

**La parcelle** (`parcel.ts`, contour du cadastre par l'API Carto de l'IGN) guide les haies (au départ pile sur la limite, percées aux portes), les portes et la limite des carreaux.

## Deux modes et le toit

`mode` : `cameras` ou `lights`. Le bouton **« Cacher le toit »** / « Montrer le toit » (en bas à droite, **seulement sur la carte des caméras** : sur celle des lumières le toit est caché et le bouton n’existe pas) : le toit (`plan-toit`) laisse place aux pièces, aux cloisons (trait plein) et aux claustras (pointillés) toit caché, et aux lampes de la maison. Dans l'onglet Lumière, le toit est caché au départ. La lampe « Perruche » et la prise connectée gardent leur état (orange / gris / contour rouge pâle ; vert / rouge).

## Modifier

Le plan ne se modifie que quand le bouton **« Modifier » (en bas à droite, à côté de « Recentrer ») est enfoncé** (éteint au départ ; sinon seul un clic sur une caméra, qui montre son champ de vision, reste). `edit.ts` prend à la souris ou au doigt :

- une caméra (la déplacer ; sa poignée tourne et allonge sa vue) ;
- un arbre (le déplacer ; sa poignée règle son rayon, de 5 à 400 unités) ;
- une haie (la déplacer entière ou par sommet) ;
- la cage (la lampe et la prise la suivent), le chemin du garage, une porte, la lampe, la prise.

La carte ne bouge pas pendant. **Les arbres hors de la propriété** (`dehors-1` à `dehors-3`) sont à placer à la main.

**Le lien avec les vraies caméras** : en mode modification, une caméra du plan choisie montre la liste « Caméra liée » (`lib/usePlanLinks.ts`, au départ les deux caméras de la cage sont liées à `voliere-interieur` et `voliere-exterieur`) ; le lien sert à mettre la caméra du plan en surbrillance quand on survole la vignette (et l'inverse) et à son contour rouge quand la vraie caméra est éteinte.

## Où le plan est gardé

**Par House API seule, rien dans le navigateur** (`lib/usePlan.ts`) : lu une fois au chargement (`GET /plan`) ; chaque changement s'applique tout de suite et part en `PUT /plan` 500 ms plus tard, ce qui met à jour la base (House Sync l'importe dans la table `plan` de SQLite) ; un autre appareil le retrouve en rechargeant la page (pas de relecture à intervalle). Tant que le plan de l'API n'est pas lu, rien n'est envoyé ; sans plan gardé, le dessin de départ est enregistré. Le dernier qui envoie gagne.

**Le plan est enregistré en vraies coordonnées** (`lib/planCoords.ts`) : positions en longitude et latitude, tailles en mètres, angles en caps (version 2 du document, `../../../../api/src/routes/CLAUDE.md`). Il se dessine en unités du plan et la conversion se fait à la lecture et à l'envoi (un plan enregistré avant, en unités, est converti puis renvoyé en version 2).

Le direct n'est ouvert que pour ce qui est affiché : la mosaïque ferme ses flux quand on ouvre un détail.
