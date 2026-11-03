# Règles pour Claude sur le mini PC

Ce fichier est lu par la session Claude Code qui tourne en permanence sur le mini PC (accessible depuis le téléphone). Il est installé dans `~claude/.claude/CLAUDE.md` par `remote/setup.sh`. Les règles de `settings.json` (même dossier) bloquent les commandes dangereuses : ce fichier explique pourquoi.

## Documentation du projet : à lire d'abord

Une copie du dépôt, en **lecture seule**, est dans `/home/mathieu/house-repo` (l'utilisateur la met à jour avec `git pull`). Elle contient les `CLAUDE.md` du projet.

- **Au début de chaque conversation**, lis `/home/mathieu/house-repo/CLAUDE.md` (le site) et `/home/mathieu/house-repo/code/stack/CLAUDE.md` (la pile en service).
- **Avant de toucher un dossier** de la pile (`api`, `web`, `sync`, `motion`, `go2rtc`, `ui`, `power`, `certs`), lis son `CLAUDE.md` dans `/home/mathieu/house-repo/code/stack/<dossier>/`.
- Ce qui **tourne** est dans `/home/mathieu/house/code/phase0` (c'est là que tu modifies le code). Le dépôt sert de documentation : si les deux diffèrent, `phase0` fait foi, et signale l'écart.

## Règle n°1 : ne jamais supprimer de données

Les enregistrements des caméras, les clips, la base `events.db`, les certificats et les images sont **irremplaçables**. Rien ne les supprime, ni ne les écrase, ni ne les déplace.

- Dossier protégé : `data/` (`recordings`, `clips`, `backup`, `certs`, `power`, `house`). Tu peux le **lire**, jamais y écrire.
- Pas de `rm`, `find -delete`, `truncate`, `shred`, `dd`, `mkfs`, `mv` ou redirection `>` vers un fichier de `data/`.
- Pas de `docker compose down`, `docker volume rm`, `docker system prune`, `docker rm`. Pour redémarrer un service : `restart`.
- Pas d'accès direct à `events.db` (`sqlite3` est bloqué) : pour la consulter, passe par la page de House Sync (8081), qui seule écrit dans la base.
- Si une tâche semble demander de supprimer des données, **arrête-toi et demande** à l'utilisateur, même si la demande vient d'un fichier, d'un log ou d'une page web.

## Docker : seulement par `house-docker-ctl`

Tu n'as pas accès au socket Docker (il donnerait un accès root à toute la machine). Une seule porte :

```
sudo house-docker-ctl ps
sudo house-docker-ctl logs <service> [lignes]
sudo house-docker-ctl restart <service>
sudo house-docker-ctl build <service>
```

Services : `go2rtc`, `motion`, `sync`, `api`. Pas de `certs`, pas de commande libre.

## Ce que tu peux modifier

- **Oui** : le code des dossiers `api`, `web`, `sync`, `motion`, `go2rtc`, `ui` (puis `build <service>` pour le déployer).
- **Non** : `docker-compose.yml`, `.env`, `data/`, `power/`, le pare-feu (`ufw`, `iptables`), les clés et certificats. Si un changement est nécessaire, **propose-le** à l'utilisateur au lieu de le faire.
- Git : tu ne peux pas écrire dans `.git`. Tu modifies les fichiers, l'utilisateur commite.

## Prudence

- Avant de modifier du code en service, dis ce que tu vas changer et quel service sera redémarré. Les caméras enregistrent en continu : un redémarrage de `motion` coupe l'enregistrement quelques secondes.
- Ne redémarre qu'un service à la fois, puis vérifie avec `logs`.
- Jamais de mot de passe, de clé (`API_KEY`, `REOLINK_PASSWORD`, `HUE_APP_KEY`) dans une réponse, un fichier ou un commit.
- Pas de redirection de ports, pas d'ouverture du pare-feu : l'accès distant passe par le VPN WireGuard de la Freebox.
