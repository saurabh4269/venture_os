#!/usr/bin/env bash
# One-command operator path: Compose (or native) + migrate + signup + FIXTURE_ONLY seed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Wrote .env from .env.example (set OPENAI_API_KEY later if you want Ask prose)."
fi

email="$(grep -E '^SEED_DEMO_EMAIL=' .env | tail -n1 | cut -d= -f2- || true)"
pass="$(grep -E '^SEED_DEMO_PASSWORD=' .env | tail -n1 | cut -d= -f2- || true)"
email="${email:-analyst@fixture.local}"
pass="${pass:-fixture-only-password}"

have_docker=0
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  have_docker=1
fi

wait_health() {
  local ready=""
  local n="${1:-60}"
  for _ in $(seq 1 "$n"); do
    if curl -sf http://localhost:4000/health | grep -q '"postgres":"up"'; then
      ready=1
      break
    fi
    sleep 2
  done
  [[ -n "$ready" ]]
}

if [[ "$have_docker" -eq 1 ]]; then
  echo "Starting Docker Compose…"
  docker compose up -d --build
  echo "Waiting for API /health (postgres=up)…"
  if ! wait_health 90; then
    echo "API never became healthy. Try: docker compose logs api" >&2
    exit 1
  fi
else
  echo "Docker Compose not found. Using native Postgres/Redis from .env"
  export S3_ENDPOINT="${S3_ENDPOINT:-fs}"
  pnpm db:migrate
  if ! wait_health 15; then
    echo "API is not up. In another terminal run: pnpm dev" >&2
    echo "Then re-run: pnpm demo:vc" >&2
    exit 1
  fi
fi

pnpm db:migrate

signup_code="$(
  curl -sS -o /tmp/vos-signup.json -w "%{http_code}" \
    -X POST http://localhost:4000/api/auth/sign-up/email \
    -H "origin: http://localhost:3000" \
    -H "content-type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${pass}\",\"name\":\"Fixture Analyst\"}" || true
)"
if [[ "$signup_code" != "200" && "$signup_code" != "422" && "$signup_code" != "400" ]]; then
  echo "Signup returned HTTP ${signup_code}. Body:" >&2
  cat /tmp/vos-signup.json >&2 || true
  echo >&2
fi

SEED_DEMO=1 pnpm seed:demo

echo
echo "=============================================="
echo "Venture OS demo is ready (FIXTURE_ONLY)"
echo "Open:     http://localhost:3000/login"
echo "Email:    ${email}"
echo "Password: ${pass}"
echo "If Command is empty, switch to Fixture Capital (FIXTURE_ONLY)."
echo "These rows are labelled fixtures — not the live V3 book."
echo "=============================================="
