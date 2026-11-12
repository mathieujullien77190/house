#!/usr/bin/env bash
# Déploie la pile sur le mini PC : vérifications locales, envoi des fichiers, reconstruction des conteneurs, contrôle.
#
#   ./deploy.sh                 les services changés depuis le dernier déploiement (auto)
#   ./deploy.sh api sync        ces services seulement
#   ./deploy.sh --all           tous les services
#   ./deploy.sh --dry-run       dit ce qui serait fait, sans rien envoyer
#   ./deploy.sh site            le site de la racine du dépôt, compilé ici puis servi sur le port 8082
#   ./deploy.sh --skip-checks   sans typecheck / lint / tests locaux
#
# Ne touche jamais à `data/` ni à `.env` (ni à `docker-compose.yml`, sauf avec --compose).
set -euo pipefail

HOST="${DEPLOY_HOST:-mathieu@192.168.1.139}"
REMOTE_DIR="${DEPLOY_DIR:-house/code/phase0}" # relatif au home ; ancien nom jamais renommé (voir CLAUDE.md)
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

DRY=0 ALL=0 SKIP=0 COMPOSE=0
REQUESTED=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --all) ALL=1 ;;
    --skip-checks) SKIP=1 ;;
    --compose) COMPOSE=1 ;;
    -h | --help) sed -n '2,11p' "$0"; exit 0 ;;
    api | web | sync | motion | go2rtc | guest | ui | site) REQUESTED+=("$arg") ;;
    *) echo "argument inconnu : $arg" >&2; exit 2 ;;
  esac
done

# Ordre de déploiement : sync avant api (l'API interroge des colonnes de la base que sync migre).
ORDER=(sync motion go2rtc api site guest)

# Le site (React, Vite) est à la racine du dépôt, hors de code/stack : ses fichiers font changer `site`.
SITE_ROOT_PATHS=(src public index.html package.json package-lock.json vite.config.ts tsconfig.json)

# Quel dossier fait changer quel service : `web` et `ui` sont compilés dans les images api (et sync pour ui).
services_for_path() {
  case "$1" in
    stack/sync/* | sync/*) echo sync ;;
    stack/motion/* | motion/*) echo motion ;;
    stack/go2rtc/* | go2rtc/*) echo go2rtc ;;
    stack/guest/* | guest/*) echo guest ;;
    stack/site/*  | site/*) echo site ;;
    stack/api/* | api/* | stack/web/* | web/*) echo api ;;
    stack/ui/* | ui/*) echo "api sync" ;;
  esac
}

ssh_run() { ssh -o BatchMode=yes "$HOST" "$@"; }

# 1. Quels services ?
declare -A WANT=()
if [ "$ALL" = 1 ]; then
  for s in "${ORDER[@]}"; do WANT[$s]=1; done
elif [ "${#REQUESTED[@]}" -gt 0 ]; then
  for s in "${REQUESTED[@]}"; do
    case "$s" in
      web) WANT[api]=1 ;;
      ui) WANT[api]=1; WANT[sync]=1 ;;
      *) WANT[$s]=1 ;;
    esac
  done
else
  LAST="$(ssh_run "cat ~/$REMOTE_DIR/.deployed-commit 2>/dev/null" || true)"
  if [ -n "$LAST" ] && git cat-file -e "$LAST^{commit}" 2>/dev/null; then
    CHANGED="$(git diff --name-only "$LAST" -- . ; git ls-files --others --exclude-standard -- .)"
    ROOT_CHANGED="$(cd ../.. && git diff --name-only "$LAST" -- "${SITE_ROOT_PATHS[@]}" ; git ls-files --others --exclude-standard -- "${SITE_ROOT_PATHS[@]}")"
  else
    echo "Pas de dernier déploiement connu : tous les services."
    CHANGED="$(git ls-files -- . ; git ls-files --others --exclude-standard -- .)"
    ROOT_CHANGED=x
  fi
  [ -n "${ROOT_CHANGED//[[:space:]]/}" ] && WANT[site]=1
  # `git diff --name-only` donne des chemins relatifs à la racine du dépôt (code/stack/...).
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    for s in $(services_for_path "${f#code/}"); do WANT[$s]=1; done
    case "$f" in */docker-compose.yml) [ "$COMPOSE" = 1 ] || echo "(docker-compose.yml a changé : relance avec --compose pour l'envoyer)" ;; esac
  done <<<"$CHANGED"
fi

TODO=()
for s in "${ORDER[@]}"; do [ -n "${WANT[$s]:-}" ] && TODO+=("$s"); done
if [ "${#TODO[@]}" -eq 0 ]; then echo "Rien à déployer."; exit 0; fi
echo "Services : ${TODO[*]}"

# 2. Vérifications locales (mêmes commandes que dans CLAUDE.md).
check() { # check <dossier> <script>...  ("test" devient "test:coverage" quand il existe : le seuil de 100 % bloque)
  local dir="$1"; shift
  for script in "$@"; do
    if [ "$script" = test ] && node -e "process.exit(require('./$dir/package.json').scripts?.['test:coverage'] ? 0 : 1)"; then script=test:coverage; fi
    if node -e "process.exit(require('./$dir/package.json').scripts?.['$script'] ? 0 : 1)"; then
      echo "→ $dir : npm run $script"
      (cd "$dir" && npm run --silent "$script")
    fi
  done
}
if [ "$SKIP" = 0 ]; then
  for s in "${TODO[@]}"; do
    case "$s" in
      api) check api typecheck lint test; check web typecheck lint test build; check ui typecheck lint test ;;
      sync) check sync typecheck lint test; check sync/web typecheck lint test build; check ui typecheck lint test ;;
      motion) check motion typecheck lint test ;;
      guest) check guest typecheck lint test ;;
      site) check ../.. typecheck lint ;;
    esac
  done
fi

if [ "$DRY" = 1 ]; then echo "--dry-run : rien envoyé."; exit 0; fi

# 3a. Le site : compilé ici (Storybook de @house/ui puis Vite, à la racine, base `/`), copié dans site/www avant l'envoi.
if printf '%s
' "${TODO[@]}" | grep -qx site; then
  echo "→ compilation du site (racine du dépôt)"
  (cd ../.. && npm run --silent build:storybook && npm run --silent build)
  rm -rf site/www && cp -r ../../dist site/www
fi

# 3. Envoi : seulement les dossiers des services (jamais data/, .env, node_modules, builds).
DIRS=()
for s in "${TODO[@]}"; do
  case "$s" in
    api) DIRS+=(api web ui) ;;
    sync) DIRS+=(sync ui) ;;
    site) DIRS+=(site) ;;
    *) DIRS+=("$s") ;;
  esac
done
[ "$COMPOSE" = 1 ] && DIRS+=(docker-compose.yml)
UNIQ=($(printf '%s\n' "${DIRS[@]}" | sort -u))
echo "→ envoi : ${UNIQ[*]}"
tar czf - --exclude=node_modules --exclude=dist --exclude=coverage --exclude=storybook-static --exclude=data --exclude=.env "${UNIQ[@]}" |
  ssh_run "cd ~/$REMOTE_DIR && tar xzf -"

# 4. Reconstruction, dans l'ordre. `--no-deps` : ne pas redémarrer les services voisins (motion perd son segment en cours).
for s in "${TODO[@]}"; do
  echo "→ docker compose : $s"
  if [ "$s" = go2rtc ]; then
    ssh_run "cd ~/$REMOTE_DIR && docker compose up -d --no-deps go2rtc && docker compose restart go2rtc"
  else
    ssh_run "cd ~/$REMOTE_DIR && docker compose up -d --build --no-deps $s"
  fi
done

# 5. Contrôle : chaque service tourne et répond (healthcheck du compose, attendu jusqu'à 90 s), pas d'erreur au démarrage.
sleep 5
FAIL=0
for s in "${TODO[@]}"; do
  for _ in $(seq 1 18); do
    STATE="$(ssh_run "cd ~/$REMOTE_DIR && docker compose ps --format '{{.State}} {{.Health}}' $s" | head -1)"
    case "$STATE" in *starting*) sleep 5 ;; *) break ;; esac
  done
  echo "  $s : $STATE"
  case "$STATE" in running*unhealthy* | running*starting* | exited* | restarting* | "") FAIL=1 ;; esac
  ssh_run "cd ~/$REMOTE_DIR && docker compose logs --since 30s $s 2>&1 | grep -iE 'error|fatal|crash|cannot|no such' | head -5" || true
done
if [ "$FAIL" = 1 ]; then echo "ÉCHEC : voir 'docker compose logs <service>' sur le mini PC." >&2; exit 1; fi

# 6. Mémoriser le commit déployé (le prochain « auto » ne compare que depuis là).
ssh_run "echo $(git rev-parse HEAD) > ~/$REMOTE_DIR/.deployed-commit"
echo "Déployé : $(git rev-parse --short HEAD)"
