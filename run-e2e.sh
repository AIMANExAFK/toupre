#!/usr/bin/env bash
# Lance la suite E2E Playwright contre le vrai backend, avec un état déterministe :
# 1. mongod démarré si besoin   2. base re-seedée   3. backend :8000 relancé
# 4. preview :4174 démarré si besoin   5. playwright test (Chrome installé, headless)
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGOD="$(ls "$ROOT"/.mongo/mongodb-*/bin/mongod 2>/dev/null | head -1)"

# 1. MongoDB
if ! lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
  [ -z "$MONGOD" ] && { echo "✗ mongod introuvable dans .mongo/"; exit 1; }
  mkdir -p "$ROOT/.mongo/data"
  "$MONGOD" --dbpath "$ROOT/.mongo/data" --port 27017 --bind_ip 127.0.0.1 --fork --logpath "$ROOT/.mongo/mongod.log" >/dev/null
  echo "✓ MongoDB démarré"
fi

# 2. Re-seed : on repart d'une base vierge (le seed tourne au démarrage du backend)
"$ROOT/backend/.venv/bin/python" - << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def m():
    await AsyncIOMotorClient("mongodb://127.0.0.1:27017").drop_database("locashare")
asyncio.run(m())
print("✓ Base locashare purgée (re-seed au démarrage du backend)")
EOF

# 3. Backend
OLD_PID=$(lsof -nP -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null || true)
[ -n "$OLD_PID" ] && kill $OLD_PID 2>/dev/null && sleep 1
cd "$ROOT/backend"
set -a; . ./.env; set +a
./.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000 > /tmp/locashare-fastapi.log 2>&1 &
BACKEND_PID=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null http://127.0.0.1:8000/api/ 2>/dev/null && break
  python3 -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/',timeout=1)" 2>/dev/null && break
  sleep 0.5
done
echo "✓ Backend re-seedé sur :8000 (PID $BACKEND_PID)"

# 4. Preview (sert frontend/dist)
if ! lsof -nP -iTCP:4174 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT" && node preview-server.js > /tmp/locashare-preview.log 2>&1 &
  sleep 1
  echo "✓ Preview démarré sur :4174"
fi

# 5. Tests
cd "$ROOT/frontend"
exec ./node_modules/.bin/playwright test "$@"
