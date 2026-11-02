#!/bin/sh
# Lit le compteur d'énergie du processeur (RAPL) toutes les 5 s et écrit la puissance moyenne en watts dans
# $OUT (JSON), pour House Sync. Tourne en root (le compteur n'est lisible que par root) ; le fichier, lui, est
# lisible par tous.
DOMAIN=/sys/class/powercap/intel-rapl:0
OUT=${OUT:-/home/mathieu/house/code/stack/data/power/cpu.json}
INTERVAL=5
MAX=$(cat "$DOMAIN/max_energy_range_uj")
mkdir -p "$(dirname "$OUT")"
previous=$(cat "$DOMAIN/energy_uj")
while sleep "$INTERVAL"; do
  now=$(cat "$DOMAIN/energy_uj")
  delta=$((now - previous))
  [ "$delta" -lt 0 ] && delta=$((delta + MAX))
  previous=$now
  watts=$(awk -v d="$delta" -v s="$INTERVAL" 'BEGIN { printf "%.2f", d / 1000000 / s }')
  printf '{"watts":%s,"at":%s}\n' "$watts" "$(date +%s)" > "$OUT.tmp" && chmod 644 "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
done
