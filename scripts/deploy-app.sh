#!/usr/bin/env bash
# Déploie le FRONT web de Toupré sur Vercel (projet toupre-app), branché sur le
# backend cloud. Encapsule 3 pièges rencontrés au 1er déploiement :
#   1. L'URL backend est figée au build (EXPO_PUBLIC_BACKEND_URL) → on force .env
#      le temps du build, puis on restaure (pour ne pas casser le dev local).
#   2. Il faut vider le cache Metro (--clear) sinon d'anciennes valeurs inlinées
#      (ex. Supabase vide) persistent et cassent l'app en prod.
#   3. Vercel EXCLUT les dossiers "node_modules" à l'upload → la police Ionicons
#      (sous assets/node_modules/...) renvoie 404 (icônes en carrés). On renomme
#      ce dossier en assets/vendor et on corrige les références.
#
# Usage : ./scripts/deploy-app.sh [URL_BACKEND]
#   URL_BACKEND par défaut : https://toupre-api.vercel.app
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="${1:-https://toupre-api.vercel.app}"
FRONT="$ROOT/frontend"

echo "→ Backend ciblé : $BACKEND_URL"
cd "$FRONT"

# 1. Build avec l'URL backend de prod (sauvegarde/restauration de .env)
cp .env .env.deploy.bak
trap 'mv -f "$FRONT/.env.deploy.bak" "$FRONT/.env" 2>/dev/null || true' EXIT
sed -i '' "s|EXPO_PUBLIC_BACKEND_URL=.*|EXPO_PUBLIC_BACKEND_URL=$BACKEND_URL|" .env
rm -rf dist
# 2. Cache vidé obligatoire
./node_modules/.bin/expo export -p web --clear
mv -f .env.deploy.bak .env
trap - EXIT
echo "✓ Build terminé (.env restauré)"

# 3. Contourner l'exclusion node_modules de Vercel
cd "$FRONT/dist"
if [ -d assets/node_modules ]; then
  mv assets/node_modules assets/vendor
  grep -rl "assets/node_modules" . 2>/dev/null | while read -r f; do
    sed -i '' 's|assets/node_modules|assets/vendor|g' "$f"
  done
  echo "✓ Polices déplacées node_modules → vendor"
fi

# 4. Déploiement
vercel deploy --prod --yes --name toupre-app
echo "✓ Front déployé → https://toupre-app.vercel.app"
