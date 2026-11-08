# guest – la page invité

Script TypeScript exécuté par Node 24 (`src/index.ts`), sans dépendance : **le direct des caméras pour quelqu'un à qui on donne un lien**, rien d'autre. Pas de clip, pas de réglage, pas de commande, ni titre ni nom de caméra. Ce que la page montre et son comportement (vignettes, 4K, zoom, caméra posée de côté) : `src/CLAUDE.md`. Le reste de la sécurité de la pile : `../docs/securite.md` (cette page en est la seule exception pensée pour l'extérieur).

## Éteinte par défaut, coupée d'un geste

Un conteneur à part, avec le profil Compose `guest` : `docker compose up -d` ne la lance jamais.

```
docker compose up -d --build guest    # allumer (GUEST_KEY dans .env)
docker compose stop guest             # éteindre complètement ; reste éteinte après un redémarrage de la machine
docker compose logs -f guest          # qui ouvre et ferme quel flux (adresse, navigateur)
```

Rien d'autre ne dépend d'elle. Elle n'a ni disque, ni base, ni accès à l'API, à House Sync ou à l'enregistreur : son réseau (`guest_net`) ne contient que `go2rtc`. Le conteneur est en lecture seule, sans capacités, 128 Mo. Aucune redirection de port sur la box : l'accès public passe par Tailscale Funnel (plus bas).

**Coupée par un bouton (sans Docker).** Le bouton **« En ligne / Coupée »** (House Sync, onglet Réglages, section Page invité) écrit `data/guest/state.json` (`{"enabled": false}`) ; la page, qui relit ce fichier toutes les 2 s en lecture seule (`GUEST_STATE_FILE`, `src/state.ts`), **ferme alors son port** et coupe les flux en cours : plus rien n'y répond, d'où que l'on vienne. « En ligne » le rouvre. Le conteneur reste lancé (House Sync n'a jamais le socket Docker). Sans fichier, la page est en ligne (on l'a lancée exprès) ; un fichier abîmé ou illisible la coupe (dans le doute, fermée). Le dossier `data/guest` doit exister (créé par l'utilisateur de la machine, sinon Docker le crée pour root et House Sync n'y écrit pas). L'arrêt complet reste `docker compose stop guest`.

## Accès

- `GUEST_KEY` (`.env`, 16 caractères au moins, sans elle le service ne démarre pas). Le lien est `https://<adresse>:8090/?k=<GUEST_KEY>` et **la clé reste toujours dans l'adresse** : la page l'écrit dans l'adresse de chaque flux qu'elle ouvre, rien n'est gardé (ni cookie, ni session : `src/auth.ts` ne fait que comparer). Changer la clé invalide tous les liens. (Ce n'est pas la clé `API_KEY` de la pile.)
- Sans la clé, ou avec une fausse, tout répond **404 avec une page « Not Found » banale** (`src/notFound.ts`, rien de la page invité n'y apparaît : ni `/`, ni `/stream` ne se laissent deviner) ; 10 essais ratés par adresse en 15 min, puis 429 (`src/attempts.ts`).
- HTTPS avec le certificat de la maison (`data/certs`, monté en lecture seule) ; sans lui, HTTP. Ce certificat ne couvre pas un nom public, d'où Funnel.

## Ce qu'elle sert

- `GET /?k=<clé>` : la page (`src/page.ts`), qui se recharge une minute avant la fin des flux (`<meta refresh>` : l'adresse, clé comprise, est rechargée).
- `GET /stream?camera=<nom>&k=<clé>` (vignette) et `GET /stream?camera=<nom>&quality=4k&k=<clé>` (caméra en grand) : le MJPEG des flux go2rtc `<nom>_guest_sub_mjpeg` (léger) et `<nom>_guest_main_mjpeg` (4K), pour les seules caméras de `GUEST_CAMERAS` (`voliere-exterieur,voliere-interieur` par défaut). **Leur cadence est un réglage de House Sync** (« Page invité · images par seconde » : un seul nombre pour les vignettes et le 4K, PC et téléphone confondus, 2 par défaut ; House Sync le pousse à go2rtc, voir `../sync/src/CLAUDE.md`). Le 4K coûte cher : environ 420 Ko par image (mesuré), soit environ 7 Mb/s de débit montant par invité qui regarde une caméra en grand à 2 images/s (les vignettes en ajoutent 0,35 chacune), et un décodage 4K par caméra agrandie (partagé entre les invités).
- **Limites** : `GUEST_MAX_VIEWERS` personnes à la fois (5 : chacune ouvre un flux léger par caméra et un 4K, au-delà 503) et `GUEST_MAX_MINUTES` minutes par flux (30). Chaque ouverture et fermeture est dans les logs (adresse, navigateur) : c'est la réponse à « qui regarde ». Pas de nom : une seule clé.
- Seul `GET` passe (405 sinon). En-têtes : `Cache-Control: no-store`, `nosniff`, `noindex`, pas de référent, CSP stricte (`default-src 'none'`, un seul script autorisé, celui de la page, par son empreinte `script-src 'sha256-…'`).

## Ouverte à internet : Tailscale Funnel

La page est publique à **`https://<machine>.<réseau>.ts.net/`** (+ `?k=<clé>`) par **Tailscale Funnel** : le mini PC (machine nommée dans le compte Tailscale de l'utilisateur, installé depuis le dépôt officiel, `--accept-dns=false --accept-routes=false`) ouvre une connexion vers Tailscale, qui relaie internet vers `https+insecure://127.0.0.1:8090` (le certificat de la maison n'est pas vérifié sur ce trajet local) et présente un **vrai certificat HTTPS** : **rien n'est redirigé sur la Freebox**, la DMZ reste décochée. Commandes (sur le mini PC) : `sudo tailscale funnel status`, couper : `sudo tailscale funnel --https=443 off`, remettre : `sudo tailscale funnel --bg --https=443 https+insecure://127.0.0.1:8090`. La configuration survit à un redémarrage. `GUEST_PUBLIC_URL` (`.env`, lu par l'API) fait pointer le lien de la Home sur cette adresse.

Le nom de la machine et du réseau est inscrit dans les journaux publics des certificats HTTPS : **les robots l'ont trouvé en quelques secondes** et frappent la page sans clé (404, notés au plus une fois par minute et par adresse dans `guest_visits`, `kind = refused`). Le nom gratuit `…freeboxos.fr` de la Freebox a été créé puis **supprimé** : il ne pouvait pas servir (la Freebox refuse les ports externes sous 16384, donc pas de certificat possible pour lui).

**L'adresse du visiteur.** En direct (maison, VPN) l'adresse est celle de la connexion. Derrière Funnel la connexion vient du mini PC lui-même et l'adresse du visiteur est dans `X-Forwarded-For` : `src/client.ts` ne croit cet en-tête **que si la connexion vient du mini PC** (jamais d'un visiteur direct) et prend la **dernière** adresse de la liste. Elle sert au journal des visites et au compteur de clés fausses (sans elle, tous les visiteurs de Funnel auraient la même adresse et un seul mauvais essai bloquerait tout le monde).

## Le journal des visites

La page note **qui vient** : une ligne JSON par ouverture de la page, par flux de caméra regardé (écrite à sa fermeture : début, durée, octets envoyés, léger ou 4K) et par tentative refusée (pas de clé, mauvaise clé : une par minute et par adresse au plus). Chaque ligne a l'adresse, d'où elle vient (**maison, VPN, mini PC, internet**), le navigateur et le système en clair (« Chrome 130 · Windows »), le User-Agent, la langue, l'hôte demandé et l'état de la clé (**avec clé**, **sans clé** ou **clé fausse** : la clé elle-même n'est jamais écrite) et l'adresse demandée sans la clé. Fichier `data/guest-visits/visits.jsonl` (`GUEST_VISITS_FILE`, `src/visits.ts`, le seul dossier où la page écrit ; passé en `.old` au-delà de 5 Mo) que **House Sync importe** dans la table `guest_visits` (onglet Base). Le dossier doit exister (créé par l'utilisateur de la machine). Derrière la Freebox l'adresse est celle du visiteur ; vue du mini PC lui-même (localhost, Docker) elle est en `172.x`, origine « mini PC ».

## Commandes

`npm run typecheck && npm run lint && npm test` dans ce dossier. Déploiement : `../docs/deploiement.md`.
