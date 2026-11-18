# SettingsSection – l'onglet Réglages

**Tous** les réglages de House Sync, en blocs repliables : **Général**, **un bloc par caméra** (titre = son nom, **fermé à l'ouverture de la page**, un clic l'ouvre), **Page invité**, **Volets à servos**. Chaque clic ou curseur relâché est enregistré tout de suite ; un échec s'affiche. Effet côté service : `../../../../src/CLAUDE.md`.

## Général

- Durée de garde : 7, 15, 30, 60, 90 ou 180 jours (`RETENTION_OPTIONS`, `GET`/`PUT /api/retention`).
- **Images par seconde des pages invité** : un curseur de 1 à 25 (`GET`/`PUT /api/guest`, `guest_fps`), le même pour toutes les caméras, pour la page invité publique **et** pour la page du réseau « Chez Matou » (mêmes flux go2rtc `<caméra>_guest_*`).

## Un bloc par caméra

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

## Volets à servos

- Bloc repliable : adresse de l'ESP32 des servos, puis trois sous-blocs repliables (Salon, PC, Porte) avec, pour Monter / Descendre / Stop, canal, départ, arrivée, vitesse, attente (`GET`/`PUT /api/servos`). Détail : `../ServosSettings/CLAUDE.md`.

## Page invité

- Bouton « En ligne / Coupée » (interrupteur de la page).
- Dessous, `GuestLink` (`../GuestLink/CLAUDE.md`), seulement si `guest_link` n'est pas null.
