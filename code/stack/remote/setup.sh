#!/bin/bash
# Prépare le mini PC pour une session Claude Code permanente, sans pouvoir supprimer les données.
# Usage : sudo ./setup.sh <propriétaire> <dossier de la pile>
#   ex. : sudo ./setup.sh mathieu /home/mathieu/house/code/phase0
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "À lancer avec sudo." >&2; exit 1; }
OWNER="${1:?utilisateur propriétaire de la pile}"
STACK_DIR="$(readlink -f "${2:?dossier de la pile}")"
HERE="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_USER=claude

[ -f "$STACK_DIR/docker-compose.yml" ] || { echo "Pas de docker-compose.yml dans $STACK_DIR" >&2; exit 1; }
command -v setfacl >/dev/null || apt-get install -y acl
command -v tmux >/dev/null || apt-get install -y tmux

# 1. Un utilisateur dédié : ni sudo général, ni groupe docker (le socket Docker donne un accès root).
id "$CLAUDE_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$CLAUDE_USER"
gpasswd -d "$CLAUDE_USER" docker >/dev/null 2>&1 || true
gpasswd -d "$CLAUDE_USER" sudo >/dev/null 2>&1 || true

# 2. La seule porte vers Docker : quelques sous-commandes, quatre services.
echo "STACK_DIR=$STACK_DIR" > /etc/house-docker-ctl.conf
cat > /usr/local/bin/house-docker-ctl <<'EOF'
#!/bin/bash
set -euo pipefail
. /etc/house-docker-ctl.conf
cd "$STACK_DIR"
SERVICES=" go2rtc motion sync api "
check() { [[ "$SERVICES" == *" ${1:-} "* ]] || { echo "Service inconnu : ${1:-}. Permis :$SERVICES" >&2; exit 2; }; }
case "${1:-}" in
  ps)      exec docker compose ps ;;
  logs)    check "${2:-}"; n="${3:-100}"; [[ "$n" =~ ^[0-9]{1,4}$ ]] || exit 2
           exec docker compose logs --no-color --tail "$n" "$2" ;;
  restart) check "${2:-}"; exec docker compose restart "$2" ;;
  build)   check "${2:-}"; exec docker compose up -d --build --no-deps "$2" ;;
  *)       echo "Usage : house-docker-ctl ps | logs <service> [lignes] | restart <service> | build <service>" >&2; exit 2 ;;
esac
EOF
chmod 755 /usr/local/bin/house-docker-ctl
echo "$CLAUDE_USER ALL=(root) NOPASSWD: /usr/local/bin/house-docker-ctl" > /etc/sudoers.d/house-claude
chmod 440 /etc/sudoers.d/house-claude
visudo -cf /etc/sudoers.d/house-claude

# 3. Droits : lecture du dépôt, écriture seulement dans le code. Jamais dans data/, ni .env, ni compose, ni .git.
setfacl -m "u:$CLAUDE_USER:x" "$(dirname "$STACK_DIR")" "$(dirname "$(dirname "$STACK_DIR")")" "$(dirname "$(dirname "$(dirname "$STACK_DIR")")")" 2>/dev/null || true
setfacl -m "u:$CLAUDE_USER:rx" "$STACK_DIR"
setfacl -R -m "u:$CLAUDE_USER:rX" "$STACK_DIR/data" "$STACK_DIR/docker-compose.yml" "$STACK_DIR/power" "$STACK_DIR/certs"
for d in api web sync motion go2rtc ui; do
  [ -d "$STACK_DIR/$d" ] || continue
  setfacl -R -m "u:$CLAUDE_USER:rwX" "$STACK_DIR/$d"
  setfacl -R -d -m "u:$CLAUDE_USER:rwX" "$STACK_DIR/$d"
done
setfacl -x "u:$CLAUDE_USER" "$STACK_DIR/.env" 2>/dev/null || true
chmod 600 "$STACK_DIR/.env"
chown "$OWNER" "$STACK_DIR/.env"
# Le certificat privé de la CA : pas même en lecture.
setfacl -x "u:$CLAUDE_USER" "$STACK_DIR"/data/certs/*-key.pem 2>/dev/null || true
if TOP="$(git -C "$STACK_DIR" rev-parse --show-toplevel 2>/dev/null)"; then
  sudo -u "$CLAUDE_USER" git config --global --add safe.directory "$TOP"
fi

# 4. Les règles de Claude.
install -d -o "$CLAUDE_USER" -g "$CLAUDE_USER" "/home/$CLAUDE_USER/.claude"
install -m 644 -o "$CLAUDE_USER" -g "$CLAUDE_USER" "$HERE/CLAUDE.md" "/home/$CLAUDE_USER/.claude/CLAUDE.md"
install -m 644 -o "$CLAUDE_USER" -g "$CLAUDE_USER" "$HERE/settings.json" "/home/$CLAUDE_USER/.claude/settings.json"

# 4b. Une copie du dépôt en lecture seule, pour que Claude lise les CLAUDE.md (git pull par le propriétaire).
REPO_DIR="$(getent passwd "$OWNER" | cut -d: -f6)/house-repo"
if [ ! -d "$REPO_DIR" ]; then
  sudo -u "$OWNER" git clone -q "${REPO_URL:-https://github.com/mathieujullien77190/house.git}" "$REPO_DIR"
fi
setfacl -R -m "u:$CLAUDE_USER:rX" "$REPO_DIR"

# 5. Le démarrage automatique (non activé : se connecter d'abord, voir ci-dessous).
cat > /etc/systemd/system/house-claude.service <<EOF
[Unit]
Description=Session Claude Code permanente (Remote Control)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=forking
User=$CLAUDE_USER
WorkingDirectory=$STACK_DIR
ExecStart=/usr/bin/tmux new-session -d -s claude -c $STACK_DIR 'bash -lc "claude --remote-control Maison --permission-mode default"'
ExecStop=/usr/bin/tmux kill-session -t claude
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

cat <<EOF

Fait. Il reste, une seule fois :
  1. sudo -iu $CLAUDE_USER   puis installer Claude Code, lancer 'claude', '/login', accepter la confiance du dossier $STACK_DIR
  2. sudo systemctl enable --now house-claude    (démarrage automatique)
  3. sudo -u $CLAUDE_USER tmux attach -t claude  (voir la session)
Test des protections : sudo -u $CLAUDE_USER touch $STACK_DIR/data/clips/x  doit répondre 'Permission denied'.
EOF
