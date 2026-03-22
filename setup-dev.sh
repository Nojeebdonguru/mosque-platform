#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# mosque-platform dev setup
# Run once after cloning: bash infrastructure/scripts/setup-dev.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*"; exit 1; }
header()  { echo -e "\n${BOLD}$*${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

header "🕌  Mosque Platform — Dev Setup"
echo "    Root: $REPO_ROOT"

# ── 1. Check prerequisites ────────────────────────────────────
header "1/6  Checking prerequisites"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    success "$1 found ($(command -v "$1"))"
  else
    error "$1 not found. Please install it: $2"
  fi
}

check_cmd node  "https://nodejs.org"
check_cmd npm   "https://nodejs.org"
check_cmd docker "https://docs.docker.com/get-docker/"
check_cmd python3 "https://python.org"
check_cmd git   "https://git-scm.com"

NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" 2>/dev/null) \
  || error "Node.js 20+ required. Current: $(node -v)"
success "Node.js $(node -v)"

# ── 2. Copy .env files ────────────────────────────────────────
header "2/6  Setting up environment files"

copy_env() {
  local example="$1"
  local target="${example%.example}"
  if [[ -f "$target" ]]; then
    warn "$target already exists — skipping"
  else
    cp "$example" "$target"
    success "Created $target"
  fi
}

copy_env ".env.example"
copy_env "apps/backend/.env.example"
copy_env "apps/frontend/.env.example"
copy_env "apps/scraper/.env.example"

warn "Remember to fill in your OPENAI_API_KEY and secrets in the .env files before running the scraper."

# ── 3. Install Node dependencies ──────────────────────────────
header "3/6  Installing Node.js dependencies"
npm install
success "Node modules installed (workspaces)"

# ── 4. Build shared packages ──────────────────────────────────
header "4/6  Building shared packages"
npx turbo run build --filter=@mosque/shared-types
success "Shared types built"

# ── 5. Python venv for scraper ────────────────────────────────
header "5/6  Setting up Python environment (scraper)"
cd apps/scraper

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
  success "Created virtual environment"
fi

source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet ".[dev]"
playwright install chromium --with-deps 2>/dev/null || \
  warn "Playwright install had issues — run manually: playwright install chromium"
deactivate
success "Python dependencies installed"
cd "$REPO_ROOT"

# ── 6. Start infrastructure ───────────────────────────────────
header "6/6  Starting infrastructure (Docker)"

if docker info &>/dev/null; then
  docker compose -f docker-compose.dev.yml up -d \
    postgres redis elasticsearch kafka zookeeper kafka-ui redis-commander
  info "Waiting for Postgres to be ready..."
  until docker exec mosque_postgres pg_isready -U mosque_user -d mosque_platform &>/dev/null; do
    sleep 1
  done
  success "Postgres ready"
  success "Redis ready"
  success "Kafka UI: http://localhost:8080"
  success "Redis UI: http://localhost:8081"
else
  warn "Docker not running — skipping infrastructure startup."
  warn "Start manually with: npm run docker:dev"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Setup complete! 🎉${NC}"
echo ""
echo "  Start all services:    npm run dev"
echo "  Start frontend only:   npm run dev:frontend"
echo "  Start backend only:    npm run dev:backend"
echo "  Start all via Docker:  npm run docker:dev"
echo ""
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:3001/api/v1"
echo "  API docs:    http://localhost:3001/docs"
echo "  Kafka UI:    http://localhost:8080"
echo "  Redis UI:    http://localhost:8081"
echo ""
