# Timeline – la frise d'une caméra

Conteneur de `Timeline` de `@house/ui` (option `vertical` : `../../../../ui/src/components/CLAUDE.md`). Calculs purs dans `helpers.ts`.

## Fenêtre et curseur

- Raccourcis 10 min, 1 h, 6 h, 24 h ; molette = zoom, glisser = déplacer.
- « Direct » zoome sur 60 s, « maintenant » au centre (vue d'arrivée). Le futur est hachuré à droite.
- Un bloc par événement, hachuré rouge et allongé jusqu'au bord droit tant qu'il est en cours.
- Le curseur rouge avance seul en temps réel après un clic sur l'axe ; l'image ne change qu'à chaque image gardée.
- `initialCursor` : la frise s'ouvre sur cet instant (image d'une autre caméra).

## Bloc d'un événement

- Couvre **tout le clip** (`buildMarkers`), même là où rien ne bouge : de `clip_started_at` (à défaut `started_at` moins `MARKER_LEAD_SECONDS`, 5 s) à `ended_at` plus `MARKER_TAIL_SECONDS` (10 s).
- `clipSpan` reste `null`, la prop `clipRange` n'est plus lue.

## Clics

- Clic sur l'axe : image de cet instant.
- Clic dans un bloc : le clip repart **toujours du début**. La fenêtre se recadre pour que tout le bloc occupe 90 % de l'axe (`EVENT_FOCUS_SHARE`, `focusOn`). Le curseur suit la lecture.

## Vitesse

- `rate` (secondes de frise par seconde réelle, 1 par défaut), réglée par `FastScroll` (`CameraCard/CLAUDE.md`) : ×1, 2, 5, 10, 30, 60… ×600 ; `◀` passe ×1 puis recule.
- Le curseur va de la plus ancienne image gardée au direct ; la fenêtre le suit.
- **×0 arrête le temps** ; à la reprise le pas repart de maintenant, sans saut.
- À ×0, `|◀` et `▶|` font défiler les images gardées une par une (`stepRef`, `stepBy` : saute à l'image avant ou après le curseur, rien au bord).

## Données

- **TanStack Query** (`lib/queryClient.ts`, client unique sans fournisseur) : une fenêtre déjà vue revient du cache, l'ancienne reste affichée pendant l'arrivée de la nouvelle (`keepPreviousData`).
- Événements : `/events?camera=&from=&to=`, tout de suite à l'ouverture puis après 250 ms de calme (`lib/useDebounced.ts`), réunis aux 200 récents relus chaque seconde.

## Téléphone (sous 1024 px, `lib/useMobile.ts`)

Frise **verticale, le plus récent en haut**, vue d'une caméra en écran fixe :

- moitié haute : la vidéo et ses commandes (L/4K, Allumer si éteinte, jamais Éteindre : `hideOff`, températures en `ValueChips`, « ⛶ ») ;
- moitié basse : la frise avec « Direct » et les durées ;
- bouton retour fixe en haut à gauche (carré de 32 px) ; `AppUI` ne rend que `CameraCard`.

Gestes identiques sur grand écran mais lus le long de l'axe (`alongOf`, `fractionAlong`, `shiftSeconds`) ; positions rendues en % (`vertical`).
