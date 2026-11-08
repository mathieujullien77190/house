#!/usr/bin/env bash
# Attend le résultat du workflow « Stack » de GitHub pour un commit et l'affiche (jobs en échec et leur message).
#
#   ./ci-status.sh            le commit HEAD
#   ./ci-status.sh <sha>      un autre commit
#
# Sortie : 0 si le workflow est vert, 1 s'il a échoué, 2 s'il n'a pas démarré ou si l'attente (10 min) est dépassée.
# Sans jeton GitHub (60 requêtes par heure) : on interroge toutes les 30 s au plus. Le dépôt vient de `git remote origin`.
set -euo pipefail
SHA="$(git rev-parse "${1:-HEAD}")"
REPO="$(git remote get-url origin | sed -E 's#^(git@github.com:|https://github.com/)##; s#\.git$##')"
API="https://api.github.com/repos/$REPO"

json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);$1})"; }

# Le workflow ne se déclenche que si le commit touche code/stack/ ; sinon il n'y a rien à attendre.
RUN=""
for _ in $(seq 1 20); do
  RUN="$(curl -s "$API/actions/runs?head_sha=$SHA&per_page=20" | json "
    const r=(j.workflow_runs||[]).find(r=>r.name==='Stack');
    console.log(r?r.id+' '+r.status+' '+(r.conclusion||''):'')")"
  [ -n "$RUN" ] && [ "$(echo "$RUN" | cut -d' ' -f2)" = completed ] && break
  if [ -z "$RUN" ] && [ "$_" -ge 4 ]; then echo "Aucun run « Stack » pour ${SHA:0:7} (le commit ne touche pas code/stack/ ?)."; exit 2; fi
  sleep 30
done
[ -n "$RUN" ] && [ "$(echo "$RUN" | cut -d' ' -f2)" = completed ] || { echo "Run « Stack » pas fini pour ${SHA:0:7} après 10 min."; exit 2; }

ID="$(echo "$RUN" | cut -d' ' -f1)"
CONCLUSION="$(echo "$RUN" | cut -d' ' -f3)"
echo "Stack ${SHA:0:7} : $CONCLUSION"
[ "$CONCLUSION" = success ] && exit 0

# Les jobs en échec, et ce que GitHub en dit (les journaux demandent un jeton ; les annotations non).
curl -s "$API/actions/runs/$ID/jobs" | json "
  for (const x of j.jobs) if (x.conclusion==='failure') console.log(x.id+' '+x.name+' | étape : '+((x.steps||[]).find(s=>s.conclusion==='failure')||{name:'?'}).name.split('\n')[0])" |
  while read -r JOB REST; do
    echo "  échec : $REST"
    curl -s "$API/check-runs/$JOB/annotations" | json "
      for (const a of j) if (a.annotation_level==='failure') console.log('    '+a.message.slice(0,200))"
  done
echo "Détail : https://github.com/$REPO/actions/runs/$ID"
exit 1
