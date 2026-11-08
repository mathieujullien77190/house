# PlugPanel – l'onglet Prise

La prise connectée (API `/plug`, relue toutes les 5 s ; ce que fait l'API et le minuteur de la prise elle-même : `../../../../api/src/routes/CLAUDE.md`).

- Le nom de la prise, son état, depuis quand elle est allumée (en minutes et secondes, « 3 min 25 s », qui défilent chaque seconde) et son signal WiFi.
- Un bouton **Éteindre**, visible seulement quand elle est allumée : plus d'allumage sans fin.
- Un **curseur de 1 à 30 minutes, par pas de 1** (5 au départ) et un bouton **« Allumer pendant N min »** (la prise s'éteint ensuite toute seule). « S'éteint dans 12 min 34 s » est un **décompte en minutes et secondes qui défile chaque seconde** entre deux lectures de la prise.
- Une case « Éteindre si le détecteur intérieur voit un mouvement » (**cochée au départ**, envoyée avec le minuteur : `offOnMotion`, ligne « Éteinte au mouvement » tant qu'elle est armée).
- Un message dit si `PLUG_HOST` manque (503) ou si la prise ne répond pas.
