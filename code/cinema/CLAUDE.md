# cinema – « Chez Matou » sur la télé, comme un service de vidéo

Application **Android TV native** (Kotlin, Jetpack Compose pour TV, lecteur Media3 ExoPlayer) pour le Freebox Player Pop : **chaque caméra est une série, chaque clip un épisode**. Sans rapport avec la WebApp de la maison (`code/stack/web`) : elle ne montre ni carte ni commandes, seulement les clips. L'ancienne application `code/tv` (fenêtre web de la WebApp) est un essai gardé en réserve.

## Ce qu'elle montre

- **Bannière** : l'affiche de la série « Chez Matou » (titre, et les images du moment des quatre caméras à droite, comme un plateau de tournage), bouton « Dernier épisode » (le clip le plus récent d'une caméra en paysage ; focus au départ).
- **Une rangée par caméra** (la série) : d'abord la carte **« En direct »** (la dernière image gardée, un voyant rouge), puis ses 40 derniers clips : vignette (l'image gardée à l'instant du clip, tournée d'un quart de tour pour une caméra en portrait), date et heure, durée, pastille de genre (mouvement orange, pluie bleu, feuillage vert, yeux violet : les couleurs de la frise de la WebApp), ★ si sauvegardé, note du clip.
- **Sauvegardés** : une rangée à la fin.
- **Avancement** : chaque clip commencé garde sa position (`Config.saveProgress`, toutes les 2 s) : **barre rouge** sur sa carte, **reprise** là où on l'a laissé ; au-delà de 95 % il est fini (« vu », carte atténuée).
- **Lecture** (`Player.kt`) : plein écran, barre d'avancement visible dès le départ ; 4K H.265 (`?q=hd`) quand le clip existe en original, copie légère H.264 si le Player ne sait pas la décoder. **Le direct** (carte « En direct ») est un flux MP4 continu 4K puis léger en repli (`/cinema/live/…`). Retour ou la fin du clip ramène à l'accueil. Une caméra en portrait se lit tournée d'un quart de tour.

## Connexion à la maison

- **API** : `code/stack/api/src/routes/CLAUDE.md` (« Application de télé »), `GET /cinema/library`, `/cinema/clip/<id>`, `/cinema/thumb`. Lecture seule, réseau local, en-tête `X-Lan-Key` égal à `TV_KEY` (`.env` du mini PC), qui ne donne que ces trois routes.
- **Ni l'adresse ni la clé ne sont dans le code** : `adb shell am start -n house.cinema/.MainActivity --es base "https://<ip du mini PC>:8080" --es key "<TV_KEY>"` une fois, le Player les garde (`Config`). Sans elles, l'application le dit à l'écran.
- **Certificat** (`Api.kt`) : HTTPS vérifié contre la CA de la maison seule (`res/raw/house_ca.crt`, valable jusqu'en 2036) ; le nom du certificat ne colle pas avec l'IP, donc seul l'hôte réglé est accepté pour le nom, la chaîne reste toujours vérifiée.

## Construire et installer

Android Studio, son SDK et un JDK 17 sont sur le PC.

```
cd code/cinema
JAVA_HOME="<jdk 17>" ANDROID_HOME="<sdk>" ./gradlew assembleDebug     # app/build/outputs/apk/debug/app-debug.apk
adb connect <ip du Player>:5555                                        # débogage USB du Player activé
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n house.cinema/.MainActivity --es base "https://…:8080" --es key "…"
```

`local.properties` (chemin du SDK, avec des `/`) est local et ignoré par git. Si la télé est en veille (économiseur d'écran), `adb shell input keyevent KEYCODE_WAKEUP` d'abord.

## À faire

- Prochain épisode à la fin d'un clip ; saisons (un jour par saison) sur la page d'une caméra.
- Filtre par genre (pluie, yeux…) ; recherche.
- Tests (aucun pour l'instant).
