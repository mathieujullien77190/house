# Kitchen3D – la maison en 3D (onglet Test)

Un essai : toute la maison et son jardin en Three.js (mètres), chargés seulement quand l'onglet **Test** est affiché (`React.lazy` dans `App/UI.tsx` ; c'est l'onglet d'ouverture, `DEFAULT_TAB`). La scène est construite une fois, démontée avec `forceContextLoss`, et n'est pas rendue hors écran.

- **L'espace de vie**, meublé : la cuisine, le coin repas, l'entrée, le salon et le bureau.
- **Le reste de la maison** : la chambre d'invité, la salle de bain et le sas de l'entrée (meublés, `rooms.ts`) ; le couloir, la chambre de Matou et son placard, la cage d'escalier (buanderie) : des pièces vides.
- **Les murs extérieurs** : 30 cm (`OUTER_WALL`), percés aux fenêtres, sur un soubassement en retrait (`BASE` : le sol de la maison est 33 cm au-dessus du terrain).
- **Le jardin** (`garden.ts`), d'après le plan de Home : pelouse, terrasses, pavage, haie, portail, cage à perruches et son abri, poubelles, pompe à chaleur.

## D'où viennent les formes

- **Les cotes générales** : le modèle SketchUp de la maison (`cuisine.skp`, exporté en Collada et lu une fois ; il n'est pas dans le dépôt). Murs, cuisine (2,86 m sur 4,59 m (longueur mesurée), plan de travail à 92 cm, côtés du U de 2,50 m), mur plein de 1,58 m puis bar de 1,24 m entre cuisine et salon, retour de mur à droite du frigo (mesuré : 61 cm côté entrée), salon de 7,45 m (mesuré) sur 3,90 m, plafond à 2,36 m (mesuré), entrée, claustra, cellier, poteau et poutres.
- **Le reste de la maison** : des mesures (`REST`, `SAS`, `WC_ALCOVE`, les fenêtres `GUEST_WINDOW`, `MATOU_WINDOW`, `BATH_WINDOW` dans `constants.ts`) et des photos.
- **La forme d'ensemble** recoupe le plan de Home (`PLAN_ROOMS`, `../Lights/constants.ts`) : cuisine au nord, salon en L au sud, escalier à l'est de la cuisine, chambres et salle de bain à l'ouest.
- **Les axes de la scène ne sont pas ceux du plan** : x croît vers le nord, z vers l'est (`ROOM`, `KITCHEN`, `ENTRY` dans `constants.ts`). Le mur ouest de la cuisine est 30 cm plus à l'est que celui du salon.
- **Le jardin** : le plan de Home, à 39 unités le mètre (`gardenX`, `gardenZ` : sous la maison, le plan est ramené aux murs de la scène ; dehors, il est à l'échelle).
- **Les meubles et le détail de la cuisine** : des photos. Largeurs des caissons (`RUNS`) et places des meubles (`LAYOUT`) sont **estimées**, à corriger.
- **Les images accrochées aux murs** (cadres, puzzle) : des photos dans `web/public/kitchen3d/`, chargées comme textures par `furniture.ts`.

## Fichiers

- `Kitchen3D.tsx` : le conteneur (rendu WebGL, caméra à la souris, boucle de dessin, boutons, clics, état de la maison) ; `lib/three.ts` : libération d'une scène et test de WebGL (fait une seule fois).
- `constants.ts` : pièces, caissons, meubles, fenêtres, textes, classes.
- `helpers.ts` : la cuisine (caissons, plan de travail, évier de ferme, plaque, hotte à trois pans adossée au mur, objets du plan de travail) et les murs de toute la maison (pans lisibles de l'intérieur seulement, murs épais pleins, murs extérieurs), le parquet lame par lame (`parquet` : un seul maillage `InstancedMesh`, posé au tiers, la même trame pour toute la maison), le plafond en lambris sauf la cuisine en plaque de plâtre, les poutres, la crédence.
- `furniture.ts` : le mobilier de l'espace de vie, les luminaires, les fenêtres (`windowOnWall` : le cadre dans l'embrasure, les lames du volet cachées s'il n'y a pas de volet relié).
- `rooms.ts` : le mobilier de la chambre d'invité, de la salle de bain et du sas.
- `garden.ts` : le jardin.
- `library.ts`, `libraryData.ts` : la bibliothèque (voir plus bas).
- `lighting.ts` : les lampes Hue dans la scène.
- `shutters.ts` : les volets roulants et le jour qui entre.
- `live.ts` : la pendule, le voyant des clims, les écrans qui montrent les caméras.
- `primitives.ts` : pavé, cylindre, boule, matériau, texture sur canevas, bois veiné (`woodTexture`), `fixtureBulb`.

## La scène suit la maison

Ce que la scène anime ou rend cliquable est marqué dans `userData` par les constructeurs, et retrouvé par un parcours de la scène.

| Marque (`userData`) | Posée par | Lue par |
|---|---|---|
| `fixture`, `fixtureName` | `fixtureBulb` | `lighting.ts` |
| `shutter`, `area` (le groupe des lames) | `windowOnWall` | `shutters.ts` |
| `acUnit`, `acLed` (identifiant de la clim) | `furniture.ts`, `rooms.ts` | `live.ts` |
| `cameraScreen`, `screenOff`, `screenFacing` | `furniture.ts` | `live.ts` |
| `clockHand` | `furniture.ts` | `live.ts` |

- **Volets** (`useShutters`) : les fenêtres « cuisine », « salon », « pc » et « porte » (`SHUTTER_KEYS` : le mot cherché dans le nom du volet de la maison) montrent la part fermée de leur volet d'après son **dernier ordre** (descendu, monté, sinon à moitié : les Somfy RTS ne disent pas où ils sont). Le bouton « Volets réels » relâché les ouvre tous.
- **Jour** : la part de vitre découverte, fois la clarté du ciel (`skyOf` : météo de `useWeather`, sinon l'heure), dose l'ambiance et le soleil (`DAYLIGHT`). Pas de rayon par fenêtre.
- **Pendule** de la cuisine : à l'heure, remise à jour toutes les 15 s.
- **Clims** (`useAcUnits`) : le voyant du salon et de la chambre d'invité est vert en marche, rouge à l'arrêt, gris si l'état est inconnu.

## Les clics

Un clic sans glisser (moins de `CLICK_SLOP` pixels) ; la souris devient une main au-dessus de ce qui se clique. Dans cet ordre :

1. **Une ampoule** : allume ou éteint sa lampe Hue (`toggle` de `useLampPlan`). `lighting.pick` vise l'ampoule la plus près du rayon, même derrière un abat-jour ou un mur.
2. **Une clim** : l'allume ou l'éteint (`change(id, { on })`) ; rien si son état est inconnu.
3. **Le bouton « Voir »** d'un écran qui montre une caméra : ouvre sa page (`onOpenCamera` : l'onglet Caméras).
4. **Un écran** (les deux du bureau, la télé : `SCREEN_KEYS`) : la vue vient se placer en face (les deux écrans du bureau ensemble) et l'écran montre la caméra suivante, puis s'éteint. Le direct léger (`liveSrc`) est lu par une image hors page, redessinée sur l'écran dix fois par seconde, entière, tournée si la caméra est en portrait. Un flux n'est ouvert que tant qu'il est montré.
5. **Une fenêtre à volet** : envoie l'ordre contraire du dernier (`send` de `useShutters`). Pendant `SHUTTER_ANIMATE_MS`, le changement d'état qui suit est animé (`stepShutters`) ; un changement venu d'ailleurs se place d'un coup.

## Tests

- Les constructeurs de scène (`helpers.ts`, `furniture.ts`, `rooms.ts`, `garden.ts`, `library.ts`, `lighting.ts`, `shutters.ts`, `live.ts`, `primitives.ts`) sont du three.js sans WebGL : testés tels quels sous jsdom (objets, places, marques, appariement lampe–luminaire, rayons).
- Le conteneur : `WebGLRenderer` et `OrbitControls` simulés, `ResizeObserver`, `IntersectionObserver` et `requestAnimationFrame` remplacés, les hooks de la maison simulés ; la scène est la vraie. Pour cliquer un objet, le test place la caméra face à lui et clique au milieu de la vue.
- jsdom n'a pas de contexte 2D et ne charge pas les images : les textures restent vides, sauf avec le faux contexte de `src/test/canvas.ts` (`collectImages` et `loadImage` y simulent l'image d'un direct).

## Les lampes Hue éclairent la scène

- `usePlan` et `useLampPlan` (les mêmes que la carte de Home) donnent les lampes du pont et leur place sur le plan, relues toutes les 5 s.
- `lampPlace` convertit une place du plan en place dans la scène ; une lampe hors de l'espace de vie (chambres, salle de bain, escalier, jardin) n'y est pas, **sauf si son luminaire est nommé** dans la scène (`LAMP_FIXTURES` : couloir, chambre, spots de la salle de bain…).
- Chaque lampe a une `PointLight` : couleur de la lampe (blanc chaud sans couleur), intensité selon sa luminosité, nulle si éteinte ou injoignable. Pas d'ombres portées par les lampes (seul le soleil en porte).
- **Luminaires** : une ampoule dessinée est marquée par `fixtureBulb(mesh, nom)`. Une lampe prend d'abord le luminaire qui porte son nom (nom du pont, en minuscules), sinon le luminaire le plus proche (à moins de `LAMP_LIGHT.matchDistance`, un par lampe) : la lumière part de lui et son ampoule prend la couleur de la lampe. Sans luminaire, une ampoule nue pend du plafond à la place de la lampe.
- La lumière d'ambiance de nuit est volontairement faible : ce sont les lampes qui éclairent.

## La bibliothèque

- `library.ts` dessine la bibliothèque du salon le long du mur des baies : les caisses en bois dans le coin du mur est, puis le meuble noir.
- `libraryData.ts` est **généré** depuis le projet « order » (`C:\projet\order`, base MongoDB : caisses et livres), en lecture seule : chaque caisse devient cinq panneaux, chaque livre un bloc de sa couleur, debout côte à côte ou à plat en piles. Quatre livres qui ne rentraient pas dans ce rangement simplifié n'y sont pas.
- Ce n'est qu'une copie à sa date (en tête du fichier) : elle ne suit pas la base. Pour la refaire, relire la base et régénérer le fichier.
- Trois maillages en tout (`InstancedMesh`) : panneaux de bois, panneaux noirs, livres.
