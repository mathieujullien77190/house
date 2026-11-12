# guest – la page invité

Script TypeScript Node 24 (`src/index.ts`), sans dépendance : **le direct des caméras pour quelqu'un à qui on donne un lien**, rien d'autre (ni clip, ni réglage, ni commande, ni nom de caméra). Comportement de la page : `src/CLAUDE.md`. Sécurité de la pile : `../docs/securite.md` (cette page est la seule pensée pour l'extérieur).

## Éteinte par défaut

Conteneur à part, profil Compose `guest` : `docker compose up -d` ne la lance jamais.

```
docker compose up -d --build guest    # allumer (GUEST_KEY dans .env)
docker compose stop guest             # éteindre ; reste éteinte après un redémarrage
docker compose logs -f guest          # qui ouvre et ferme quel flux
```

- Aucun accès à l'API, House Sync ou l'enregistreur : son réseau `guest_net` ne contient que `go2rtc`. Pas de disque ni de base. Conteneur en lecture seule, sans capacités, 128 Mo.
- **Bouton « En ligne / Coupée »** (House Sync, Réglages, Page invité) : écrit `data/guest/state.json` (`{"enabled": false}`). La page relit ce fichier toutes les 2 s (`GUEST_STATE_FILE`, `src/state.ts`) et **ferme son port**. Le conteneur reste lancé (House Sync n'a jamais le socket Docker).
- Sans fichier : en ligne. Fichier abîmé : coupée (dans le doute, fermée).
- `data/guest` doit exister, créé par l'utilisateur (sinon Docker le crée pour root et House Sync n'y écrit pas).

## Accès

- `GUEST_KEY` (`.env`, 16 caractères minimum, sinon le service ne démarre pas). Différente de `API_KEY`.
- Lien : `https://<adresse>:8090/?k=<GUEST_KEY>`. **La clé reste dans l'adresse** : la page l'écrit dans l'adresse de chaque flux, ni cookie ni session (`src/auth.ts` compare seulement). Changer la clé invalide tous les liens.
- Le lien se copie dans House Sync (Réglages) : le conteneur `sync` reçoit `GUEST_KEY` et `GUEST_PUBLIC_URL` du même `.env`.
- Sans clé ou clé fausse : **404 avec une page « Not Found » banale** (`src/notFound.ts`), rien ne se devine. 10 essais ratés par adresse en 15 min, puis 429 (`src/attempts.ts`).
- HTTPS avec le certificat de la maison (`data/certs`, lecture seule), HTTP sans lui. Ce certificat ne couvre pas un nom public, d'où Funnel.

## Ce qu'elle sert

- `GET /?k=<clé>` : la page (`src/page.ts`), rechargée une minute avant la fin des flux (`<meta refresh>`).
- `GET /stream?camera=<nom>&k=<clé>` (vignette) et `…&quality=4k` (grand) : MJPEG des flux go2rtc `<nom>_guest_sub_mjpeg` et `<nom>_guest_main_mjpeg`, pour les seules caméras de `GUEST_CAMERAS` (`voliere-exterieur,voliere-interieur`).
- **Cadence** : réglage de House Sync (« Page invité · images par seconde », un nombre pour tout, 2 par défaut ; voir `../sync/src/CLAUDE.md`).
- **Coût du 4K** : environ 420 Ko par image, soit 7 Mb/s montants par invité à 2 i/s, plus 0,35 Mb/s par vignette ; un décodage 4K par caméra agrandie, partagé.
- **Limites** : `GUEST_MAX_VIEWERS` (5, au-delà 503) et `GUEST_MAX_MINUTES` par flux (30). Ouvertures et fermetures dans les logs : c'est la réponse à « qui regarde ».
- Seul `GET` passe (405 sinon). En-têtes : `no-store`, `nosniff`, `noindex`, pas de référent, CSP stricte (`default-src 'none'`, un seul script, par empreinte `sha256`).

## Internet : Tailscale Funnel

- Adresse publique `https://<machine>.<réseau>.ts.net/?k=<clé>`. Le mini PC ouvre une connexion vers Tailscale, qui relaie vers `https+insecure://127.0.0.1:8090` et présente un vrai certificat. **Rien n'est redirigé sur la Freebox**, DMZ décochée.
- Tailscale installé depuis le dépôt officiel, `--accept-dns=false --accept-routes=false`. La config survit au redémarrage.

```
sudo tailscale funnel status
sudo tailscale funnel --https=443 off                                       # couper
sudo tailscale funnel --bg --https=443 https+insecure://127.0.0.1:8090      # remettre
```

- `GUEST_PUBLIC_URL` (`.env`, lu par l'API) fait pointer le lien de la Home sur cette adresse.
- Le nom de la machine est dans les journaux publics des certificats : **les robots le trouvent en quelques secondes** et frappent sans clé (404, notés au plus une fois par minute et par adresse, `guest_visits.kind = refused`).
- Le nom `…freeboxos.fr` a été supprimé : la Freebox refuse les ports externes sous 16384, donc pas de certificat possible.

**Adresse du visiteur.** Derrière Funnel la connexion vient du mini PC et l'adresse est dans `X-Forwarded-For`. `src/client.ts` ne croit cet en-tête **que si la connexion vient du mini PC** et prend la **dernière** adresse. Sans cela, tous les visiteurs auraient la même adresse et un seul mauvais essai bloquerait tout le monde.

## Journal des visites

- Une ligne JSON par ouverture de la page, par flux regardé (écrite à sa fermeture : début, durée, octets, léger ou 4K) et par tentative refusée (une par minute et par adresse).
- Champs : adresse, origine (**maison, VPN, mini PC, internet**), navigateur et système, User-Agent, langue, hôte, état de la clé (**avec clé, sans clé, clé fausse** ; la clé n'est jamais écrite), adresse demandée sans clé.
- Fichier `data/guest-visits/visits.jsonl` (`GUEST_VISITS_FILE`, `src/visits.ts`, seul dossier où la page écrit ; passé en `.old` au-delà de 5 Mo), importé par House Sync dans `guest_visits` (onglet Base). Le dossier doit exister.
- Vue du mini PC lui-même (localhost, Docker), l'adresse est en `172.x`, origine « mini PC ».

## Commandes

`npm run typecheck && npm run lint && npm test`. Déploiement : `../docs/deploiement.md`.
