# Kitchen3D – la maison en 3D (Home)

Toute la maison et son jardin en Three.js (mètres) : c'est ce que montre **Home** (`../Home/CLAUDE.md`), qui la charge à part (`React.lazy` dans `Home/Home.tsx`). Au-dessus de la vue : le titre, deux boutons (« Vue du dessus » et « Réinitialiser la vue ») et le compte des lampes allumées, puis le choix de la saison, celui du temps et le bouton du vent (voir « Saisons et météo ») ; dessous, la ligne d’aide (pas de texte d’introduction) ; la hotte est toujours dessinée (`hood` de `buildScene` ne sert plus à la cacher) et les volets suivent toujours ceux de la maison. La scène est construite une fois, démontée avec `forceContextLoss`, et n'est pas rendue hors écran.

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

- `Kitchen3D.tsx` : le conteneur (rendu WebGL, caméra à la souris, boucle de dessin, boutons, clics, état de la maison) ; `lib/three.ts` : libération d'une scène et test de WebGL (fait une seule fois).
- `helpers.ts` : `buildScene`, qui assemble le gros œuvre, le mobilier, le jardin et les files de caissons.
- `constants.ts` : pièces, caissons, meubles, fenêtres, repères du gros œuvre (`SHELL`, `PASSAGE`, baies), textes, classes.
- `primitives.ts` : pavé, cylindre, boule, matériau, texture sur canevas, bois veiné (`woodTexture`), `facing`, `fixtureBulb`.
- `textures.ts` : les textures dessinées (sisal, plan de travail, carrelages, lambris, terre cuite, grillage, cadran) et les photos (`photoTexture`).
- `materials.ts` : un jeu de matériaux par partie (cuisine et gros œuvre, mobilier, pièces, jardin), créé une fois par scène.
- `library.ts`, `libraryData.ts` : la bibliothèque (voir plus bas).
- `lighting.ts` : les lampes Hue dans la scène.
- `shutters.ts` : les volets roulants et le jour qui entre.
- `live.ts` : la pendule, le voyant des clims, les clims et les caméras à cliquer.
- `weather.ts` : la pluie, la neige (flocons et couche blanche) et ce que le temps change à la lumière ; `wind.ts` : ce qui se balance dans le vent ; `climate.ts` : le choix (saison, temps, vent) gardé sur l'appareil.
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
- `ground.ts` : pelouses, marches de soutènement, terrasses, pavage ; `borders.ts` : haies, murets, portail et portillon.
- `aviary.ts` : la cage à perruches et ses bacs ; `equipment.ts` : poubelles, table, pompe à chaleur, terrasse en ipé, ligne électrique, caméras du jardin ; `lounge.ts` : le salon de jardin ; `pergola.ts` : la pergola (d’après son modèle SketchUp).
- `branches.ts` : branches et touffes communes aux arbres ; `trees.ts` (cerisier, prunus, arbre taillé, néflier), `laurel.ts`, `plants.ts` (fougère, choisya, hortensia, passiflore, spirées, glycine, buissons, massifs de fleurs, vigne vierge), `grass.ts` (touffes d’herbe et fleurs de la pelouse).
- `seasons.ts` : les saisons (marques, teintes, `applySeason`, `seasonOf`).

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
| `season` (`evergreen`, `leaves`, `blossom`, `cherries`, `daisies`, `medlars`, `harvest`, `twigs`) | `inSeason` (`garden/seasons.ts`), par les constructeurs des arbres et des plantes | `applySeason` (`garden/seasons.ts`) |
| `foliage` (sur le **matériau** d'un feuillage : sa teinte et celles d'autres saisons) | `foliage` (`garden/seasons.ts`) | `applySeason` |
| `tints` (teintes d'automne feuille par feuille, sur le maillage de la vigne vierge) | `creeper` (`garden/plants.ts`) | `applySeason` |
| `sway` (de combien l'objet penche dans le vent, par mètre de hauteur) | arbres, laurier, arbustes, fougère, massifs, feuilles et fleurs des spirées et de la glycine, touffes d'herbe | `wind.ts` |
| `snow` (l'épaisseur de la neige qui tient dessus, en mètres) | `snowTop` (`primitives.ts`) : pelouses, carrelages, pavage, allée, murets, haies, piliers, pergola, toit de la cage, table, poubelles, pompe à chaleur, terrasse en ipé | `weather.ts` |

- **Volets** (`useShutters`) : les fenêtres « cuisine », « salon », « pc » et « porte » (`SHUTTER_KEYS` : le mot cherché dans le nom du volet de la maison) montrent la part fermée de leur volet d'après son **dernier ordre** (descendu, monté, sinon à moitié : les Somfy RTS ne disent pas où ils sont).
- **Jour** : la part de vitre découverte, fois la clarté du ciel (`skyOf` : météo de `useWeather`, sinon l'heure), dose l'ambiance et le soleil (`DAYLIGHT`). Pas de rayon par fenêtre. **Pour l'instant, `ALWAYS_DAY` (`constants.ts`) est à `true`** : plein jour forcé, quels que soient l'heure, la météo et les volets (plus simple pour retoucher la scène) ; à `false`, le jour suit ce calcul.
- **Pendule** de la cuisine : à l'heure, remise à jour toutes les 15 s.
- **Clims** (`useAcUnits`) : le voyant du salon, de la chambre d'invité et de la chambre de Matou est vert en marche, rouge à l'arrêt, gris si l'état est inconnu.
- **Écrans** : les deux du bureau et la télé sont éteints (dalles noires, `SCREEN_OFF`) et ne se cliquent pas.

## Saisons et météo

Au-dessus de la vue : **Saison** (Printemps, Été, Automne, Hiver, Auto : la saison du jour, `seasonOf`), **Météo** (Soleil, Pluie, Neige) et le bouton **Vent**, qui s'ajoute à n'importe quel temps. Au départ : Printemps, Soleil, pas de vent. Le choix est gardé sur l'appareil (`localStorage` `house-garden-climate`, `climate.ts`).

**La scène n'est pas reconstruite** : tout est construit une fois (fleurs, fruits et bois nu compris), marqué, puis montré, caché ou reteint.

Les saisons (`applySeason`, d'après `SEASON_SHOWS`) :

- **Printemps** : tout a ses feuilles. En fleurs : les cerisiers (blanc) et le pommier (blanc rosé), le prunus (fuchsia), les spirées (blanc), la glycine, les choisyas, l'hortensia, le buisson jaune, la passiflore, les massifs fuchsia sous les arbres, les petites fleurs de couleur et les pâquerettes de la pelouse. Les cerisiers portent leurs cerises.
- **Été** : plus aucune fleur, sauf les pâquerettes. Le laurier jaunit : un mélange de touffes jaunes et vertes (`LAUREL_SUMMER`).
- **Automne** : pas de fleurs. Feuillage aux couleurs d'automne (`AUTUMN`) : cerisiers, pommier, néflier, prunus, glycine ; la vigne vierge rougit et porte ses grappes de baies sombres ; les pommes sont sur le pommier (pas avant).
- **Hiver** : plus de feuilles nulle part, **sauf les spirées et le laurier**. Il reste le bois (troncs, branches, brindilles, tiges ; choisyas et hortensia ont un bois nu qu'on ne voit qu'alors) ; la fougère et les massifs disparaissent. Les haies taillées en bloc (thuyas, haie du nord), la pelouse et ses bouquets d'herbe restent.
- Les nèfles sont là tant que le néflier a ses feuilles.
- **Un arbre a la même forme toute l'année** : fleurs, cerises, grappes, bois nu et teintes d'automne ont leur propre tirage (`seed + 3000`, `+ 5000`, `+ 6000`), ajouté après coup ; le tirage de l'arbre n'est pas touché.

La météo (`createWeather`, `WEATHER_LOOK`, `FALL`) :

- **Pluie** : 5 000 gouttes (des traits, un seul objet `LineSegments`) sur tout le terrain, ciel gris, moins de jour et presque plus de soleil.
- **Neige** : 4 000 flocons lents (un seul objet `Points`), ciel clair, et une **couche blanche** : chaque objet marqué `snow` reçoit une copie blanche de lui-même, soulevée de l'épaisseur de sa neige (4 cm sur les sols, `SNOW_DEEP`), cachée hors neige. Pas de neige sur les arbres ni dans la cage.
- **Rien ne tombe dans les pièces** (la maison n'a pas de toit dessiné) : au-dessus de la maison et du sas, les gouttes s'arrêtent au haut des murs (`AIR.roof`, `sheltered`).
- **Vent** (`WIND`, du sud-ouest) : la pluie et la neige tombent en biais ; ce qui est marqué `sway` penche et se balance depuis son pied (la matrice de l'objet est cisaillée, rien n'est créé). Seul, par beau temps, il balance quand même.
- **Lumière** : le temps choisi multiplie le jour (`DAYLIGHT`) et le soleil, par-dessus `ALWAYS_DAY` ou le calcul du jour ; il pose aussi la couleur du fond (aucun fond par beau temps).
- La pluie, la neige et le vent avancent dans la boucle de dessin (pas hors écran), sans rien créer à chaque image.

## Les clics

Un clic sans glisser (moins de `CLICK_SLOP` pixels) ; la souris devient une main au-dessus de ce qui se clique. Dans cet ordre :

1. **Une ampoule** : allume ou éteint sa lampe Hue (`toggle` de `useLampPlan`). `lighting.pick` vise l'ampoule la plus près du rayon, même derrière un abat-jour ou un mur.
2. **Une clim** : l'allume ou l'éteint (`change(id, { on })`) ; rien si son état est inconnu.
3. **Une caméra** (les trois modèles Reolink : `MAST_CAMERA` sur le mât de l'entrée, `GARDEN_CAMERA` au coin de la cage, `CAGE_CAMERA` dans la cage) : appelle `onOpenCamera(nom)` ; `App` ouvre l'onglet Caméras sur elle (la mosaïque si la maison n'a pas de caméra de ce nom). Sans `onOpenCamera`, rien.
4. **Une fenêtre à volet** : envoie l'ordre contraire du dernier (`send` de `useShutters`). Pendant `SHUTTER_ANIMATE_MS`, le changement d'état qui suit est animé (`stepShutters`) ; un changement venu d'ailleurs se place d'un coup.

## Tests

- Un `*.test.ts` à côté de chaque module, dans son dossier. Les constructeurs de scène (`helpers.ts`, `kitchen/`, `house/`, `furniture/`, `garden/`, `library.ts`, `lighting.ts`, `shutters.ts`, `live.ts`, `weather.ts`, `wind.ts`, `primitives.ts`, `textures.ts`, `materials.ts`, `reolink.ts`) sont du three.js sans WebGL : testés tels quels sous jsdom (objets, places, marques, matériaux partagés, même forme pour la même graine, appariement lampe–luminaire, rayons).
- Le conteneur : `WebGLRenderer` et `OrbitControls` simulés, `ResizeObserver`, `IntersectionObserver` et `requestAnimationFrame` remplacés, les hooks de la maison simulés ; la scène est la vraie. Pour cliquer un objet, le test place la caméra face à lui et clique au milieu de la vue. `ALWAYS_DAY` y est remplacé (`vi.mock` de `./constants`) pour passer par ses deux valeurs.
- Saisons : `garden/seasons.test.ts` passe chaque plante par les quatre saisons (ce qui se voit, les teintes). Météo : `weather.test.ts` (gouttes, biais du vent, rien sous le haut des murs, couche de neige), `wind.test.ts`, `climate.test.ts`.
- jsdom n'a pas de contexte 2D et ne charge pas les images : les textures restent vides, sauf avec le faux contexte de `src/test/canvas.ts`.

## Les lampes Hue éclairent la scène

- `usePlan` et `useLampPlan` donnent les lampes du pont et leur place sur le plan, relues toutes les 5 s.
- `lampPlace` convertit une place du plan en place dans la scène ; une lampe hors de l'espace de vie (chambres, salle de bain, escalier, jardin) n'y est pas, **sauf si son luminaire est nommé** dans la scène (`LAMP_FIXTURES` : couloir, chambre, spots de la salle de bain…).
- Chaque lampe a une `PointLight` : couleur de la lampe (blanc chaud sans couleur), intensité selon sa luminosité, nulle si éteinte ou injoignable. Pas d'ombres portées par les lampes (seul le soleil en porte).
- **Luminaires** : une ampoule dessinée est marquée par `fixtureBulb(mesh, nom)`. Une lampe prend d'abord le luminaire qui porte son nom (nom du pont, en minuscules), sinon le luminaire le plus proche (à moins de `LAMP_LIGHT.matchDistance`, un par lampe) : la lumière part de lui et son ampoule prend la couleur de la lampe. Sans luminaire, une ampoule nue pend du plafond à la place de la lampe.
- La lumière d'ambiance de nuit est volontairement faible : ce sont les lampes qui éclairent.

## La bibliothèque

- `library.ts` dessine la bibliothèque du salon le long du mur des baies : les caisses en bois dans le coin du mur est, puis le meuble noir.
- `libraryData.ts` est **généré** depuis le projet « order » (`C:\projet\order`, base MongoDB : caisses et livres), en lecture seule : chaque caisse devient cinq panneaux, chaque livre un bloc de sa couleur, debout côte à côte ou à plat en piles. Quatre livres qui ne rentraient pas dans ce rangement simplifié n'y sont pas.
- Ce n'est qu'une copie à sa date (en tête du fichier) : elle ne suit pas la base. Pour la refaire, relire la base et régénérer le fichier.
- Trois maillages en tout (`InstancedMesh`) : panneaux de bois, panneaux noirs, livres.
