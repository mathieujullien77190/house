# stack – la pile en service sur le mini PC

Des conteneurs Docker (`docker-compose.yml`) sur le mini PC de la maison (ACEMAGIC K1, Ubuntu Server), avec deux Reolink RLC-810A branchées au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du mini PC, puis s'arrête | – |
| `go2rtc` | une seule connexion RTSP vers chaque caméra, qu'il partage (RTSP interne, MJPEG, image à l'instant) | interne |
| `motion` | l'enregistreur : segments du flux principal (6 h), détection de mouvement sur le flux léger, clips MP4, petite API pour House Sync | interne |
| `sync` | House Sync : copie les clips et les images sur le disque backup (selon les réglages de sa page : clips toujours, la nuit ou jamais, rythme des images, cadence des directs), écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |
| `guest` | la page invité : le direct léger des caméras, pour quelqu'un à qui on donne un lien ; **éteinte par défaut** (profil `guest`) | 8090 |

**Deux caméras, une seule unité.** Un seul `go2rtc` et un seul `motion` s'occupent des deux Reolink (`voliere-exterieur` et `voliere-interieur`) : `CAMERAS: voliere-exterieur,voliere-interieur` dans le compose, les flux de chacune (six par caméra : voir `go2rtc/CLAUDE.md`) déclarés dans `go2rtc/go2rtc.yaml`, l'adresse et le compte de `voliere-interieur` dans `.env` (`CAMERA2_IP`, `CAMERA2_USER`, `CAMERA2_PASSWORD`). Les segments et les clips des deux caméras sont dans les mêmes dossiers (`data/recordings/<caméra>`, `data/clips`). House Sync sait en revanche interroger **plusieurs** enregistreurs (`RECORDER_URLS`) et l'API relayer plusieurs go2rtc (`GO2RTC_URLS`) : une unité `go2rtc` + `motion` par machine, pour le jour où il y aura d'autres machines.

Sur l'hôte (hors Docker), `power/` : deux services systemd (la puissance du processeur par RAPL, l'état des conteneurs Docker) qui écrivent un fichier que House Sync lit.

**Accès distant.** Les applications ne sont jamais ouvertes sur internet. Hors de la maison, un téléphone ouvre un tunnel **WireGuard** vers la Freebox (serveur VPN intégré, un utilisateur WireGuard par appareil, un seul port UDP ouvert sur la box) : il reçoit une adresse du réseau `192.168.27.0/24` et voit le mini PC à **`192.168.27.139`** (`https://192.168.27.139:8080` pour la WebApp, `:8081` pour House Sync ; cette adresse est dans `CERT_HOSTS`). Le pare-feu du mini PC n'autorise que le réseau de la maison et ce réseau VPN.
**Sur le mini PC, ce dossier s'appelle `~/house/code/phase0`** (ancien nom, jamais renommé : les chemins des deux services de `power/` et la session Claude de `remote/` en dépendent). Ce n'est pas un dépôt git : on y envoie les fichiers à la main. Une copie en lecture seule du dépôt, pour la documentation, est dans `~/house-repo`.

Un CLAUDE.md par dossier : `certs/`, `power/`, `go2rtc/`, `motion/`, `sync/`, `sync/web/`, `api/`, `web/`, `guest/`, `ui/` (le paquet `@house/ui` : les composants dumb des deux apps, avec un Storybook). `docs/` : les notes détaillées et datées (`docs/hue.md`). `remote/` : la session Claude du mini PC (son `README.md` ; `claude-rules.md` est le fichier de règles qu'elle charge, volontairement pas nommé `CLAUDE.md` pour ne pas s'appliquer à qui édite ce dépôt).

**Quand la doc et le code se contredisent, le code fait foi** : corrige alors le CLAUDE.md du dossier au lieu de le suivre. Toute modification de comportement met à jour le CLAUDE.md du dossier concerné, et un fichier ajouté a son explication dans la vue « Code » du site.

## Règles

- **Seul House Sync écrit** dans la base (SQLite `data/backup/events.db`, clips, images). L'enregistreur écrit ses propres segments et clips (`data/recordings`, `data/clips`). L'API n'écrit jamais la base ni le disque backup : elle les lit, relaie go2rtc (pour le direct), garde les positions des ampoules, la liste des clips sauvegardés (`data/house`, la liste est lue par House Sync, qui efface les clips non sauvegardés après la durée de garde, 15 jours par défaut), les zones de surveillance du mouvement (`zones.json`, que House Sync donne à l'enregistreur) et le plan de la maison (`plan.json`, que House Sync importe dans la table `plan`) et commande le switch (PoE), le pont Hue et la prise. L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Une seule clé** : `API_KEY` (en-tête `X-House-Key`) pour l'API et la page de House Sync. La saisie de la clé ouvre une **session par cookie** (`GET /auth` pour l'API, `POST /login` pour House Sync) : un jeton signé avec la clé (HMAC) et daté, valable **30 jours**, HttpOnly et Secure, rien en mémoire (il survit à un redémarrage). Le navigateur ne garde jamais la clé : une page rouverte se reconnecte avec le cookie, sans qu'on la ressaisisse. Changer `API_KEY` invalide tous les cookies ; « Oublier la clé » ou « Quitter » efface celui du navigateur. Le cookie sert aussi à ce qu'une balise `<img>` ou `<video>` charge sans en-tête, dont le direct.
- **Le direct** : House API relaie go2rtc (`go2rtc:1984`, jamais publié) : `/stream` (MJPEG, un seul ffmpeg tant qu'un onglet regarde) et `/frame`. Le flux go2rtc `<flux>_mjpeg` est déclaré dans `go2rtc/go2rtc.yaml`. Pour cela l'API rejoint le réseau `sync_net`.
- **La page invité** (`guest/`, port 8090) est le seul service pensé pour être vu hors du VPN, et seulement si on la lance (`docker compose up -d --build guest`) et, pour internet, qu'on l'ouvre par **Tailscale Funnel** (`https://<machine>.<réseau>.ts.net/`, rien n'est redirigé sur la box) : le direct léger en lecture seule, derrière un lien secret, sur un réseau Docker à elle (avec go2rtc seulement). `docker compose stop guest` la coupe complètement, et le bouton « Coupée » de House Sync (onglet Réglages) ferme son port sans Docker ; voir `guest/CLAUDE.md`. Le pare-feu du bloc `DOCKER-USER` ne vise que 8080 et 8081 : il laisse passer 8090.
- **Rien d'autre n'est publié** que l'API (8080) et la page de House Sync (8081) : go2rtc et l'API de l'enregistreur n'ont pas de mot de passe et ne sont joignables que par les autres conteneurs.
- **Pare-feu du mini PC** (`ufw`, entrant refusé par défaut) : SSH (22), 8080 et 8081 ne sont ouverts qu'au réseau de la maison (`192.168.1.0/24`, et en IPv6 son préfixe local et les adresses `fe80::/10`) et au VPN WireGuard de la Freebox (`192.168.27.0/24`, l'adresse que reçoit un téléphone connecté). Docker contourne `ufw` pour les ports qu'il publie en IPv4 : un bloc `DOCKER-USER` en fin de `/etc/ufw/after.rules` refuse 8080 et 8081 à tout ce qui n'est ni du réseau de la maison ni de son VPN. Rien n'est redirigé sur la Freebox ; pour joindre les apps de l'extérieur, passer par le VPN WireGuard de la Freebox (un utilisateur de type WireGuard par appareil) ou Tailscale, jamais par une redirection de ports.
- **SSH par clé seulement** (depuis le 7 novembre 2026) : `/etc/ssh/sshd_config.d/00-house-hardening.conf` (`PasswordAuthentication no`, il passe avant `50-cloud-init.conf` qui autorisait les mots de passe) ; la seule clé autorisée est celle de `mathieu`. Pour revenir en arrière, supprimer ce fichier puis `sudo systemctl reload ssh`. Pour changer ce réglage sans risque : programmer d'abord un retour en arrière automatique (`systemd-run --on-active=300`), tester une nouvelle connexion, puis l'annuler.
- **HTTPS** avec le certificat de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil). Pour un téléphone, l'API propose le certificat **public** au téléchargement : `https://<adresse>:8080/rootCA.crt` (jamais la clé `rootCA-key.pem`). La WebApp marche sur n'importe quel hôte du certificat (IP du PC ou `localhost`).
- **Mobile et bureau** : les deux apps (WebApp et page de House Sync) ont une mise en page **mobile de 360 à 1024 px** (une colonne, boutons et onglets plus hauts pour le doigt) et une mise en page **bureau dès 1024 px** (le point de rupture `lg:` de Tailwind, jamais `sm:` ni `md:`). Aucun défilement horizontal de la page à 360 px : un contenu large (tableau, code, frise) défile dans son propre bloc.
- **Secrets** dans `.env` (ignoré par git), modèle dans `.env.example`. Jamais de mot de passe dans le code, la doc ou les commits : go2rtc lit celui de la caméra dans `REOLINK_PASSWORD`.
- **Données** dans `data/` (ignoré) : `data/recordings`, `data/clips`, `data/backup`, `data/certs`, `data/power`, `data/house`, `data/guest` (l'interrupteur de la page invité, écrit par House Sync) et `data/guest-visits` (le journal des visites, écrit par la page invité, importé par House Sync) ; ces deux dossiers sont à créer par l'utilisateur de la machine avant le premier lancement. Elles sont **irremplaçables** : ne jamais supprimer, déplacer ni écraser un fichier de `data/` (ni `events.db`) sans une copie faite avant et l'accord de l'utilisateur.
- Les fichiers de ce dossier apparaissent dans la vue « Code » du site : chaque fichier ajouté a une explication dans `src/components/CodeBrowser/constants.ts`.

## Lumières (pont Hue)

House API pilote le pont Philips Hue (`/hue`, `HUE_BRIDGE_IP` et `HUE_APP_KEY` dans `.env`) et l'onglet **Lumière** de la WebApp l'affiche. **Les règles d'automatisation vivent dans le pont**, pas dans House, et leur état change : le détail (règles, heures de lever et de coucher du soleil écrites en dur, sauvegardes) est dans `docs/hue.md`, à lire avant de toucher à une lumière ou à une règle. **House Sync tient un journal** de tout ce qui change sur le pont (lampes, scènes, interrupteurs, détecteurs, reconnexions radio) avec une origine devinée, dans la table `hue_events` : pour savoir pourquoi une lampe s'est allumée, voir la section « Le journal des événements » du même fichier.

## Session Claude permanente (`remote/`)

Une session Claude Code tourne en permanence sur le mini PC (utilisateur `claude`, tmux, service systemd `house-claude`) et se pilote depuis l'appli Claude du téléphone (session « Maison »). Elle lit le code et les logs, modifie `api`, `web`, `sync`, `motion`, `go2rtc`, `ui` et redéploie par `sudo house-docker-ctl` ; elle **ne peut rien supprimer** (pas d'écriture dans `data/`, ni dans `.env`, `docker-compose.yml`, `power/`, `.git` ; pas d'accès direct à Docker). Mise en place, droits et dépannage : `remote/README.md`. Une copie du dépôt en lecture seule est dans `~/house-repo` du mini PC (`git pull` pour la mettre à jour).

## Commandes

```
docker compose up -d --build          # tout (re)construire et démarrer
docker compose up -d --build api      # après un changement dans api/ ou web/
docker compose up -d --build --no-deps sync   # après un changement dans sync/ ou sync/web/ (sans --no-deps, motion redémarre aussi)
docker compose up -d --build motion   # après un changement dans motion/
docker compose restart go2rtc         # après un changement de go2rtc/go2rtc.yaml
docker compose logs -f motion         # les débuts et fins de mouvement, les clips
docker compose logs -f sync           # ce que fait House Sync
```

Vérifications : `npm run typecheck && npm run lint` dans `api/` et `sync/`, `npm run typecheck && npm run lint && npm test` dans `motion/`, `npm run typecheck && npm run lint && npm run build` dans `web/` et `sync/web/`, `npm run typecheck && npm run lint && npm run build-storybook` dans `ui/`. Les deux apps ont le même style : même `PageHeader`, mêmes `Tabs`, mêmes composants de `@house/ui`.

## Réglages

Toutes les variables sont dans `docker-compose.yml` (valeurs par défaut commentées) et `.env.example` (secrets). Les seuils de détection : `motion/CLAUDE.md` ; les images, les clips et la cadence du direct : `sync/CLAUDE.md`.
