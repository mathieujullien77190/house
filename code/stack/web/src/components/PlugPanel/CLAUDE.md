# PlugPanel – l'onglet Prise

La prise connectée (API `/plug`, relue toutes les 5 s ; ce que fait l'API et le minuteur de la prise elle-même : `../../../../api/src/routes/CLAUDE.md`).

- **Tout en haut, sous le titre « Prise connectée »** : le tableau d'état (État, S'éteint dans, Allumée depuis, Éteinte au mouvement, Signal WiFi, Modèle). « Allumée depuis » est en minutes et secondes (« 3 min 25 s »), qui défilent chaque seconde. Dessous, le nom de la prise.
- Un bouton **Éteindre**, visible seulement quand elle est allumée : plus d'allumage sans fin.
- Un **curseur de 1 à 30 minutes, par pas de 1** (5 au départ) et un bouton **« Allumer pendant N min »** (la prise s'éteint ensuite toute seule). « S'éteint dans 12 min 34 s » est un **décompte en minutes et secondes qui défile chaque seconde** entre deux lectures de la prise.
- Le chauffage automatique éteint aussi la prise au premier mouvement du détecteur intérieur **et désactive la règle** (à réactiver avec « Activer la règle »).
- Une case « Éteindre si le détecteur intérieur voit un mouvement » (**cochée au départ**, envoyée avec le minuteur : `offOnMotion`, ligne « Éteinte au mouvement » tant qu'elle est armée).
- **Chauffage automatique** (`HeatingSection`, sous la commande manuelle, **sans titre** : la prise est branchée sur le chauffage ; rendu par `HeatingPanel` de `@house/ui`) : la règle de l'API (`GET` et `PUT /plug/heating`) : case « Activer la règle », champs **Température (°C)**, **Durée (min)**, **Délai avant réactivation (min)**, enregistrés par « Enregistrer » (l'erreur de l'API s'affiche telle quelle). **Ni titre, ni message d'état, ni journal ici** : le journal est dans l'onglet Base de House Sync (table `heating_log`). Relu à l'ouverture et après chaque commande de la prise ; les champs ne sont remplis qu'à la première lecture. Rien n'est affiché sans pont Hue (503). Valeurs par défaut : `../../../../api/src/routes/CLAUDE.md`. Le **tarif** (0,1589 € creux, 0,2142 € plein), les **heures creuses** (23:10 → 07:10) et la **puissance** (2000 W) sont des constantes de l'API, pas des champs.
- Un message dit si `PLUG_HOST` manque (503) ou si la prise ne répond pas.
