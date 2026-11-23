# tv – la maison sur la télé (Freebox Pop, Android TV)

Une petite application Android (Java, sans bibliothèque) : une fenêtre web plein écran sur une page de la maison, pilotée à la télécommande (flèches, OK, Retour). Version 1 : elle affiche la page « Chez Matou » (`code/stack/api/src/routes/CLAUDE.md`, « Page invité du réseau »). Rien de la page n'est dans l'application : on change la page, pas l'application.

## Principes

- **L'adresse n'est jamais dans le code** : elle contient la clé `LAN_KEY`. Elle est donnée une fois par `adb` (`--es url "https://…"`) et gardée sur le Player (`SharedPreferences`). Sans adresse, l'application le dit à l'écran.
- **Certificat** : `res/raw/house_ca.crt` est la CA publique de la maison (`GET /rootCA.crt` de l'API, valable jusqu'en 2036). `MainActivity.signedByHouse` n'accepte une erreur de certificat que pour l'hôte réglé et seulement si le certificat du serveur est signé par cette CA et encore valable ; sinon la page est refusée. Utiliser l'**adresse IP** du mini PC (le nom `.local` ne se résout pas toujours sur Android TV) : le nom du certificat ne colle pas, d'où cette vérification.
- Un lien vers un autre hôte est ignoré. Retour : page précédente, sinon on quitte.

## Construire et installer

Android Studio et son SDK sont déjà sur le PC (JDK 17, plateformes 34 à 36).

```
cd code/tv
JAVA_HOME="<jdk 17>" ANDROID_HOME="<sdk>" ./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
adb connect <ip du Player>:5555                                          # débogage réseau du Player activé
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n house.tv/.MainActivity --es url "https://<ip du mini PC>:8080/chezmatou?k=<clé>"
```

`local.properties` (chemin du SDK, avec des `/`) est local et ignoré par git.

## À faire ensuite

- Une page « télé » dans la WebApp (grandes cases, navigation aux flèches, caméras puis lumières, clim, volets).
- Caméra en grand en **4K** : relais vidéo par l'API (`/lan/hls`, mêmes garde-fous que `/lan`, go2rtc reste interne) et lecteur natif (ExoPlayer) dans l'application. Le MJPEG reste le repli.
