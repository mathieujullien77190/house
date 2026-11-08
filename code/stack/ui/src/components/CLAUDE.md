# ui/src/components – les composants de @house/ui

Règles du paquet (dumb, imports relatifs, Storybook, mobile, tests) : `../../CLAUDE.md`. Ici, ce que fait chaque composant et ses options. Un dossier par composant : `ls` pour la liste exacte.

## Structure de page

- `Page` + `PageHeader` (`onTitle` rend le titre cliquable), `PageFrame`, `SectionTitle`, `Notice`, `Collapsible` (un bloc qui se replie).
- `TopBar` : la barre du haut, collée en haut de l'écran : titre (`onTitle` le rend cliquable), onglets (`tabs`), état, boutons ; **sous 1024 px, le titre et un bouton « sandwich » en haut à droite qui ouvre un menu** : les pages, l'état, les boutons. Utilisée par les deux apps.
- `Tabs`, `Button`, `KeyForm`, `Pager`.

## Formulaires

- `Checkbox` (une case à cocher et son texte), `Select` (une liste déroulante stylée, clavier compris, à la place du `<select>` natif).

## Données

- `SimpleTable` (un tableau quadrillé simple, une fiche par ligne sur téléphone).
- `DataTable` : des lignes qui se déplient au clic avec `details`, `openKey`, `onRowClick` ; `TableFilters` (les filtres d'un tableau : une liste de valeurs, un jour, « Effacer les filtres » ; `DataTable` les montre par `filters`), `StackedDate` (une date et son heure sur deux lignes).
- `CodeBlock`, `Totals`, `PieChart` (camembert en anneau et sa légende), `LineChart` (courbe en direct), `SpecList` (liste nom et valeur), `ValueChips` (des valeurs seules, un bloc chacune).
- `ApiExplorer` : la liste des services rangée par type (`group` de chaque service, un titre par type dans l'ordre où ils apparaissent). Il montre aussi les **écritures** (`method`, `body` : un cadre en pointillés, pas un bouton, pour ne pas allumer une lampe d'un clic).

## Médias

- `MediaPanel`, `SnapshotImage` : accepte `upright` (texte remis droit dans un cadre tourné) ; met son message à la ligne (`\n`) et le garde à la largeur d'un cadre tourné.
- `ClipPlayer` : **plus de commandes natives** : une barre maison (lecture ou pause, barre de temps, durée) est **posée dans l'image, en bas**, sur un dégradé, un clic sur la vidéo la lance ou l'arrête. `controlsHost` : des commandes maison posées dans un élément du parent (droites même si la vidéo est tournée). Le son du clip (`audioSrc`, un fichier à part) est joué avec la vidéo par un `<audio>` caché qui la suit (lecture, pause, sauts, vitesse ; un écart de moins de 0,4 s n'est pas corrigé), avec un bouton « Activer le son » si le navigateur refuse de le lancer tout seul.
- `ZoneEditor` : le polygone d'une zone dessinée sur la vidéo : l'extérieur assombri, des ronds aux sommets à glisser, un rond au milieu de chaque côté pour ajouter un sommet, double clic ou clic droit sur un sommet pour le retirer ; `quarterTurn` quand le parent est tourné d'un quart de tour ; aucune donnée.

## Caméras et lumières

- `CameraTile` : une vignette de la mosaïque : média avec un `overlay` en bas à gauche, nom, légende, `footer` sous le nom, `alert` (caméra éteinte : bordure rouge), un bouton transparent qui couvre tout.
- `CameraCard` : la carte d'une caméra. `screen` (téléphone) : un écran fixe, la vidéo sur le tiers du haut avec `actions`, `details` et « ⛶ » posés dessus, `timeline` sur les deux tiers du bas, `onBack` en bouton fixe en haut à gauche (une flèche, `backLabel` en étiquette), sans titre ni légende. Une vue **« en grand »** : plein écran, paysage, tournée d'un quart de tour si l'écran reste droit ; `details` accueille des mesures sous le média ; `mediaGesture` reçoit du parent les gestes et le style du zoom au doigt, appliqués en vue en grand et sur l'écran du téléphone ; `portraitMedia` : vue en grand qui garde l'écran tel quel pour un média en portrait ; bouton « ⛶ » posé sur la vidéo en haut à droite.
- `Timeline` : accepte `vertical` (téléphone : axe vertical, le plus récent en haut, et `fill` pour remplir la hauteur de son parent ; les positions restent en % du plus ancien au plus récent, `pointStyle` et `spanStyle` les retournent).
- `LampDot` : le rond d'une lampe (orange allumée, gris éteinte, contour rouge pâle injoignable, comme son ampoule sur le plan) ; accepte `brightness` (la luminosité en opacité du rond allumé). `PlugSquare` : le carré d'une prise (vert allumée, rouge éteinte), posé à côté de `LampDot`.
- `LightsPanel` : les lumières par zone : un rectangle repliable par zone (nom, compte, petits boutons ON / OFF de la zone), une grille de petites cases ON/OFF (3 colonnes sur téléphone, 4 dès `sm:`, 6 dès `lg:`), une case par lampe. **ON = puissance max** (`{ on: true, bri: MAX_BRI }`, 254). `dimmable` (ids) : seules ces lampes gardent un curseur de luminosité, sur une ligne pleine largeur sous la grille ; `lampExtra` (un bouton d'action que le parent choisit) va sous la case, ou dans cette ligne pour une lampe `dimmable`. Les détecteurs de mouvement sont en lignes sous la grille.
