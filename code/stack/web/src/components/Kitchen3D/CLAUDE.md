# Kitchen3D – l'espace de vie en 3D (onglet Test)

Un essai : la cuisine, le coin repas, l'entrée, le salon et le bureau en Three.js (mètres), chargés seulement quand on ouvre l'onglet **Test** (`React.lazy` dans `App/UI.tsx`). La scène est construite une fois, démontée avec `forceContextLoss`, et n'est pas rendue hors écran.

## D'où viennent les formes

- **Les cotes générales** : le modèle SketchUp de la maison (`cuisine.skp`, exporté en Collada et lu une fois ; il n'est pas dans le dépôt). Murs, cuisine (2,86 m sur 4,67 m, plan de travail à 92 cm, côtés du U de 2,50 m), mur plein de 1,58 m puis bar de 1,24 m entre cuisine et salon, retour de mur de 50 cm à droite du frigo, salon de 7,49 m sur 3,90 m, plafond à 2,38 m, entrée, claustra, cellier, poteau et poutres.
- **La forme d'ensemble** recoupe le plan de Home (`PLAN_ROOMS`, `../Lights/constants.ts`) : cuisine au nord, salon en L au sud, escalier à l'est de la cuisine.
- **Les axes de la scène ne sont pas ceux du plan** : x croît vers le nord, z vers l'est (`ROOM`, `KITCHEN`, `ENTRY` dans `constants.ts`). Le mur ouest de la cuisine est 30 cm plus à l'est que celui du salon.
- **Les meubles et le détail de la cuisine** : des photos. Largeurs des caissons (`RUNS`) et places des meubles (`LAYOUT`) sont **estimées**, à corriger.

## Fichiers

- `Kitchen3D.tsx` : le conteneur (rendu WebGL, caméra à la souris, boucle de dessin, boutons, lampes) ; `lib/three.ts` : libération d'une scène et test de WebGL (fait une seule fois).
- `constants.ts` : pièce, caissons, meubles, textes, classes.
- `helpers.ts` : la cuisine (caissons, plan de travail, évier de ferme, plaque, hotte à trois pans adossée au mur) et la pièce (murs lisibles de l'intérieur seulement, parquet, plafond en lambris sauf la cuisine en plaque de plâtre, poutres, crédence de quatre rangées de carreaux).
- `furniture.ts` : le mobilier hors cuisine et les luminaires.
- `library.ts`, `libraryData.ts` : la bibliothèque (voir plus bas).
- `lighting.ts` : les lampes Hue dans la scène.
- `primitives.ts` : pavé, cylindre, matériau, texture sur canevas, `fixtureBulb`.

## Tests

- Les constructeurs de scène (`helpers.ts`, `furniture.ts`, `library.ts`, `lighting.ts`, `primitives.ts`) sont du three.js sans WebGL : testés tels quels sous jsdom (objets, places, appariement lampe–luminaire).
- Le conteneur : `WebGLRenderer` et `OrbitControls` simulés, `ResizeObserver`, `IntersectionObserver` et `requestAnimationFrame` remplacés ; la scène est la vraie.
- jsdom n'a pas de contexte 2D : les textures restent vides, sauf avec le faux contexte de `src/test/canvas.ts`.

## Les lampes Hue éclairent la scène

- `usePlan` et `useLampPlan` (les mêmes que la carte de Home) donnent les lampes du pont et leur place sur le plan, relues toutes les 5 s.
- `lampPlace` convertit une place du plan en place dans la scène ; une lampe hors de l'espace de vie (chambres, salle de bain, escalier, jardin) n'y est pas.
- Chaque lampe a une `PointLight` : couleur de la lampe (blanc chaud sans couleur), intensité selon sa luminosité, nulle si éteinte ou injoignable. Pas d'ombres portées par les lampes (seule la lumière d'ambiance en porte).
- **Luminaires** : une ampoule dessinée est marquée par `fixtureBulb`. Chaque lampe prend le luminaire le plus proche (à moins de `LAMP_LIGHT.matchDistance`, un par lampe) : la lumière part de lui et son ampoule prend la couleur de la lampe. Sans luminaire proche, une ampoule nue pend du plafond à la place de la lampe.
- La lumière d'ambiance est volontairement faible : ce sont les lampes qui éclairent.

## La bibliothèque

- `library.ts` dessine la bibliothèque du salon le long du mur des baies : les caisses en bois dans le coin du mur est, puis le meuble noir.
- `libraryData.ts` est **généré** depuis le projet « order » (`C:\projet\order`, base MongoDB : caisses et livres), en lecture seule : chaque caisse devient cinq panneaux, chaque livre un bloc de sa couleur, debout côte à côte ou à plat en piles. Quatre livres qui ne rentraient pas dans ce rangement simplifié n'y sont pas.
- Ce n'est qu'une copie à sa date (en tête du fichier) : elle ne suit pas la base. Pour la refaire, relire la base et régénérer le fichier.
- Trois maillages en tout (`InstancedMesh`) : panneaux de bois, panneaux noirs, livres.
