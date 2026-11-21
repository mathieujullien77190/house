# SettingsSection – l'onglet Réglages

**Tous** les réglages de House Sync, en blocs repliables, **tous fermés à l'ouverture de la page** (un clic ouvre) : **un bloc par caméra** (titre = son nom), **Page invité** (interrupteur, lien, et accès du réseau « Chez Matou » dans le même bloc), **Allumage au coucher du soleil**, **Volets**. Chaque clic ou curseur relâché est enregistré tout de suite ; un échec s'affiche. Effet côté service : `../../../../src/CLAUDE.md`.

## Un bloc par caméra

- **Durée de garde** (7, 15, 30, 60, 90 ou 180 jours, `clip_retention_days`) et **images par seconde de la page invité** (curseur de 1 à 25, `guest_fps`, pour la page publique **et** « Chez Matou ») sont **propres à chaque caméra** (`PUT /api/settings`) ; plus de bloc « Général ».
- **Mode vent** (`wind_mode`, OFF par défaut) sous le mode pluie : au-dessus de 20 km/h (`WIND_THRESHOLD_KMH`), pas de clips et une image toutes les 5 s, comme la pluie ; symbole 💨 à côté du nom de la caméra quand il s'applique.
- **Feuillage** : curseur de 0 (coupé) à 60 zones (`foliage_zones`), dans le bloc « Détection du mouvement » : un mouvement qui fait au moins ce nombre de zones sur 30 % de ses images est étiqueté feuillage, vert dans la frise.
- **Recherche des yeux** (`eyes_mode`, OFF par défaut) à côté du mode pluie, sans ligne d'aide (les libellés sont seulement « Mode pluie » et « Mode vent ») : `../../../../src/CLAUDE.md`.

- **Clip sur la caméra liée** (`link_mode`, OFF par défaut) : un mouvement ou des yeux vus par cette caméra font aussi un clip sur les autres de son groupe (`LINKS` du compose : `voliere-toit` et `voliere-interieur`). Chaque caméra du groupe a son interrupteur. Sans effet sur une caméra hors groupe.

**Enregistrement : clips et images**

- Clips : Toujours / La nuit / Jamais (hors des clips gardés, la détection est éteinte).
- Rythme des images : 5, 10, 15, 30 s, 1, 2 ou 5 min.
- Mode pluie (OFF / ON) : texte « Pluie en ce moment : mode pluie actif » quand il s'applique (`rain_now`). Il coupe les clips.
- Orientation (Paysage / Portrait) : s'applique aux nouveaux événements.

**Détection du mouvement**

- Sensibilité de 1 à 5.
- Durée minimale d'un mouvement : 0 (« aucune ») à 30 s, 1 s au départ.

**Direct dans la WebApp**

- Quatre curseurs de 1 à 25 images/s : 4K et léger, chacun pour PC (1024 px et plus) et téléphone.
- Envoyés au relâchement, seulement si la valeur a changé.

**Pictogramme du titre** : 🌧️ pluie et mode actif, ☔ pluie forte ; rien sinon.

## Volets

- Un seul bloc « Volets » : adresse de l'ESP32 des servos, puis trois sous-titres (Salon, PC, Porte), sans sous-blocs repliables, avec, pour Monter / Descendre / Stop, canal, départ, arrivée, vitesse, attente (`GET`/`PUT /api/servos`). Détail : `../ServosSettings/CLAUDE.md`.

## Page invité

- Bouton « En ligne / Coupée » (interrupteur de la page).
- Dessous, `GuestLink` (`../GuestLink/CLAUDE.md`), seulement si `guest_link` n'est pas null.
