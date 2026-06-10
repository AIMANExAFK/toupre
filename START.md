# 🚀 LocaShare — Démarrage rapide

## Mode 1 : Preview locale (déjà actif)

L'app tourne déjà en mode mock :
- **Mock API** : http://localhost:8000
- **Preview Web** : http://localhost:4174
- **Connexion démo** : `demo@locashare.fr` / `demo1234`

### Redémarrer si les serveurs sont arrêtés
```bash
cd "/Users/aimaneramzi/Documents/Claude/Codex/application-locaShear"
node mock-server.js &      # API mockée :8000
node preview-server.js &   # Web preview :4174
```

## Mode 2 : Backend réel (à configurer)

### 1. MongoDB
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 2. Backend Python
```bash
cd backend
cp .env.example .env
# → édite .env avec ton STRIPE_API_KEY et un JWT_SECRET (openssl rand -hex 32)
pip3 install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Expo (dev)
```bash
cd frontend
cp .env.example .env
# → remplis les clés Supabase + Google si besoin (sinon laisse les placeholders, login email/password marchera)
npm install
npm run web      # web
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

## Ce qu'il manque encore

Voir l'audit complet : la **Phase 1 (config)** est OK quand backend Python tourne.  
**Phase 2 (MVP marketplace)** : messagerie, avis, accept/refuse booking, webhook Stripe.  
**Phase 3 (trust & safety)** : KYC, calendrier dispo, push notifs.  
**Phase 4** : parrainage.
