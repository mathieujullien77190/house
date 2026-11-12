# SettingsSection – l'onglet Réglages

**Tous** les réglages de House Sync, en blocs repliables : **Général**, **un bloc par caméra** (titre = son nom), **Page invité**. Chaque clic ou curseur relâché est enregistré tout de suite ; un échec s'affiche. Effet côté service : `../../../../src/CLAUDE.md`.

## Général

- Durée de garde : 7, 15, 30, 60, 90 ou 180 jours (`RETENTION_OPTIONS`, `GET`/`PUT /api/retention`).

## Un bloc par caméra

**Enregistrement : clips et images**

- Clips : Toujours / La nuit / Jamais (hors des clips gardés, la détection est éteinte).
- Rythme des images : 5, 10, 15, 30 s, 1, 2 ou 5 min.
- Yeux qui brillent (Off / On, `eyes_mode`) : une ligne d'aide dit les bornes de nuit ; la WebApp montre une icône œil pendant la recherche.
- Mode pluie (OFF / ON) : texte « Pluie en ce moment : mode pluie actif » quand il s'applique (`rain_now`). Il coupe les clips mais **pas la recherche des yeux**.
- Orientation (Paysage / Portrait) : s'applique aux nouveaux événements.

**Détection du mouvement**

- Sensibilité de 1 à 5.
- Durée minimale d'un mouvement : 0 (« aucune ») à 30 s, 1 s au départ.

**Direct dans la WebApp**

- Quatre curseurs de 1 à 25 images/s : 4K et léger, chacun pour PC (1024 px et plus) et téléphone.
- Envoyés au relâchement, seulement si la valeur a changé.

**Pictogramme du titre** : 🌧️ pluie et mode actif, ☔ pluie forte ; rien sinon.

## Page invité

- Un curseur de 1 à 25 images/s (vignettes et 4K, PC et téléphone) ; `GET`/`PUT /api/guest`.
- Bouton « En ligne / Coupée » (interrupteur de la page).
- Dessous, `GuestLink` (`../GuestLink/CLAUDE.md`), seulement si `guest_link` n'est pas null.
