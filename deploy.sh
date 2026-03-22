#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CTIS OKX — Deploy script for Ubuntu home server
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_DIR/.env"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Check / install Docker ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Docker not found — installing..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    warn "Docker installed. You may need to log out and back in for group changes."
    warn "Then re-run: bash deploy.sh"
    exit 0
fi

if ! docker compose version &>/dev/null; then
    error "docker compose plugin not found. Update Docker: https://docs.docker.com/engine/install/ubuntu/"
fi

info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
info "Docker Compose $(docker compose version --short)"

# ── 2. Detect local IP ────────────────────────────────────────────────────────
LOCAL_IP=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
info "Server local IP: $LOCAL_IP"

# ── 3. Create .env if missing ─────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    warn ".env not found — creating from .env.example"
    cp "$REPO_DIR/.env.example" "$ENV_FILE"

    # Generate a random Django secret key
    SECRET=$(python3 -c "import secrets,string; print(''.join(secrets.choice(string.ascii_letters+string.digits+'!@#%^&*(-_=+)') for _ in range(64)))")
    sed -i "s|change-me-use-a-very-long-random-string-here|$SECRET|g" "$ENV_FILE"

    # Inject local IP into ALLOWED_HOSTS
    sed -i "s|DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1|DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$LOCAL_IP|g" "$ENV_FILE"

    info ".env created. Fill in OKX and Telegram credentials before continuing:"
    echo ""
    echo "  nano $ENV_FILE"
    echo ""
    read -rp "Press ENTER when ready to continue, or Ctrl+C to abort..."
else
    # Ensure local IP is in ALLOWED_HOSTS
    if ! grep -q "$LOCAL_IP" "$ENV_FILE"; then
        warn "Adding $LOCAL_IP to DJANGO_ALLOWED_HOSTS"
        sed -i "s|DJANGO_ALLOWED_HOSTS=\(.*\)|DJANGO_ALLOWED_HOSTS=\1,$LOCAL_IP|g" "$ENV_FILE"
    fi
fi

# ── 4. Build & start ──────────────────────────────────────────────────────────
cd "$REPO_DIR"

info "Pulling base images..."
docker compose pull postgres redis 2>/dev/null || true

info "Building services..."
docker compose build --parallel

info "Starting stack..."
docker compose up -d

# ── 5. Wait for backend ───────────────────────────────────────────────────────
info "Waiting for backend to be ready..."
MAX_WAIT=60
WAITED=0
until docker compose exec -T backend curl -sf http://localhost:8000/api/signals/ &>/dev/null; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
        warn "Backend not responding yet — check logs: make logs"
        break
    fi
done

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  CTIS OKX está corriendo${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
HTTP_PORT=$(grep "^HTTP_PORT=" "$ENV_FILE" | cut -d= -f2)
HTTP_PORT=${HTTP_PORT:-80}
echo ""
echo "  Acceso local:    http://localhost:$HTTP_PORT"
echo "  Acceso en red:   http://$LOCAL_IP:$HTTP_PORT"
echo ""
echo "  Comandos útiles:"
echo "    make logs      — ver logs en tiempo real"
echo "    make status    — estado de los contenedores"
echo "    make restart   — reiniciar stack"
echo "    make down      — apagar todo"
echo ""
