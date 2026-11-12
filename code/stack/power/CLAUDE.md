# power – ce que l'hôte donne à House Sync

Deux scripts et leurs unités systemd, **sur l'hôte** (pas dans Docker). Ils écrivent dans `data/power`, que House Sync lit en lecture seule (monté sur `/power`). Chemins dépendants de `~/house/code/phase0` : `../CLAUDE.md`.

## `house-power.sh` (`house-power.service`, `Restart=always`)

- Toutes les 5 s, puissance moyenne du « package » CPU (cœurs + GPU intégré, pas SSD ni RAM) par le compteur RAPL `/sys/class/powercap/intel-rapl:0/energy_uj`, lisible par root seulement (pas ouvert aux conteneurs).
- Écrit `cpu.json` : `{"watts": 6.1, "at": <secondes>}`, de façon atomique.
- Lu par `sync/src/power.ts` (onglet « Machine », Consommation).

## `house-docker.py` (`house-docker.service`, après `docker.service`)

- Toutes les 10 s, l'état des conteneurs. Tourne en root : il parle au socket Docker, que House Sync ne voit jamais.
- Écrit `docker.json` : image, commande, état, ressources, ports, réseaux, volumes, processus.
- **Jamais de secrets** : seulement les noms des variables d'environnement (pas les valeurs) et le nom des programmes (pas leurs arguments : une adresse RTSP porte un mot de passe).
- Lu par `sync/src/docker.ts` (onglet « Docker »).

## Installation (une fois, sur le mini PC)

```
sudo install -m 755 power/house-power.sh /usr/local/bin/house-power
sudo cp power/house-power.service /etc/systemd/system/
sudo systemctl enable --now house-power
sudo install -m 755 power/house-docker.py /usr/local/bin/house-docker
sudo cp power/house-docker.service /etc/systemd/system/
sudo systemctl enable --now house-docker
```
