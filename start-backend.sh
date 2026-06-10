#!/usr/bin/env bash
# Démarre MongoDB local + le backend FastAPI de LocaShare.
# MongoDB et le backend ne sont PAS des services auto-démarrés : relancer ce script après un reboot.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGOD="$(ls "$ROOT"/.mongo/mongodb-*/bin/mongod 2>/dev/null | head -1)"
DBPATH="$ROOT/.mongo/data"

if [ -z "$MONGOD" ]; then
  echo "✗ mongod introuvable dans .mongo/ — relancer le téléchargement des binaires MongoDB."
  exit 1
fi

# 1. MongoDB (port 27017) si pas déjà lancé
if lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ MongoDB déjà en écoute sur 27017"
else
  mkdir -p "$DBPATH"
  echo "→ Démarrage MongoDB..."
  "$MONGOD" --dbpath "$DBPATH" --port 27017 --bind_ip 127.0.0.1 --fork --logpath "$ROOT/.mongo/mongod.log"
  echo "✓ MongoDB démarré (log: .mongo/mongod.log)"
fi

# 2. Backend FastAPI (port 8000)
cd "$ROOT/backend"
set -a; . ./.env; set +a
echo "→ Démarrage du backend FastAPI sur http://127.0.0.1:8000 ..."
exec ./.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
