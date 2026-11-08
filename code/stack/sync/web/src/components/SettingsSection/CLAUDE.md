# SettingsSection – l'onglet Réglages

**Tous** les réglages de House Sync, rangés **par sujet** : un bloc repliable chacun, une ligne par caméra quand le réglage est par caméra, chaque clic ou curseur relâché est enregistré tout de suite, un échec s'affiche. Ce que fait chaque réglage côté service : `../../../../src/CLAUDE.md`.

- **Enregistrement : clips et images**
  - la durée de garde des clips non sauvegardés (liste de 7, 15, 30, 60, 90 ou 180 jours, `GET`/`PUT /api/retention`, `RETENTION_OPTIONS`) ;
  - par caméra, **Toujours / La nuit / Jamais** (hors des clips gardés la détection de la caméra est éteinte) ;
  - par caméra, le rythme des images de la frise : **30 s, 1, 2 ou 5 min** ;
  - par caméra, l'**Orientation** (Paysage / Portrait) à côté de « Clips vidéo » : elle s'applique aux nouveaux événements (les anciens gardent la leur).
- **Détection du mouvement** : un curseur « Sensibilité du mouvement » de 1 à 5 par caméra ; sert quand une caméra rate un passage.
- **Direct dans la WebApp** : quatre curseurs par caméra, « Direct 4K » et « Direct léger », chacun pour le PC (1024 px et plus) et pour le téléphone, de 1 à 25 images par seconde, envoyés au relâchement seulement si la valeur a changé.
- **Page invité** : un seul curseur, 1 à 25 images par seconde, pour les vignettes et la caméra agrandie en 4K, PC et téléphone confondus (`GET`/`PUT /api/guest`), et le bouton « En ligne / Coupée » (l'interrupteur de la page).
