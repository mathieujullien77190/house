# Kitchen3D – la maison en 3D (Home)

Toute la maison et son jardin en Three.js (mètres) : c'est ce que montre **Home** (`../Home/CLAUDE.md`), qui la charge à part (`React.lazy` dans `Home/Home.tsx`). Au-dessus de la vue : le titre, trois boutons (« Vue du dessus », « Réinitialiser la vue » et « Vue Matrix » / « Vue normale », voir « La vue Matrix ») et le compte des lampes allumées, puis le choix de la lumière (« Jour » ou « Heure actuelle », voir « Lumière ») ; dessous, la ligne d’aide (pas de texte d’introduction) ; la hotte est toujours dessinée (`hood` de `buildScene` ne sert plus à la cacher) et les volets suivent toujours ceux de la maison. La scène est construite une fois, démontée avec `forceContextLoss`, dessinée seulement quand quelque chose change, et jamais hors écran (voir « Performance »).

- **L'espace de vie**, meublé : la cuisine, le coin repas, l'entrée, le salon et le bureau.
- **Le reste de la maison** : la chambre d'invité, la salle de bain et le sas de l'entrée (meublés, `furniture/`) ; la chambre de Matou n'a que sa clim et sa suspension (`furniture/matouRoom.ts`) ; le couloir, le placard de Matou et la cage d'escalier (buanderie) sont vides.
- **Les murs extérieurs** : 30 cm (`OUTER_WALL`), percés aux fenêtres, sur un soubassement en retrait (`BASE` : le sol de la maison est 33 cm au-dessus du terrain).
- **Le jardin** (`garden/`), d'après le plan de la maison : pelouse sur deux niveaux (murs de soutènement), terrasses, pavage, haies, portail, cage à perruches et ses bacs, poubelles, table, pompe à chaleur, ligne électrique, terrasse en ipé et son salon de jardin, pergola, arbres, massifs, herbes.

## D'où viennent les formes

- **Les cotes générales** : le modèle SketchUp de la maison (`cuisine.skp`, exporté en Collada et lu une fois ; il n'est pas dans le dépôt). Murs, cuisine (2,86 m sur 4,59 m (longueur mesurée), plan de travail à 92 cm, côtés du U de 2,50 m), mur plein de 1,58 m puis bar de 1,24 m entre cuisine et salon, retour de mur à droite du frigo (mesuré : 61 cm côté entrée), salon de 7,45 m (mesuré) sur 3,90 m, plafond à 2,36 m (mesuré), entrée, claustra, cellier, poteau et poutres.
- **Le reste de la maison** : des mesures (`REST`, `SAS`, `WC_ALCOVE`, les fenêtres `GUEST_WINDOW`, `MATOU_WINDOW`, `BATH_WINDOW` dans `constants.ts`) et des photos.
- **La forme d'ensemble** recoupe le plan de la maison (`PLAN_ROOMS`, `../Lights/constants.ts`) : cuisine au nord, salon en L au sud, escalier à l'est de la cuisine, chambres et salle de bain à l'ouest.
- **Les axes de la scène ne sont pas ceux du plan** : x croît vers le nord, z vers l'est (`ROOM`, `KITCHEN`, `ENTRY` dans `constants.ts`). Le mur ouest de la cuisine est 30 cm plus à l'est que celui du salon.
- **Le jardin** : le plan de la maison, à 39 unités le mètre (`gardenX`, `gardenZ` : sous la maison, le plan est ramené aux murs de la scène ; dehors, il est à l'échelle).
- **Les meubles et le détail de la cuisine** : des photos. Largeurs des caissons (`RUNS`) et places des meubles (`LAYOUT`) sont **estimées**, à corriger.
- **Les images accrochées aux murs** (cadres, puzzle) : des photos dans `web/public/kitchen3d/`, chargées comme textures par `photoTexture` (`textures.ts`).

## Fichiers

À la racine, ce qui sert à toute la scène ; un sous-dossier par partie. Dans un sous-dossier, on importe ses voisins par `./` et le reste par `@/components/Kitchen3D/…`.

- `Kitchen3D.tsx` : le conteneur (rendu WebGL, caméra à la souris, rendu à la demande, boutons, clics, état de la maison) ; `lib/three.ts` : libération d'une scène et test de WebGL (fait une seule fois).
- `helpers.ts` : `buildScene`, qui assemble le gros œuvre, le mobilier, le jardin et les files de caissons, puis partage les matériaux identiques, fond ce qui ne bouge pas et règle qui porte une ombre. Les trois premières parties sont nommées `shell`, `furniture` et `garden` : c'est leur **genre** (voir `kindOf`).
- `merge.ts` : `shareMaterials` (un seul matériau par allure) et `mergeStatic` (un maillage par matériau **et par genre** pour tout ce qui ne bouge jamais ; le maillage fondu porte le nom de son genre). `KINDS` (`shell`, `furniture`, `tree`, `garden`) et `kindOf(objet)` : le genre d'un objet est le nom du groupe le plus proche qui en porte un, sinon `furniture` (les caissons de cuisine). Les arbres du jardin sont des groupes nommés `tree` (`garden/garden.ts`).
- `matrix.ts` : la vue Matrix (`createMatrix`, `MATRIX_COLORS`, `MATRIX_CAMERA`, `MATRIX_SHUTTER`, voir « La vue Matrix »).
- `constants.ts` : pièces, caissons, meubles, fenêtres, repères du gros œuvre (`SHELL`, `PASSAGE`, baies), la qualité selon l'appareil (`QUALITY`), textes, classes.
- `primitives.ts` : pavé, cylindre, boule, matériau, texture sur canevas, bois veiné (`woodTexture`), `facing`, `fixtureBulb`, `noShadow`.
- `textures.ts` : les textures dessinées (sisal, plan de travail, carrelages, lambris, terre cuite, grillage, cadran) et les photos (`photoTexture` ; `onPhotoLoad` prévient quand l'une a fini de se charger).
- `materials.ts` : un jeu de matériaux par partie (cuisine et gros œuvre, mobilier, pièces, jardin), créé une fois par scène.
- `library.ts`, `libraryData.ts` : la bibliothèque (voir plus bas).
- `lighting.ts` : les lampes Hue dans la scène.
- `shutters.ts` : les volets roulants et le jour qui entre.
- `live.ts` : la pendule, le voyant des clims, les clims et les caméras à cliquer.
- `light.ts` : le choix de la lumière (« Jour », « Heure actuelle »), gardé sur l'appareil.
- `reolink.ts` : le modèle d'une caméra Reolink, marqué du nom de la vraie.

`kitchen/` (la cuisine) :

- `units.ts` : les caissons (façades à cadre, poignées, four, range-bouteilles, panneau de bout).
- `worktop.ts` : le plan de travail, l'évier de ferme, la plaque, la hotte à trois pans adossée au mur.
- `runs.ts` : une file de caissons et ce qu'elle porte.
- `decor.ts` : la crédence, les étagères, les petites fenêtres, la suspension.
- `counter.ts` : les objets du plan de travail.

`house/` (le gros œuvre, tout dans un seul groupe) :

- `shell.ts` : `buildShell`, qui appelle les constructeurs dans l'ordre.
- `walls.ts` : les outils (`wallKit` : plinthe, pan lisible de l'intérieur seulement, dalle, mur percé de baies ou de portes, mur épais plein, pièce vide) et ce que les constructeurs partagent (`Shell`).
- `parquet.ts` : le parquet lame par lame (un seul maillage `InstancedMesh`, posé au tiers, la même trame pour toute la maison).
- `living.ts` : l'espace de vie (sols, murs, plafond en lambris sauf la cuisine en plaque de plâtre, bar, mur de l'escalier et ses niches, entrée, plinthes, poutres).
- `rest.ts` : le reste de la maison (chambre d'invité, salle de bain, couloir, chambre de Matou et son placard, buanderie).
- `outer.ts` : les murs extérieurs, le soubassement, le sas et ses marches.

`furniture/` (le mobilier) :

- `furniture.ts` : `buildFurniture` ; `rooms.ts` : `buildRooms` (chambre d'invité, salle de bain, sas, chambre de Matou).
- `living.ts` (canapé, table basse, fauteuil, coin télé, buffet), `dining.ts` (table ronde, chaises), `office.ts` (bureau, écrans, clim), `lamps.ts` (plafonniers à pétales, suspensions).
- `windows.ts` : les fenêtres (`windowOnWall` : le cadre dans l'embrasure, les lames du volet cachées s'il n'y a pas de volet relié) et les rideaux.
- `nook.ts` : le coin repas (bistrot, cellier, niche à verres, frigo, pendule) ; `entry.ts` : l'entrée et la porte du couloir ; `decor.ts` : cadres et étagères décorées.
- `guestRoom.ts`, `bathroom.ts`, `sas.ts`, `matouRoom.ts` : le mobilier de ces quatre pièces.

`garden/` (le jardin, tout dans un seul groupe) :

- `garden.ts` : `buildGarden`, qui appelle les constructeurs dans l'ordre et plante les arbres.
- `constants.ts` : le terrain sur le plan de la maison ; `plan.ts` : du plan à la scène (`gardenX`, `gardenZ`, surfaces à plat, tronçons le long d'une ligne) ; `layout.ts` : les repères calculés (`SITE`).
- `ground.ts` : pelouses, marches de soutènement, terrasses, pavage (le chemin du portillon descend de trois marches, `PATH_STEPS` ; l'allée du garage est une rampe entre trois murs, `GARAGE_DEPTH`) ; `borders.ts` : haies, murets, portail et portillon.
- `aviary.ts` : la cage à perruches (pans de bois à planches, deux portes l'une en face de l'autre, bacs creux, outils pendus) ; `equipment.ts` : poubelles, poubelle renversée derrière la cage, table, pompe à chaleur sur sa dalle, terrasse en ipé et la bande de béton au pied de la haie du nord, ligne électrique, caméras du jardin et de la cage ; `lounge.ts` : le salon de jardin ; `pergola.ts` : la pergola (d’après son modèle SketchUp).
- `branches.ts` : de quoi dessiner une plante par lots (`woodOf` : tout son bois en un maillage fondu ; `tuftsOf` : ses touffes en un `InstancedMesh` par teinte ; `piecesOf`, fleurs, fruits) ; `trees.ts` (cerisier, prunus, arbre taillé, néflier), `laurel.ts`, `plants.ts` (fougère à folioles, choisya, hortensia, passiflore, haies de spirées ou de lierre, glycine, buissons, massifs de fleurs, arche de vigne, conifère jamais taillé, arbre clair, romarin), `grass.ts` (touffes d’herbe et fleurs de la pelouse).

**L'ordre compte** : les constructeurs ajoutent leurs objets à un groupe dans un ordre fixe, et un tirage `seeded(n)` est consommé dans l'ordre des appels. Déplacer du code qui partage un tirage change les formes.

## La scène suit la maison

Ce que la scène anime ou rend cliquable est marqué dans `userData` par les constructeurs, et retrouvé par un parcours de la scène.

| Marque (`userData`) | Posée par | Lue par |
|---|---|---|
| `fixture`, `fixtureName` | `fixtureBulb` | `lighting.ts` |
| `shutter`, `area` (le groupe des lames) | `windowOnWall` | `shutters.ts` |
| `acUnit`, `acLed` (identifiant de la clim) | `furniture/office.ts`, `furniture/guestRoom.ts`, `furniture/matouRoom.ts` | `live.ts` |
| `camera` (nom de la vraie caméra, sur le groupe du modèle) | `reolink` (`reolink.ts`) | `live.ts` (`cameraMeshes`) |
| `clockHand` | `furniture/nook.ts` | `live.ts` |
| `lampBulb` (l'ampoule nue d'une lampe sans luminaire) | `lighting.ts` | `matrix.ts` |
| `noShadow` (l'objet ne porte pas d'ombre) | `noShadow` (`primitives.ts`) : voir « Performance » | `buildScene` (`helpers.ts`) |

- **Volets** (`useShutters`) : les fenêtres « cuisine », « salon », « pc » et « porte » (`SHUTTER_KEYS` : le mot cherché dans le nom du volet de la maison) montrent la part fermée de leur volet d'après son **dernier ordre** (descendu, monté, sinon à moitié : les Somfy RTS ne disent pas où ils sont).
- **Jour** : voir « Lumière ».
- **Pendule** de la cuisine : à l'heure, remise à jour toutes les 15 s.
- **Clims** (`useAcUnits`) : le voyant du salon, de la chambre d'invité et de la chambre de Matou est vert en marche, rouge à l'arrêt, gris si l'état est inconnu.
- **Écrans** : les deux du bureau et la télé sont éteints (dalles noires, `SCREEN_OFF`) et ne se cliquent pas.

## Lumière

Au-dessus de la vue : **Lumière** (`LIGHT_OPTIONS`), deux choix. Le choix est gardé sur l'appareil (`localStorage` `house-3d-light`, `light.ts` ; sans choix ou illisible : « Jour »).

- **Jour** (au départ) : plein jour forcé, quels que soient l'heure, la météo et les volets (plus simple pour regarder la scène).
- **Heure actuelle** : le jour qui entre vraiment. La part de vitre découverte, fois la clarté du ciel (`skyOf` : météo de `useWeather`, sinon l'heure, relue avec la pendule toutes les 15 s), dose l'ambiance et le soleil (`DAYLIGHT`). Pas de rayon par fenêtre. La nuit, le jardin est sombre et seules les lampes allumées éclairent.
- Changer de choix redemande une image **et l'ombre du soleil** (`invalidate(true)`) : le soleil s'allume ou s'éteint.

## Le jardin ne change pas

Il n'y a plus ni saisons, ni pluie, ni neige, ni vent : le jardin reste tel qu'il était au printemps par beau temps (l'ancien choix `house-garden-climate` du `localStorage` n'est plus lu).

- En fleurs : les cerisiers (blanc) et le pommier (blanc rosé), les spirées (blanc), la glycine, les choisyas, l'hortensia, le buisson jaune, la passiflore, les massifs fuchsia sous les arbres, les petites fleurs de couleur et les pâquerettes de la pelouse. Les cerisiers portent leurs cerises, le néflier ses nèfles. **Le prunus n'a pas de fleurs** (son bois et son feuillage bordeaux).
- Ce qui ne se voyait qu'à une autre saison n'est plus construit : pommes, bois nu des choisyas et de l'hortensia.
- **Les formes n'ont pas bougé** : les fleurs et les cerises ont leur propre tirage (`seed + 5000`, `+ 6000`), et le pommier tire toujours un nombre par touffe (ses anciennes pommes, `cherryTree(seed, true)`) ; retirer ce tirage changerait l'arbre.

## La molette et la vue Matrix

- **Molette** (`onWheel`) : un pas fixe de `WHEEL_STEP` (0,5 m) par cran, vers ce qui est sous la souris (au plus trois pas par coup de molette), **sans limite de zoom** (`minDistance` 0, `maxDistance` infinie) ; la caméra et le pivot avancent ensemble, la distance au pivot ne change pas. Le zoom de `OrbitControls` est un facteur (plus on s'approche, moins il avance) : il est coupé par `stopImmediatePropagation`.
- **La vue Matrix** (`matrix.ts`, bouton « Vue Matrix » / « Vue normale », éteinte à chaque ouverture, rien n'est gardé) : toute la scène est réduite à ses arêtes sur fond noir (`setClearColor`), une teinte de vert par genre (`MATRIX_COLORS`). Les caméras sont en blanc plein, les lampes qu'on peut piloter (`fixture`, `lampBulb`) entourées de trois cercles rouges (`MATRIX_CAMERA`), les volets en fil de fer ambre (`MATRIX_SHUTTER`) ; les copies (herbe, feuilles, fleurs) sont cachées. Les arêtes sont calculées à la première demande puis seulement montrées ou cachées ; ce qui était caché avant (volets relevés) le reste. `SceneHandle.matrix(on)` l'active.

## Les clics

Un clic sans glisser (moins de `CLICK_SLOP` pixels) ; la souris devient une main au-dessus de ce qui se clique. Dans cet ordre :

1. **Une ampoule** : allume ou éteint sa lampe Hue (`toggle` de `useLampPlan`). `lighting.pick` vise l'ampoule la plus près du rayon, même derrière un abat-jour ou un mur.
2. **Une clim** : l'allume ou l'éteint (`change(id, { on })`) ; rien si son état est inconnu.
3. **Une caméra** (les modèles Reolink : `MAST_CAMERA` sur le mât de l'entrée, `GARDEN_CAMERA` au coin de la cage, `CAGE_CAMERA` à l'autre coin, `INNER_CAGE_CAMERA` (`voliere-interieur`) dans la cage, et les deux du pommier ; avec deux modèles sur le même rayon, c'est **le plus proche de l'œil** qui s'ouvre) : appelle `onOpenCamera(nom)` ; `App` ouvre l'onglet Caméras sur elle (la mosaïque si la maison n'a pas de caméra de ce nom). Sans `onOpenCamera`, rien.
4. **Une fenêtre à volet** : envoie l'ordre contraire du dernier (`send` de `useShutters`). Pendant `SHUTTER_ANIMATE_MS`, le changement d'état qui suit est animé (`stepShutters`) ; un changement venu d'ailleurs se place d'un coup.

## Tests

- Un `*.test.ts` à côté de chaque module, dans son dossier. Les constructeurs de scène (`helpers.ts`, `merge.ts`, `kitchen/`, `house/`, `furniture/`, `garden/`, `library.ts`, `lighting.ts`, `shutters.ts`, `live.ts`, `light.ts`, `primitives.ts`, `textures.ts`, `materials.ts`, `reolink.ts`) sont du three.js sans WebGL : testés tels quels sous jsdom (objets, places, marques, matériaux partagés, même forme pour la même graine, appariement lampe–luminaire, rayons).
- Le conteneur : `WebGLRenderer` et `OrbitControls` simulés, `ResizeObserver`, `IntersectionObserver` et `requestAnimationFrame` remplacés, les hooks de la maison simulés ; la scène est la vraie. Pour cliquer un objet, le test place la caméra face à lui et clique au milieu de la vue. Le choix de la lumière y est posé dans le `localStorage` avant le rendu (« Heure actuelle » par défaut dans ces tests, pour voir le jour qui entre). Les images demandées (`requestAnimationFrame`) attendent dans une file que le test fait passer une à une (`frame()`) : il vérifie qu'une image est dessinée quand il le faut, et seulement alors ; `useMobile` y est simulé pour choisir la qualité.
- Les plantes sont dessinées par lots : `src/test/batched.ts` en retrouve les morceaux (`tuftsIn` : les touffes, copie par copie ; `limbsIn` : les tronçons du bois fondu).
- jsdom n'a pas de contexte 2D et ne charge pas les images : les textures restent vides, sauf avec le faux contexte de `src/test/canvas.ts`.

## Les lampes Hue éclairent la scène

- `usePlan` et `useLampPlan` donnent les lampes du pont et leur place sur le plan, relues toutes les 5 s.
- `lampPlace` convertit une place du plan en place dans la scène ; une lampe hors de l'espace de vie (chambres, salle de bain, escalier, jardin) n'y est pas, **sauf si son luminaire est nommé** dans la scène (`LAMP_FIXTURES` : couloir, chambre, spots de la salle de bain…).
- Chaque lampe a une `PointLight` : couleur de la lampe (blanc chaud sans couleur), intensité selon sa luminosité ; éteinte ou injoignable, sa source est cachée (voir « Performance »). Pas d'ombres portées par les lampes (seul le soleil en porte).
- **Luminaires** : une ampoule dessinée est marquée par `fixtureBulb(mesh, nom)`. Une lampe prend d'abord le luminaire qui porte son nom (nom du pont, en minuscules), sinon le luminaire le plus proche (à moins de `LAMP_LIGHT.matchDistance`, un par lampe) : la lumière part de lui et son ampoule prend la couleur de la lampe. Sans luminaire, une ampoule nue pend du plafond à la place de la lampe.
- La lumière d'ambiance de nuit est volontairement faible : ce sont les lampes qui éclairent.

## Performance

La vue doit rester fluide sur téléphone. Les règles :

- **Rendu à la demande** (`Kitchen3D.tsx`) : pas de boucle permanente. `invalidate()` demande une image ; elle n'est dessinée que si quelque chose a changé : la caméra (`change` des contrôles, y compris tant qu'elle finit sa course), une lampe, une clim, un volet, la pendule, le choix de la lumière, la taille de la vue, une photo qui finit de se charger, le retour à l'écran. Une image suit l'autre seulement tant qu'un volet bouge (`stepShutters`). Au repos : aucun `requestAnimationFrame`, aucun rendu. **Tout ce qui change la scène doit appeler `invalidate`**, sinon l'écran ne le montre pas.
- **Ombre du soleil** : `shadowMap.autoUpdate = false`. Elle n'est refaite que sur `invalidate(true)` : à la première image, quand une lame de volet apparaît ou disparaît, quand le choix de la lumière change, quand la pendule avance, quand le soleil revient. Ni la caméra, ni les lampes ne la refont. Un soleil d'intensité nulle est caché (`sun.visible`).
- **Ne portent pas d'ombre** (`noShadow`) : les bouquets d'herbe, les fleurs de la pelouse, les massifs de fleurs, les fleurs et les fruits des arbres (`blossomOf`, `berriesOf`, `fruitsOf`), les bouquets et les fleurs des spirées (leur bloc en porte une), les grappes de la glycine, le grillage de la cage (il laisse passer le soleil) ; et, comme avant, les ampoules. Tout le reste en porte.
- **Peu d'appels de dessin** (environ 550 au lieu de 7 300) :
  - une plante tient en une poignée de maillages : son bois fondu en un seul (`woodOf`), ses touffes en un `InstancedMesh` par teinte (`tuftsOf`), ses fleurs et ses fruits en un chacun. **Ne jamais créer un `Mesh` par touffe ou par brindille.**
  - `buildScene` partage les matériaux identiques (`shareMaterials`), puis fond en un maillage par matériau tout ce qui ne bouge jamais (`mergeStatic`, groupe `static`). Restent à part : ce qui est marqué dans `userData` (lui ou un parent), les fenêtres à volet et la hotte, ce qui est caché, les `InstancedMesh`, les matériaux transparents. Un objet qui doit bouger, se cacher ou se cliquer après coup doit donc être **marqué** (ou passé à `mergeStatic`), sinon il est fondu.
- **Lampes** : une lampe éteinte ou injoignable a sa `PointLight` cachée (`visible = false`). three.js ne compte dans ses programmes que les lumières visibles, et chaque pixel boucle sur toutes : une lampe d'intensité nulle coûtait autant qu'une allumée. En échange, quand le **nombre** de lampes allumées change, three.js recompile ses programmes (un à-coup d'une image, au clic ou à la relecture du pont).
- **Téléphone** (`QUALITY`, `useMobile` : moins de 1024 px) : 1 pixel dessiné par pixel d'écran au plus (2 sur un bureau), pas de lissage MSAA, carte d'ombre de 2048 px (4096), un bouquet d'herbe sur deux, les haies de spirées réduites à leur bloc vert (`leafyHedges`), les mêmes feuilles de passiflore que sur un bureau. La qualité est choisie **à l'ouverture de la vue** : tourner le téléphone ou redimensionner la fenêtre ne reconstruit rien.
- Dans la boucle : rien n'est créé ni recherché à chaque image (les volets sont retrouvés une fois : `shutterSlats`).

## La bibliothèque

- `library.ts` dessine la bibliothèque du salon le long du mur des baies : les caisses en bois dans le coin du mur est, puis le meuble noir.
- `libraryData.ts` est **généré** depuis le projet « order » (`C:\projet\order`, base MongoDB : caisses et livres), en lecture seule : chaque caisse devient cinq panneaux, chaque livre un bloc de sa couleur, debout côte à côte ou à plat en piles. Quatre livres qui ne rentraient pas dans ce rangement simplifié n'y sont pas.
- Ce n'est qu'une copie à sa date (en tête du fichier) : elle ne suit pas la base. Pour la refaire, relire la base et régénérer le fichier.
- Trois maillages en tout (`InstancedMesh`) : panneaux de bois, panneaux noirs, livres.
