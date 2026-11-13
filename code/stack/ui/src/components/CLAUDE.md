# ui/src/components – les composants de @house/ui

Règles du paquet : `../../CLAUDE.md`. Ici, les options non évidentes. Liste exacte : `ls`.

## Page

- `Page`, `PageHeader` (`onTitle` rend le titre cliquable), `PageFrame`, `SectionTitle`, `Notice`, `Collapsible`.
- `TopBar` : barre collée en haut (titre, onglets `tabs`, état, boutons). Sous 1024 px : titre + bouton « sandwich » qui ouvre un menu.
- `Tabs` : `compact` (haut comme un `Button`), `tiny` (32 px, pour « L / 4K » sur téléphone). Aussi `Button`, `KeyForm`, `Pager`.

## Formulaires

- `Checkbox`, `Select` (remplace le `<select>` natif, clavier compris).
- `HeatingPanel` : règle de chauffage automatique de la prise. Champs `number` / `decimal` / `time` en texte, le parent convertit. Sans titre, état ni journal. `compact` : bloc étroit (320 px), deux colonnes, plus petit.

## Données

- `SimpleTable` (une fiche par ligne sur téléphone), `DataTable` (`details`, `openKey`, `onRowClick`, `filters`), `TableFilters`, `StackedDate`.
- `CodeBlock`, `Totals`, `PieChart`, `LineChart`, `SpecList`, `ValueChips`.

## Médias

- `MediaPanel`.
- `SnapshotImage` : `upright` remet le texte droit dans un cadre tourné. Au démontage, `src` devient un GIF d'un pixel : un flux MJPEG ne se termine jamais et le navigateur n'ouvre que 6 connexions par hôte.
- **Le média n'a ni bordure ni arrondi propre** (`MEDIA_INNER_CLASS`, pour `SnapshotImage` et `ClipPlayer`) : la boîte qui l'héberge arrondit et rogne.
- `ClipPlayer` : pas de commandes natives, barre maison (lecture, temps) posée en bas de l'image sur un dégradé ; un clic sur la vidéo lance ou arrête.
  - `overlay` : posé dans le cadre exact de la vidéo (contours du mouvement).
  - `barInset` : la barre s'arrête avant les boutons du bas à droite. `controlsHost` : commandes posées dans un élément du parent (droites même si la vidéo est tournée).
  - `audioSrc` : `<audio>` caché qui suit la vidéo (écart de moins de 0,4 s non corrigé), bouton « Activer le son » si le navigateur refuse.
- `ZoneEditor` : polygone sur la vidéo (extérieur assombri, sommets à glisser, rond au milieu d'un côté pour ajouter, double clic ou clic droit pour retirer). `quarterTurn` si le parent est tourné. Aucune donnée.

## Caméras et lumières

- `CameraTile` : `overlay` en bas à gauche, `footer` sous le nom, `alert` (bordure rouge si éteinte), bouton transparent couvrant tout.
- `CameraCard` :
  - **Taille unique** des boutons sur la vidéo : carré de 32 px (`size-8`, `rounded-md`), y compris « L / 4K » (`Tabs` `tiny`). Les blocs et ronds posés dessus font aussi 32 px (`ValueChips` en `h-8`, `MapIcon` en `size-8`).
  - `screen` (téléphone) : vidéo 16/9 pleine largeur (un média portrait garde la moitié haute), `actions`, `details`, « ⛶ » dessus, `timeline` dessous, `onBack` en bouton fixe en haut à gauche (`backLabel`), sans titre ni légende.
  - Vue « en grand » : plein écran paysage, tournée d'un quart de tour si l'écran reste droit. `details` : mesures sous le média (téléphone : en bas à gauche de la vidéo). `portraitMedia` garde l'écran droit pour un média portrait. « Réduire » n'affiche que ✕ (`COLLAPSE_ICON`), `COLLAPSE_LABEL` = nom accessible.
  - `mediaGesture` : gestes et style du zoom au doigt venant du parent.
  - Positions sur la vidéo : « ⛶ » en bas à droite ; `topLeft` en haut à gauche (rond d'enregistrement, grand écran) ; `videoActions` en haut à droite (grand écran, « L / 4K » ; sur téléphone dans `actions`) ; `sound` en bas à droite à gauche de « ⛶ ».
  - `layer` : couche sur toute la vidéo en vue normale (pas en vue en grand), `pointer-events-none`, ses enfants se déclarent cliquables (repères de caméra).
- `Timeline` : `vertical` (téléphone, récent en haut) et `fill` pour remplir la hauteur du parent ; positions en % (`pointStyle`, `spanStyle` les retournent).
- `LampDot` : orange allumée, gris éteinte, contour rouge pâle injoignable ; `brightness` = opacité. `PlugSquare` : vert allumée, rouge éteinte.
- `StatusDot` : pastille d'état de 9 px (verte `on`, rouge `off`, grise `missing`, liseré noir de 1 px). `CameraTile` la reçoit en prop `dot` devant le nom ; le plan (`MapPlan/icons.ts`) reprend `STATUS_DOT_DIAMETER` et `STATUS_DOT_RING` pour dessiner la même.
- `LightsPanel` : lumières par zone.
  - Un rectangle repliable par zone (nom, compte, ON / OFF de la zone), grille de cases (3 colonnes téléphone, 4 dès `sm:`, 6 dès `lg:`), une par lampe. Les zones gardent l'ordre du parent, les lampes ne bougent pas. Détecteurs de mouvement en lignes sous la grille.
  - Case d'une lampe : fond neutre, bordure jaune quand allumée (pâlit avec la luminosité), rond ON / OFF en haut à droite (comme sur la carte), curseur de luminosité (bleu) si la lampe varie (`bri` non nul). `lampExtra` : bouton d'action sous la case.
  - **ON = puissance max** (`{ on: true, bri: MAX_BRI }`, 254).
