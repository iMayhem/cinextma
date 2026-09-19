#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-streamaggregator.in}"
BASE_DIR="${BASE_DIR:-/srv/streamaggregator}"
CINEXTMA_REPO="${CINEXTMA_REPO:-https://github.com/iMayhem/cinextma.git}"
SCRAPERS_REPO="${SCRAPERS_REPO:-https://github.com/iMayhem/scrapers-api.git}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/vps-setup.sh"
  exit 1
fi

echo "==> Installing base packages"
apt-get update
apt-get install -y ca-certificates curl git gnupg openssl debian-keyring debian-archive-keyring apt-transport-https

if [ ! -f /swapfile ] && [ "$(free -m | awk '/Mem:/{print $2}')" -lt 3500 ]; then
  echo "==> Adding 2G swap (helps the Gradle plugin build)"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if systemctl list-unit-files --type=service 2>/dev/null | grep -q '^nginx\.service'; then
  echo "==> Stopping nginx to free ports 80/443"
  systemctl disable --now nginx || true
fi

echo "==> Cloning repositories into $BASE_DIR"
mkdir -p "$BASE_DIR"
if [ ! -d "$BASE_DIR/cinextma/.git" ]; then
  git clone "$CINEXTMA_REPO" "$BASE_DIR/cinextma"
else
  git -C "$BASE_DIR/cinextma" pull --ff-only || true
fi
if [ ! -d "$BASE_DIR/scrapers-api/.git" ]; then
  git clone "$SCRAPERS_REPO" "$BASE_DIR/scrapers-api"
else
  git -C "$BASE_DIR/scrapers-api" pull --ff-only || true
fi

cd "$BASE_DIR/cinextma"

if [ ! -f .env ]; then
  touch .env
fi
if ! grep -q '^JWT_SECRET=' .env; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
fi
if ! grep -q '^TOKEN_SECRET=' .env; then
  echo "TOKEN_SECRET=$(openssl rand -hex 32)" >> .env
fi

echo "==> Building images (the scraper API build can take several minutes)"
docker compose build

echo "==> Starting containers"
docker compose up -d

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

sed "s/streamaggregator\.in/$DOMAIN/g" deploy/Caddyfile > /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy

echo
echo "Done."
echo "Site:    https://$DOMAIN"
echo "Logs:    docker compose -f $BASE_DIR/cinextma/docker-compose.yml logs -f"
echo "Restart: docker compose -f $BASE_DIR/cinextma/docker-compose.yml restart"
