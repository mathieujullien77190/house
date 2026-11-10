# MapPlan – la carte de la maison

Le plan de la maison de la WebApp est une **carte MapLibre GL** (`maplibre-gl` dans `package.json`), affichée en haut de **Home** (`HouseMap/CLAUDE.md`, `Home/CLAUDE.md`). Les types du plan (`PlanTree`, `PlanCamera`…) sont dans `@house/ui` (`ui/src/plan.ts`).

## Fond et vue

- **Un seul fond : la photo aérienne IGN** (satellite, Géoplateforme, sans clé), sur un style MapLibre vide (`{version: 8, sources: {}, layers: []}`) : plus de fond vectoriel ni de choix du fond (le plan n'écrit aucun texte avec les polices de la carte).
- La carte est **tournée de 37,7°** (`MAP_ROTATION_DEG`) pour que la maison soit droite à l'écran ; zoom de départ 19,7, jusqu'à 22. Hauteur 530 px (`MAP_CLASS`).
- **Le plan de la maison est dessiné par la carte elle-même, en longitude et latitude** : `projection.ts` pose le plan en unités (43,5 par mètre : le bâti de la maison au cadastre, parcelle AO 0018, fait 12,4 m sur 7,65 m, `MAP_UNITS_PER_METER`, `MAP_HOUSE_HEIGHT`) sur le centre du bâti et le tourne comme lui, donc il ne glisse jamais pendant un zoom.

## Les couches

`features.ts` fabrique les données (GeoJSON), `layers.ts` les couches (largeurs de trait en mètres, donc elles suivent le zoom) :

- le toit, le béton, **tous les carreaux en un seul polygone** (union de la terrasse de 1,5 m, du carrelage plus large au sud (+ 50 cm) qui va jusqu'à la limite de propriété, des sols à droite de la maison qui montent jusqu'au bas de la cage et du chemin du portillon ; `polygon-clipping`) ;
- la cage (5,1 m sur 3,4 m, 6 × 85 cm sur 4 × 85 cm), le chemin du garage (béton, du portail à la terrasse), les deux portes (portail du garage, portillon), les haies, les arbres ;
- les caméras (une icône, champ de vision en cône au survol), les ampoules (une icône), les climatisations (une icône), le volet de la cuisine (une icône) et la prise : **voir « Les icônes du plan » plus bas**.

La prise est une icône (voir « Les icônes du plan »).

**La parcelle** (`parcel.ts`, contour du cadastre par l'API Carto de l'IGN) guide les haies (au départ pile sur la limite, percées aux portes), les portes et la limite des carreaux.

## Les cases Clim, Caméra, Lumière, Volet, Chauffage

En bas à gauche de la carte, **alignées sur une ligne** (`FILTERS_BAR_CLASS`) : **six cases à cocher avec le nom du type** (`FILTERS`, `constants.ts`) qui **montrent ou cachent les icônes** de ce type : **Clim** (les splits et leur pastille), **Caméra** (les icônes, leur pastille et le cône de vision), **Lumière** (les ampoules), **Volet** (le volet de la cuisine), **Chauffage** (la prise du dehors et sa pastille), **Clip** (les emoji des clips sauvegardés). **Toutes cochées au départ, sauf Clip** (les emoji des clips ne se voient qu'une fois la case cochée). Une case décochée cache les calques du type et retire sa zone de saisie du filtre de `plan-saisie` : une icône cachée ne se prend plus à la souris. Les étiquettes de température, le toit et le reste du plan restent toujours visibles.

## Anticrénelage

**Pas d'anticrénelage WebGL ni de suréchantillonnage** : essayés, ils rendaient la carte moins nette, donc annulés (`SCALE` = 1 dans `icons.ts`, pas de `canvasContextAttributes` sur la carte).

## Les icônes du plan

Les caméras, les ampoules, les climatisations, la prise et le volet sont des **icônes** (react-icons), pas des dessins : `icons.ts` rend chaque icône en SVG (`renderToStaticMarkup`), la pose dans un canvas (sur un rond : le fond de la page avec un anneau de la couleur de l'état) et l'ajoute à la carte en image (`addMapIcons`, au chargement du style) ; des calques de **symboles** (`plan-cameras`, `plan-lampes`, `plan-clims`, sur le point `camera-hit`, `lamp-hit` ou `ac-hit` de chaque élément) les affichent, de taille presque fixe (`icon-size` selon le zoom). Sans canvas (tests jsdom), pas d'icône.

| Élément | Icône | États |
|---|---|---|
| Caméra | Heroicons `HiOutlineVideoCamera` **noire sur un rond blanc**, tournée vers où regarde la caméra (`icon-rotate` = angle − 90°, l'icône regardant à droite) | **trois états** (propriété `state` du point), dits par une **petite pastille** posée **au centre du contour** du rond, en haut à droite, **cerclée de noir** comme lui (calques `plan-cameras-etat` et `plan-cameras-dessous-etat`, sans rotation : elle reste au coin quand l'icône tourne) : **verte** allumée (la vraie caméra est liée et alimentée), **rouge** éteinte (PoE coupé), **grise** quand la caméra n'existe pas (liée à aucune vraie caméra) |
| Ampoule | Remix `RiLightbulbFill` **dans la couleur de l'ampoule** (sa vraie couleur quand elle est allumée : `color` de `GET /hue`, calculée par l'API d'après l'état du pont ; orange si inconnue), avec un fin contour noir, sur un rond blanc à contour noir comme la caméra, **sans pastille** | grise éteinte, rouge injoignable (propriété `color` du point), **la luminosité fait pâlir le jaune seulement** (la couleur se mêle de blanc, `bulbColor`, par 16 crans, jusqu'à un quart de la couleur) : le rond blanc et le contour noir restent à pleine opacité (pas d'`icon-opacity`) ; **une image par couleur, dessinée à la demande** (`watchDynamicImages`, `lamp-#rrggbb`) |
| Prise (celle du chauffage, dehors) | Lucide `LuHeater` (un radiateur) **noir sur un rond blanc** (contour noir) | dit par la même **pastille cerclée de noir sur le contour** que la caméra (calque `plan-prises-etat`) : **verte** allumée, **rouge** éteinte (propriété `on` du point) |
| Volet roulant (cuisine) | Material **`MdOutlineSensorWindow` (ouvert)** / **`MdSensorWindow` (fermé, plein)**, **noires sur un rond blanc** (contour noir), **aussi gros que celui d'une caméra** (`CAMERA_SIZE`), avec **la même pastille cerclée de noir sur le contour** (calque `plan-volets-etat`) : **verte ouvert, rouge fermé**, en plus de la forme de l'icône | fermé seulement si le dernier ordre était « descendre » (propriété `closed` du point) ; **monter, stop et la position du milieu valent ouvert** |
| Climatisation | Tabler `TbAirConditioning` **noire sur un rond blanc** (contour noir), **orientée selon son mur** (`rotation` : le salon d'un quart de tour horaire, la chambre matou d'un quart de tour trigonométrique, `ROTATIONS` de `useAcPlan.ts`) | dit par la même **pastille cerclée de noir sur le contour** que la caméra (calque `plan-clims-etat`) : **verte** allumée, **rouge** éteinte, **grise** si le module ne répond pas (propriété `state` du point) |

**Trois étiquettes de température (`labels`, kind `label-hit`, calque `plan-etiquettes`, **au-dessus de tous les objets connectés**) : celle de dehors (la météo) et deux dans la cage (les détecteurs Hue de la volière), **et la température de chaque pièce (celle que lit sa climatisation, sous son icône au départ)** : le même rectangle **blanc, sans bordure, à angles droits, texte noir**, déplaçable en modification (« 21° », « 21,5° »). Le texte est une **image dessinée à la demande** (`watchTemperatureImages` répond à `styleimagemissing`, une image par valeur, blanc, sans bordure), donc sans police de carte à charger. Le champ de vision d'une caméra (`plan-vue`, un cône) reste un polygone.

## Le toit caché

**Le toit (`plan-toit`) est toujours caché** : la carte montre les pièces (**toutes en un seul polygone** : séparées, elles se chevauchaient à 60 % d'opacité et laissaient un fin trait clair entre deux pièces ; le contour de chaque pièce est dessiné en **traits de mur**, moins **les ouvertures** : `PLAN_OPENINGS` de `Lights/constants.ts`, par exemple le mur entre la cuisine et le salon porte les ampoules « Bar 1 » et « Bar 2 » et s'arrête à « Bar 2 » : d'elle au mur de droite, il n'existe pas), les cloisons (trait plein), les claustras (pointillés), les caméras, **toutes les lampes** du pont Hue, **les climatisations (une icône chacune : `ac-hit`, calque de symboles `plan-clims` ; un clic ouvre l'onglet Clim (`onOpenAc`, hors modification), le survol écrit son état)** la prise connectée et **le volet roulant de la cuisine (une icône : `shutter-hit`, calques de symboles `plan-volets` et `plan-volets-etat` (la pastille verte ouvert / rouge fermé) ; un clic le choisit, le survol écrit son dernier ordre)**. La lampe « Perruche » et la prise gardent leur état (orange / gris / contour rouge pâle ; vert / rouge). **Une lampe sans place sur le plan n'est pas sur la carte** (elle n'attend plus sur le carrelage au sud : `planLamps` l'écarte). Toucher une lampe **éteinte ou à 0 % l'allume à 100 %, et l'éteint si elle est allumée** ; « Nom · 60 % » s'écrit en bas de la carte au survol ou au toucher (`bulbLabel`), la couleur de l'ampoule pâlit avec sa luminosité (`bulbColor`), jamais son opacité.

## La vue de départ

**Vue de départ** : centre `MAP_VIEW_CENTER` (48,522045 ; 2,650143), zoom `MAP_ZOOM` (19,85), cap `MAP_ROTATION_DEG` (37,7°), choisis à la main. `MAP_CENTER` est autre chose : l'origine du plan (il ne doit pas bouger, tout le dessin en dépend).

**Les emoji des clips** (`emojis`, kind `emoji-hit`, calque `plan-emojis`, case **Clip**) : un pictogramme seul, sans fond blanc ni bordure (image `emoji-<emoji>` dessinée à la demande, `drawEmoji` de `icons.ts`) ; un clic le choisit (`onToggleEmoji`), son double clic l'ouvre (`onOpenEmoji`), on le déplace en modification (`onMoveEmoji`).

**Clic sur la prise, une climatisation ou le volet** : hors modification, un clic sur la **prise la choisit** (`onSelectPlug`, comme une caméra : le parent affiche son aperçu) et son **double clic ouvre l'onglet Prise** (`onOpenPlug`) ; un clic sur une **climatisation la choisit** (`onSelectAc`, `selectedAcId` pour l'ancre de l'aperçu) et son **double clic ouvre l'onglet Clim** (`onOpenAc`) ; sans `onSelectAc`, un clic ouvre l'onglet ; **un clic sur le volet le choisit** (`onSelectShutter`, le parent affiche son bloc), son **double clic ouvre l'onglet Volet** (`onOpenShutter`) ; sans `onSelectShutter`, un clic donne l'ordre (`onToggleShutter`, descendre s'il est ouvert, monter s'il est fermé). En modification, on les déplace et le clic ne fait rien.

**La ligne de l'objet choisi à son bloc** : `linkBox` (la place du bloc du parent, en pixels de la carte) → un calque de la carte (`plan-lien`, source `plan-lien`, **posé sous les icônes**), recalculé à chaque mouvement.

**Le nom au survol** : une caméra (le nom de la vraie caméra liée, sinon celui de l'icône) et le chauffage s'écrivent en bas de la carte au survol (`onHoverCamera`, `onHoverPlug`), comme une lampe.

**Survol d'une caméra** : son **champ de vision** (un **cône** dont la pointe est la caméra, `plan-vue`, `coneRing`) s'affiche tant que la souris est dessus (`onHoverCamera`, `hoveredCameraId`), comme quand on la choisit mais sans poignée ; elle est tournée vers où elle regarde.

**Le clic qui suit un geste sur un élément est ignoré** (`justDragged`, remis à zéro au geste suivant) : sinon, quand la carte bouge entre le choix d'une caméra et le clic (la vue imposée par `focusView`), la caméra n'est plus sous la souris, le clic passe pour un clic dans le vide et referme la miniature aussitôt (le premier clic ne marchait pas, le second oui).

**Zones de saisie superposées** (une caméra, une ampoule et une étiquette de température dans la cage) : la plus utile passe avant (`HIT_PRIORITY` de `edit.ts`) : la caméra d'abord, puis la climatisation, le volet, la prise, l'ampoule, et **l'étiquette de température en dernier** (elle ne sert qu'en modification : sans cela elle cachait le clic sur une caméra).

**Clic sur une caméra** : un clic la **choisit** (`onSelectCamera`) ; un **double clic ouvre sa page** (`onOpenCamera`, hors modification : le zoom au double clic est coupé sur cette carte, `doubleClickZoom: false`). En modification, un clic la choisit (son lien) et le double clic ne fait rien. La carte donne au parent (`onAnchor`) la position à l'écran de l'icône de l'objet choisi (caméra, prise, clim, volet ou emoji de clip), relue à chaque mouvement : le parent y tire la ligne jusqu'à son bloc. Le parent peut imposer une vue (`focusView` : centre, zoom, cap) : la carte s'y place d'un coup quand elle change.

**Le bouton** « Modifier » (absent sur téléphone : on n'y modifie pas le plan) est posé **dans la carte, tout en bas à gauche** (`ACTIONS_CLASS`, suivi des cases à cocher sur la même ligne ; ancré au bas du cadre de la carte : rien ne doit s'ajouter sous elle dans `WRAPPER_CLASS`). Pas de boutons de zoom +/− (le zoom se fait à la molette ou au pincement).

## Modifier

Le plan ne se modifie que quand le bouton **« Modifier » (tout en bas à gauche) est enfoncé** (éteint au départ ; sinon seul un clic sur une caméra, qui montre son champ de vision, reste). `edit.ts` prend à la souris ou au doigt :

- une caméra (la déplacer ; sa poignée tourne et allonge sa vue) ;
- un arbre (le déplacer ; sa poignée règle son rayon, de 5 à 400 unités) ;
- une haie (la déplacer entière ou par sommet) ;
- la cage (la lampe et la prise la suivent), le chemin du garage, une porte, une lampe, une climatisation, la prise.

La carte ne bouge pas pendant. **Les arbres hors de la propriété** (`dehors-1` à `dehors-3`) sont à placer à la main.

**Le lien avec les vraies caméras** : en mode modification, une caméra du plan choisie montre la liste « Caméra liée » (`lib/usePlanLinks.ts`, au départ les deux caméras de la cage sont liées à `voliere-interieur` et `voliere-exterieur`) ; le lien sert à mettre la caméra du plan en surbrillance quand on survole la vignette (et l'inverse) et à son contour rouge quand la vraie caméra est éteinte.

## Où le plan est gardé

**Par House API seule, rien dans le navigateur** (`lib/usePlan.ts`) : lu une fois au chargement (`GET /plan`) ; chaque changement s'applique tout de suite et part en `PUT /plan` 500 ms plus tard, ce qui met à jour la base (House Sync l'importe dans la table `plan` de SQLite) ; un autre appareil le retrouve en rechargeant la page (pas de relecture à intervalle). Tant que le plan de l'API n'est pas lu, rien n'est envoyé ; sans plan gardé, le dessin de départ est enregistré. Le dernier qui envoie gagne.

**Le plan est enregistré en vraies coordonnées** (`lib/planCoords.ts`) : positions en longitude et latitude, tailles en mètres, angles en caps (version 2 du document, `../../../../api/src/routes/CLAUDE.md`). Il se dessine en unités du plan et la conversion se fait à la lecture et à l'envoi (un plan enregistré avant, en unités, est converti puis renvoyé en version 2).

Le direct n'est ouvert que pour ce qui est affiché : la mosaïque ferme ses flux quand on ouvre un détail.
