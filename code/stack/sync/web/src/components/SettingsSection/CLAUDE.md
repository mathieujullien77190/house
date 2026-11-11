# SettingsSection – l'onglet Réglages

**Tous** les réglages de House Sync, en **blocs repliables** : un bloc **Général** (réglages communs), **un bloc par caméra** (titre = son nom) qui réunit **tous ses réglages**, puis la **Page invité**. Chaque clic ou curseur relâché est enregistré tout de suite, un échec s'affiche. Ce que fait chaque réglage côté service : `../../../../src/CLAUDE.md`.

- **Général (toutes les caméras)** : la durée de garde (clips non sauvegardés, images, journal des lampes, événements sans clip, fusions : un ménage par jour vers 4 h) (liste de 7, 15, 30, 60, 90 ou 180 jours, `GET`/`PUT /api/retention`, `RETENTION_OPTIONS`).
- **Un bloc par caméra**, trois rangées :
  - **Enregistrement : clips et images**
    - **Toujours / La nuit / Jamais** (hors des clips gardés la détection de la caméra est éteinte) ;
    - le rythme des images de la frise : **5, 10, 15, 30 s, 1, 2 ou 5 min** ;
    - **Yeux qui brillent** (Off / On, `eyes_mode`, comme le mode pluie) : allumé, de 30 min après le coucher à 30 min avant le lever, chaque image prise est examinée, et un ou deux points blancs saturés (les yeux d'un animal vus par la caméra infrarouge) lancent un événement de mouvement de la caméra, avec son clip. Une ligne d'aide dit les bornes. Pendant ce temps la WebApp montre une icône œil sur la caméra ;
    - le **Mode pluie** (OFF / ON) : allumé, quand la météo dit pluie, forte pluie ou brouillard, les clips s’arrêtent (la détection est coupée ; **la recherche des yeux qui brillent continue et ses clips sont gardés**) et une image est gardée toutes les 5 s ; quand il ne pleut plus, les réglages ci-dessus reviennent (ils ne sont jamais modifiés). Sous le choix, un texte dit « Pluie en ce moment : mode pluie actif » quand il s'applique (`rain_now`) ;
    - l'**Orientation** (Paysage / Portrait) à côté de « Clips vidéo » : elle s'applique aux nouveaux événements (les anciens gardent la leur).
  - **Détection du mouvement** : un curseur « Sensibilité du mouvement » de 1 à 5 (sert quand une caméra rate un passage) et un curseur « Durée minimale d'un mouvement » de 0 (« aucune ») à 30 s (`motion_min_seconds`, 1 s au départ) : un mouvement plus court n'ouvre aucun événement.
  - **Direct dans la WebApp** : quatre curseurs, « Direct 4K » et « Direct léger », chacun pour le PC (1024 px et plus) et pour le téléphone, de 1 à 25 images par seconde, envoyés au relâchement seulement si la valeur a changé.
- **Page invité** : un seul curseur, 1 à 25 images par seconde, pour les vignettes et la caméra agrandie en 4K, PC et téléphone confondus (`GET`/`PUT /api/guest`), et le bouton « En ligne / Coupée » (l'interrupteur de la page). Sous le curseur, `GuestLink` (`../GuestLink/CLAUDE.md`) : le lien « Page invité ↗ » (nouvel onglet) et le bouton « Copier le lien », quand l'API de House Sync donne `guest_link` (`GUEST_KEY` dans le `.env`) ; rien sans lui.

- **Le petit nuage du mode pluie** à côté du nom de chaque caméra (titre de son bloc) : 🌧️ il pleut et le mode s'applique, ☔ pluie forte ; rien si le mode est éteint ou s'il ne pleut pas.
