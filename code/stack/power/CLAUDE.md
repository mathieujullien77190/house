# power – ce que l'hôte donne à House Sync

Deux scripts et leurs unités systemd, **sur l'hôte** (le mini PC, pas dans Docker) : le compteur d'énergie du processeur (`/sys/class/powercap/intel-rapl:0/energy_uj`, RAPL) n'est lisible que par root, et on ne l'ouvre pas aux conteneurs.

- `house-power.sh` : toutes les 5 s, écrit `data/power/cpu.json` (`{"watts": 6.1, "at": <secondes>}`), la puissance moyenne du processeur (le « package » : cœurs, GPU intégré, pas le SSD ni la RAM). Écriture atomique, fichier lisible par tous.
- `house-power.service` : l'unité qui le lance au démarrage (`Restart=always`).
- House Sync (`sync/src/power.ts`) lit ce fichier (monté en lecture seule sur `/power`) et le montre dans l'onglet « Machine » (section Consommation).

- `house-docker.py` : toutes les 10 s, écrit `data/power/docker.json` : pour chaque conteneur, l'image, la commande, l'état, les ressources (`docker stats`), les ports, réseaux, volumes, **les noms** des variables d'environnement (jamais les valeurs) et les processus (**le nom** du programme, jamais ses arguments : une adresse RTSP y porte un mot de passe). Il tourne en root parce qu'il parle au socket Docker, que House Sync ne voit jamais.
- `house-docker.service` : son unité (après `docker.service`).
- House Sync (`sync/src/docker.ts`) lit ce fichier et le montre dans l'onglet « Docker ».

Installation (une fois, sur le mini PC) : `sudo install -m 755 power/house-power.sh /usr/local/bin/house-power`, `sudo cp power/house-power.service /etc/systemd/system/`, `sudo systemctl enable --now house-power`. Même chose pour Docker : `sudo install -m 755 power/house-docker.py /usr/local/bin/house-docker`, `sudo cp power/house-docker.service /etc/systemd/system/`, `sudo systemctl enable --now house-docker`.
