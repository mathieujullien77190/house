# PlugPanel – l'onglet Prise

La prise connectée (`/plug`, 5 s). Ce que fait l'API et le minuteur de la prise : `../../../../api/src/routes/CLAUDE.md`.

## Bloc

- Même forme qu'une clim (`AcPanel`) : nom et **interrupteur On / Off** (`role="switch"`) dans l'en-tête, puis tableau d'état et réglages.
- Tableau : État, S'éteint dans, Allumée depuis, Éteinte au mouvement. Les durées défilent chaque seconde entre deux lectures.
- Interrupteur sur On : éteint. Sur Off : allume pour la durée du curseur (**jamais d'allumage sans fin**).
- Curseur de 1 à 30 min (5 au départ) et bouton « Allumer pendant N min ».
- Case « Éteindre si le détecteur intérieur voit un mouvement » : **cochée au départ**, envoyée avec le minuteur (`offOnMotion`).
- Messages : `PLUG_HOST` manquant (503), prise muette.

## Chauffage automatique

`HeatingSection`, rendu par `HeatingPanel` de `@house/ui`, sous la commande manuelle, sans titre ni journal (le journal est dans l'onglet Base de House Sync, table `heating_log`).

- Règle de l'API (`GET` et `PUT /plug/heating`) : case « Activer la règle », **Température (°C)**, **Durée (min)**, **Délai avant réactivation (min)**, « Enregistrer » (erreur de l'API affichée telle quelle).
- Le premier mouvement du détecteur intérieur éteint la prise **et désactive la règle** (à réactiver avec « Activer la règle »).
- Relu à l'ouverture et après chaque commande ; champs remplis à la première lecture seulement. Rien sans pont Hue (503).
- Valeurs par défaut : `../../../../api/src/routes/CLAUDE.md`.
- **Constantes de l'API, pas des champs** : tarif 0,1589 EUR creux / 0,2142 EUR plein, heures creuses 23:10 à 07:10, puissance 2000 W.

## Sur la carte de Home

Un clic sur le chauffage montre tout ce bloc (`embedded` : sans titre ni marge du haut).
