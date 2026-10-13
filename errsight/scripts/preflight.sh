#!/usr/bin/env bash
# ErrSight preflight check. Run from anywhere inside the repo:
#   npm run preflight             quick: tools, files, .env, packages, services
#   npm run preflight -- --full   also runs typecheck + tests + build everywhere
#
# Exit code 0 = ready to run, 1 = something marked with a red X needs fixing.
set -u

cd "$(dirname "$0")/.." || exit 1

FULL=0
[ "${1:-}" = "--full" ] && FULL=1

if [ -t 1 ]; then
  G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; B=$'\e[1m'; D=$'\e[2m'; N=$'\e[0m'
else
  G=; R=; Y=; B=; D=; N=
fi
PASS=0; FAIL=0; WARN=0
ok()      { printf "  %s✓%s %s\n" "$G" "$N" "$1"; PASS=$((PASS+1)); }
bad()     { printf "  %s✗%s %s\n" "$R" "$N" "$1"; FAIL=$((FAIL+1)); }
warn()    { printf "  %s!%s %s\n" "$Y" "$N" "$1"; WARN=$((WARN+1)); }
info()    { printf "  %s·%s %s\n" "$D" "$N" "$1"; }
hint()    { printf "      %s→ %s%s\n" "$Y" "$1" "$N"; }
section() { printf "\n%s%s%s\n" "$B" "$1" "$N"; }

listening() { timeout 2 bash -c "exec 3<>/dev/tcp/127.0.0.1/$1" 2>/dev/null; }

# ---------------------------------------------------------------- 1. Tools
section "1. Tools"
if command -v node >/dev/null 2>&1; then
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit((a>22||(a===22&&b>=12)||(a===20&&b>=19))?0:1)'; then
    ok "Node $(node -v)  (needs 20.19+ or 22.12+)"
  else
    bad "Node $(node -v) is too old (needs 20.19+ or 22.12+)"
    hint "install Node 22 LTS"
  fi
else
  bad "node not found"
fi
command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || bad "npm not found"

if command -v docker >/dev/null 2>&1; then
  ok "docker found"
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose $(docker compose version --short 2>/dev/null)  (note: with a space)"
  else
    warn "'docker compose' (v2 plugin) not available"
    hint "sudo dnf install docker-compose-plugin   (see https://docs.docker.com/engine/install/fedora/)"
  fi
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon reachable"
  else
    warn "Docker daemon not reachable (not running, or no permission)"
    hint "sudo systemctl enable --now docker && sudo usermod -aG docker \$USER   (then log out and back in)"
  fi
else
  warn "docker not found (needed to run Postgres/Redis, unless you run your own)"
  hint "https://docs.docker.com/engine/install/fedora/"
fi

# -------------------------------------------------------- 2. Project files
section "2. Project files"
missing=""
for f in package.json tsconfig.json vitest.config.ts Dockerfile docker-compose.yml .env.example \
         dashboard/package.json dashboard/index.html sdk/javascript/package.json \
         scripts/migrate.ts scripts/seed.ts scripts/test-ingest.ts src/index.ts src/workers/processEvent.ts; do
  [ -f "$f" ] || missing="$missing $f"
done
[ -z "$missing" ] && ok "all required project files present" || bad "missing files:$missing"
n=$(ls migrations/*.sql 2>/dev/null | wc -l)
[ "$n" -ge 6 ] && ok "migrations: $n SQL files" || bad "migrations: found $n, expected 6"

# ------------------------------------------------------------ 3. .env file
section "3. Environment (.env)"
if [ ! -f .env ]; then
  bad ".env not found"
  hint "cp .env.example .env    then set JWT_SECRET (openssl rand -hex 32)"
else
  ok ".env exists"

  badlines=$(grep -nvE '^[[:space:]]*(#.*)?$|^[A-Za-z_][A-Za-z0-9_]*=' .env | head -5)
  if [ -n "$badlines" ]; then
    warn "malformed lines in .env (expected KEY=value, no spaces around '='):"
    echo "$badlines" | sed 's/^/        /'
  fi

  get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'; }

  secret=$(get JWT_SECRET)
  if [ -z "$secret" ]; then
    bad "JWT_SECRET is empty or missing"
    hint "openssl rand -hex 32   and paste the result into .env"
  elif [ "$secret" = "change-this-to-a-long-random-string" ] || [ "$secret" = "dev-secret-change-me" ]; then
    bad "JWT_SECRET is still the placeholder value"
    hint "openssl rand -hex 32   and paste the result into .env"
  elif [ ${#secret} -lt 32 ]; then
    warn "JWT_SECRET is short (${#secret} chars) - use 32 or more"
  else
    ok "JWT_SECRET set (${#secret} chars)"
  fi

  notnum=""
  for k in PORT REDIS_PORT INGEST_RATE_WINDOW_MS INGEST_RATE_MAX AUTH_RATE_WINDOW_MS AUTH_RATE_MAX REFRESH_TOKEN_EXPIRES_DAYS; do
    v=$(get "$k")
    if [ -n "$v" ] && ! [[ "$v" =~ ^[0-9]+$ ]]; then notnum="$notnum $k=$v"; fi
  done
  [ -z "$notnum" ] && ok "numeric settings are valid numbers" || bad "must be whole numbers:$notnum"

  exp=$(get JWT_EXPIRES_IN)
  if [ -n "$exp" ] && ! [[ "$exp" =~ ^[0-9]+[smhd]$ ]]; then bad "JWT_EXPIRES_IN='$exp' invalid (use e.g. 15m, 1h, 7d)"; fi

  dburl=$(get DATABASE_URL)
  if [ -n "$dburl" ] && ! [[ "$dburl" =~ ^postgres(ql)?:// ]]; then bad "DATABASE_URL must start with postgresql://"; fi
  if [[ "$dburl" == *"@postgres:"* ]]; then
    warn "DATABASE_URL host is 'postgres' - that name only resolves inside Docker"
    hint "for running on your machine use localhost:  postgresql://errsight:errsight@localhost:5432/errsight"
  fi
  if [ "$(get REDIS_HOST)" = "redis" ]; then
    warn "REDIS_HOST is 'redis' - that name only resolves inside Docker; use localhost on your machine"
  fi

  absent=""
  for k in $(grep -E '^[A-Z_]+=' .env.example | cut -d= -f1); do
    grep -qE "^$k=" .env || absent="$absent $k"
  done
  [ -z "$absent" ] && ok "every variable from .env.example is present" || warn "not in .env (code defaults apply):$absent"

  if docker compose version >/dev/null 2>&1; then
    if err=$(docker compose config -q 2>&1); then
      ok "docker-compose.yml is valid with this .env"
    else
      bad "docker compose config failed:"
      echo "$err" | head -3 | sed 's/^/        /'
    fi
  fi
fi

# -------------------------------------------------------------- 4. Packages
section "4. Packages"
check_pkg() {
  local dir=$1 label=$2
  if [ ! -d "$dir/node_modules" ]; then
    bad "$label: node_modules missing"
    hint "(cd $dir && npm install)"
    return
  fi
  if (cd "$dir" && npm ls --depth=0 >/dev/null 2>&1); then
    ok "$label: dependencies installed and valid"
  else
    bad "$label: missing/invalid dependencies"
    hint "(cd $dir && npm ls --depth=0)  shows which; then (cd $dir && npm install)"
  fi
  [ -f "$dir/package-lock.json" ] || warn "$label: no package-lock.json (needed for 'npm ci' in Docker builds and CI)"
}
check_pkg . backend
check_pkg dashboard dashboard
check_pkg sdk/javascript sdk

# -------------------------------------------------------------- 5. Services
section "5. Services"
if [ -d node_modules/pg ] && [ -d node_modules/ioredis ] && [ -d node_modules/dotenv ]; then
  pgres=$(node - <<'EOF' 2>&1
require('dotenv').config();
const { Client } = require('pg');
const c = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://errsight:errsight@localhost:5432/errsight',
  connectionTimeoutMillis: 3000,
});
const need = ['users','projects','error_groups','error_events','refresh_tokens','password_reset_tokens'];
c.connect()
  .then(() => c.query("select table_name from information_schema.tables where table_schema='public' and table_name = any($1)", [need]))
  .then((r) => { console.log('ok:' + r.rows.length); return c.end(); })
  .catch((e) => { console.log('fail: ' + (e.code || (e.errors && e.errors[0] && e.errors[0].code) || e.message || e)); process.exit(0); });
EOF
)
  case "$pgres" in
    ok:6) ok "PostgreSQL reachable, schema complete (6/6 tables)" ;;
    ok:*) warn "PostgreSQL reachable but schema incomplete (${pgres#ok:}/6 tables)"; hint "npm run migrate" ;;
    *)    warn "PostgreSQL not reachable (${pgres#fail: })"; hint "docker compose up -d postgres redis" ;;
  esac

  rres=$(node - <<'EOF' 2>&1
require('dotenv').config();
const Redis = require('ioredis');
const r = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  lazyConnect: true, connectTimeout: 3000, retryStrategy: () => null, maxRetriesPerRequest: 0,
});
r.on('error', () => {});
r.connect().then(() => r.ping()).then(() => { console.log('ok'); r.disconnect(); })
  .catch((e) => { console.log('fail: ' + (e.code || e.message)); process.exit(0); });
EOF
)
  if [ "$rres" = "ok" ]; then ok "Redis reachable"; else warn "Redis not reachable (${rres#fail: })"; hint "docker compose up -d postgres redis"; fi
else
  info "skipping live Postgres/Redis checks (install backend packages first)"
fi

if listening 4000; then
  if command -v curl >/dev/null 2>&1 && h=$(curl -fsS --max-time 3 http://localhost:4000/health 2>/dev/null); then
    ok "API is up on :4000  $h"
  else
    warn "something is listening on :4000 but /health did not return 200"
  fi
else
  info "API not running on :4000   (start: npm run dev)"
fi
if listening 5173; then info "dashboard already running on :5173"; else info "dashboard not running   (start: cd dashboard && npm run dev)"; fi

# ------------------------------------------------------- 6. Full verification
if [ "$FULL" -eq 1 ]; then
  section "6. Full verification (typecheck, tests, build)"
  LOG=$(mktemp)
  run() {
    local label=$1 dir=$2; shift 2
    if [ ! -d "$dir/node_modules" ]; then bad "$label (skipped: no node_modules in $dir)"; return; fi
    if (cd "$dir" && "$@" >"$LOG" 2>&1); then
      ok "$label"
    else
      bad "$label"
      tail -n 15 "$LOG" | sed 's/^/        /'
    fi
  }
  run "backend typecheck"   .             npm run -s typecheck
  run "scripts typecheck"   .             npm run -s typecheck:scripts
  run "backend unit tests"  .             npm run -s test
  run "backend build"       .             npm run -s build
  run "dashboard typecheck" dashboard     npm run -s typecheck
  run "dashboard build"     dashboard     npm run -s build
  run "sdk typecheck"       sdk/javascript npm run -s typecheck
  run "sdk build"           sdk/javascript npm run -s build
  rm -f "$LOG"
fi

# ----------------------------------------------------------------- summary
printf "\n%s%d passed, %d warnings, %d failed%s\n" "$B" "$PASS" "$WARN" "$FAIL" "$N"
if [ "$FAIL" -eq 0 ]; then
  [ "$FULL" -eq 1 ] && echo "Everything checked out." || echo "Ready. (Add -- --full to also typecheck, test and build.)"
  exit 0
else
  echo "Fix the red ✗ items above, then run this again."
  exit 1
fi
