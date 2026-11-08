# power – ce que l'hôte donne à House Sync

Deux scripts et leurs unités systemd, **sur l'hôte** (le mini PC, pas dans Docker), qui écrivent des fichiers dans `data/power` que House Sync lit en lecture seule (monté sur `/power`). Les chemins sur le mini PC dépendent du nom `~/house/code/phase0` : `../CLAUDE.md`.

| Script | Unité | Écrit | Lu par House Sync |
|---|---|---|---|
| `house-power.sh` : toutes les 5 s, la puissance moyenne du processeur (le « package » : cœurs, GPU intégré, pas le SSD ni la RAM), par le compteur RAPL `/sys/class/powercap/intel-rapl:0/energy_uj`, lisible par root seulement (on ne l'ouvre pas aux conteneurs). Écriture atomique, fichier lisible par tous. | `house-power.service` (au démarrage, `Restart=always`) | `cpu.json` : `{"watts": 6.1, "at": <secondes>}` | `sync/src/power.ts` → onglet « Machine », section Consommation |
| `house-docker.py` : toutes les 10 s, l'état des conteneurs. Tourne en root parce qu'il parle au socket Docker, que House Sync ne voit jamais. | `house-docker.service` (après `docker.service`) | `docker.json` : pour chaque conteneur l'image, la commande, l'état, les ressources (`docker stats`), les ports, réseaux, volumes, **les noms** des variables d'environnement (jamais les valeurs) et les processus (**le nom** du programme, jamais ses arguments : une adresse RTSP y porte un mot de passe) | `sync/src/docker.ts` → onglet « Docker » |

Installation (une fois, sur le mini PC) :

```
sudo install -m 755 power/house-power.sh /usr/local/bin/house-power
sudo cp power/house-power.service /etc/systemd/system/
sudo systemctl enable --now house-power
sudo install -m 755 power/house-docker.py /usr/local/bin/house-docker
sudo cp power/house-docker.service /etc/systemd/system/
sudo systemctl enable --now house-docker
```
