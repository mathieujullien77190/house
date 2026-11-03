# remote – une session Claude Code permanente sur le mini PC

Une session Claude Code tourne en permanence sur le mini PC (sous tmux, lancée par systemd). On la retrouve depuis le téléphone (appli Claude, onglet **Code**, session « Maison », ou claude.ai/code) pour lire les logs, modifier le code et redéployer. **Elle ne peut supprimer aucune donnée.**

## Comment ça marche

```
Téléphone (appli Claude)  ──HTTPS──▶  Anthropic  ◀──HTTPS sortant──  mini PC : tmux > claude --remote-control Maison
```

- Le mini PC fait seulement des connexions **sortantes** (443). Aucun port ouvert, le VPN WireGuard n'est pas utilisé pour ça.
- Il faut un abonnement Pro, Max, Team ou Enterprise et une connexion complète (`/login`). Une clé API ne marche pas.
- Le téléphone voit les messages, valide ou refuse les demandes de permission. Le mode « bypass » n'y est pas proposé.

## Ce que Claude peut et ne peut pas faire

L'utilisateur Linux `claude` n'est ni dans le groupe `sudo` ni dans `docker`.

| | |
|---|---|
| Lire | tout le dossier de la pile, `data/` compris (sauf `.env` et la clé privée de la CA) |
| Écrire | le code : `api`, `web`, `sync`, `motion`, `go2rtc`, `ui` |
| Docker | seulement `sudo house-docker-ctl ps \| logs <svc> [n] \| restart <svc> \| build <svc>` (`go2rtc`, `motion`, `sync`, `api`) |
| Jamais | écrire dans `data/`, toucher `.env`, `docker-compose.yml`, `power/`, `.git`, le pare-feu, redémarrer la machine, `rm`, `docker compose down` |

Trois couches, de la plus solide à la plus faible :
1. **Droits Linux (ACL)** : supprimer un fichier demande d'écrire dans son dossier, ce que `claude` ne peut pas faire dans `data/`.
2. **`settings.json`** (règles `deny`, copiées dans `~claude/.claude/`) : bloque `rm`, `docker`, `sqlite3`, etc., dans tous les modes.
3. **`claude-rules.md`** (copié dans `~claude/.claude/CLAUDE.md`) : les règles expliquées. Une consigne, pas une protection.

Limite connue : `docker-compose.yml` et `.env` sont modifiables seulement par le propriétaire. Un compose modifié pourrait monter `/` dans un conteneur et contourner tout le reste, d'où cette règle.

## Mise en place (une fois)

Sur le PC de développement, envoyer le dossier :

```
scp -r code/stack/remote mathieu@192.168.1.139:~/remote-claude
```

Sur le mini PC (SSH, compte du propriétaire) :

```
cd ~/remote-claude
sed -i 's/\r$//' setup.sh                 # si le fichier vient de Windows
sudo bash setup.sh mathieu /home/mathieu/house/code/phase0
```

Le script (`setup.sh <propriétaire> <dossier de la pile>`) :
1. installe `acl` et `tmux`, crée l'utilisateur `claude` ;
2. installe `/usr/local/bin/house-docker-ctl` et `/etc/sudoers.d/house-claude` (seule commande `sudo` permise) ;
3. pose les droits (voir le tableau) ;
4. copie `claude-rules.md` (sous le nom `CLAUDE.md`) et `settings.json` dans `/home/claude/.claude/` ;
5. clone le dépôt en lecture seule dans `~/house-repo` (pour que Claude lise les `CLAUDE.md`) ;
6. écrit l'unité `house-claude.service` (**non activée**).

Puis, toujours sur le mini PC :

```
sudo -iu claude
curl -fsSL https://claude.ai/install.sh | bash
cd /home/mathieu/house/code/phase0
claude                  # /login (lien à ouvrir sur le téléphone), accepter la confiance du dossier, /exit
exit
sudo systemctl enable --now house-claude
```

Vérifier :
- `sudo -u claude tmux attach -t claude` : la session affiche « /remote-control is active » (`Ctrl+b` puis `d` pour sortir).
- Téléphone : onglet Code, session **Maison** (point vert).
- Protections : `sudo -u claude touch <pile>/data/clips/x` doit répondre « Permission denied ».
- Docker : `sudo -u claude docker ps` doit être refusé, `sudo -u claude sudo -n house-docker-ctl ps` doit marcher.

## Au quotidien

- **Mettre à jour la documentation vue par Claude** : `cd ~/house-repo && git pull` (compte `mathieu`).
- **Changer les règles** : modifier `claude-rules.md` ou `settings.json` ici, les recopier dans `/home/claude/.claude/`, puis `sudo systemctl restart house-claude` (le lien de la session change, le nom « Maison » reste).
- **Changer le nom** : l'option `--remote-control Maison` dans `/etc/systemd/system/house-claude.service` (et dans `setup.sh`).
- **Journal** : `sudo journalctl -u house-claude -n 30`.

## Après une coupure de courant

Le service est activé, donc la session revient au démarrage (système, réseau, Docker, puis tmux et Claude ; la connexion est gardée dans `/home/claude`). Si Claude se ferme, systemd le relance au bout de 30 s. Le lien de la session change, la retrouver par son nom.

À régler dans le **BIOS** : « Restore on AC Power Loss » sur **Power On**, sinon le mini PC reste éteint après une coupure. Réglage non vérifié sur le K1.

## À savoir

- Le service (`tmux` + `claude --remote-control`) a été vérifié au démarrage et au redémarrage manuel du service, pas après une vraie coupure de courant.
- Le mode serveur `claude remote-control` s'arrête après environ 10 minutes sans réseau ; le mode choisi ici (`claude --remote-control`, interactif) se reconnecte seul.
- La session reste sur le compte claude.ai connecté : mot de passe fort et double authentification, car ce compte donne accès à la machine.
- Sauvegarder `data/` hors du mini PC : aucune règle ne protège d'une panne de disque.
