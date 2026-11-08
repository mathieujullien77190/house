# Home – les clips sauvegardés

L'onglet **Home** (le premier ; on y arrive aussi en cliquant le titre « House », `onTitle` de `TopBar`). Ce n'est pas l'onglet de départ : la page s'ouvre sur les caméras (`DEFAULT_TAB`, au rechargement aussi).

- Pour le moment, les **clips sauvegardés** (`GET /events?saved=1`), une vignette par clip (la première image de la vidéo, `preload="metadata"`) ; un clic lit le clip, avec un bouton retour.
- Un clip ouvert a un carré « ⛶ » **plein écran** (`components/FullscreenBox`, plein écran du navigateur, fond noir, un clip en portrait prend toute la hauteur), l'interrupteur **Non sauvegardé / Sauvegardé** (« Non sauvegardé » libère le clip, `PUT /clips/<id>/saved` : il quitte la liste et on y revient) et le bouton Partager (`ShareButton`, voir `../CameraCard/CLAUDE.md`).
- Les clips d'une caméra en portrait s'affichent **droits** : la vignette garde la taille des autres (la vidéo tourne et tient dans sa hauteur), le lecteur (`components/PortraitClip`) tourne la vidéo (`RotatedMedia`) et met ses commandes dedans, en bas, droites.
- En haut de la liste (pas pendant la lecture d'un clip), `GuestLink` : un **lien « Page invité ↗ »** (nouvel onglet) vers la page invité, clé comprise, et un bouton **« Copier le lien »** (`navigator.clipboard`, « Lien copié ✓ » un instant). Le lien vient de `GET /guest` (clé, port et adresse publique éventuelle) : l'adresse publique `GUEST_PUBLIC_URL` si l'API la connaît, sinon le même hôte que la WebApp avec le port de la page invité. Rien ne s'affiche sans `GUEST_KEY` côté API (`../../../../guest/CLAUDE.md`).
