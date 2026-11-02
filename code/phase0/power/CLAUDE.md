# power – la puissance du processeur

Un script shell et son unité systemd, **sur l'hôte** (le mini PC, pas dans Docker) : le compteur d'énergie du processeur (`/sys/class/powercap/intel-rapl:0/energy_uj`, RAPL) n'est lisible que par root, et on ne l'ouvre pas aux conteneurs.

- `house-power.sh` : toutes les 5 s, écrit `data/power/cpu.json` (`{"watts": 6.1, "at": <secondes>}`), la puissance moyenne du processeur (le « package » : cœurs, GPU intégré, pas le SSD ni la RAM). Écriture atomique, fichier lisible par tous.
- `house-power.service` : l'unité qui le lance au démarrage (`Restart=always`).
- House Sync (`sync/src/power.ts`) lit ce fichier (monté en lecture seule sur `/power`) et le montre dans l'onglet « Énergie ».

Installation (une fois, sur le mini PC) : `sudo install -m 755 power/house-power.sh /usr/local/bin/house-power`, `sudo cp power/house-power.service /etc/systemd/system/`, `sudo systemctl enable --now house-power`.
