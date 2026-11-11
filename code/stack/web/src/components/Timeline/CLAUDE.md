# Timeline – la frise d'une caméra

Le conteneur de `Timeline` de `@house/ui` (option `vertical` : `../../../../ui/src/components/CLAUDE.md`). Calculs purs dans `helpers.ts`.

## Fenêtre, événements, curseur

- Une fenêtre de temps : raccourcis 10 min, 1 h, 6 h et 24 h (la molette et le glisser vont plus loin), molette pour zoomer, glisser pour se déplacer, « Direct » : zoome sur 60 s (c'est aussi la vue à l'arrivée), « maintenant » au centre, pour lire les secondes.
- Un bloc par événement : commence 5 s avant le mouvement, comme le clip ; hachuré rouge et allongé jusqu'au bord droit tant qu'il est en cours.
- La couverture en images (bande bleue), la ligne « maintenant » (un trait, sans le mot) et le futur hachuré à sa droite (la moitié de la fenêtre en direct : « maintenant » est au centre, le futur se découvre en glissant).
- Le curseur rouge avance seul en temps réel après un clic sur l'axe : une seconde par seconde, l'image ne changeant qu'à chaque image gardée (le rythme se règle dans House Sync).
- **Vitesse** (`rate`, en secondes de frise par seconde réelle, 1 par défaut) : `components/FastScroll` (une fois une image choisie sur la frise, aussi sur téléphone) pose, **à côté de « 10 min, 1 h… » (et sur la vidéo, en bas à gauche, en vue en grand)** (`controls`, `extra` de la frise de `@house/ui`), deux flèches **◀ ▶** : `▶` monte d'un cran (×1, 2, 5, 10, 30, 60… jusqu'à ×600), `◀` descend, passe ×1 puis **recule** (◀ ×1…). Le curseur recule jusqu'à la plus ancienne image gardée, avance jusqu'au direct, et la fenêtre le suit sur les deux bords. **La vitesse 0 arrête le temps** : le curseur reste sur l'image (un cran sous ×1, à la reprise le pas repart de maintenant, sans saut). **`initialCursor`** : la frise s'ouvre sur cet instant (image d'une autre caméra), la fenêtre le contient.
- Quand un clip est ouvert, un cadre en pointillés montre ce que la vidéo couvre (elle déborde de l'événement : marges et segments) : le curseur la suit jusqu'au bout de ce cadre.
- Les instants d'images et les événements de la fenêtre passent par **TanStack Query** (`lib/queryClient.ts`, un client unique passé directement à `useQuery`, pas de fournisseur) : une fenêtre déjà vue revient du cache, l'ancienne reste affichée pendant qu'une nouvelle arrive (`keepPreviousData`). Les événements sont demandés à l'API (`/events?camera=&from=&to=`) tout de suite à l'ouverture, puis après 250 ms de calme quand la fenêtre bouge (`lib/useDebounced.ts`), et réunis aux 200 récents que la page relit chaque seconde : la frise voit tout l'historique.

## Clics

- Clic sur l'axe → image de cet instant.
- Clic dans un bloc → le clip repart toujours du début de la vidéo, où qu'on clique (se placer dans le clip se fait avec le lecteur vidéo, pas avec la frise) ; la fenêtre se recadre pour que l'événement occupe la moitié de l'axe ; le curseur suit la lecture (l'avance du clip sur l'événement vient de `clip_started_at`, ou se déduit de la durée de la vidéo pour les anciens clips).

## Sur téléphone (sous 1024 px, `lib/useMobile.ts`)

La frise est **verticale, le plus récent en haut**, et la vue d'une caméra y est un **écran fixe** :

- la vidéo sur le tiers du haut avec ses commandes dessus : Léger/4K ou 720p/4K (sans le codec), Allumer en haut à droite si la caméra est éteinte (jamais « Éteindre » sur téléphone : `hideOff`), les températures en bas à gauche, **juste les valeurs, un bloc chacune** (`ValueChips`, sans le nom du capteur), « ⛶ » en bas à droite ;
- la frise sur les deux tiers du bas avec « Direct » et les durées dedans (sans la ligne de dates ni le compteur « plus anciens ») ;
- un bouton retour fixe en haut à gauche, **une simple flèche** ; ni titre, ni menu, ni « Oublier la clé » sur cet écran, `AppUI` ne rend que `CameraCard`.

Sur grand écran elle est horizontale. Les gestes sont les mêmes (glisser, pincer, molette) mais lus le long de l'axe (`alongOf`, `fractionAlong`, `shiftSeconds` dans `helpers.ts`) ; le dessin retourne les positions en % (`vertical` de `@house/ui`).
