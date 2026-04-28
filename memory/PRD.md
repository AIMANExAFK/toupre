# LocaShare — PRD

## Vision
Application mobile française de location entre particuliers (P2P rental marketplace) inspirée de Getaround, étendue aux objets du quotidien (voitures, vélos, outils, tech, camping, autres).

## Stack
- Frontend: Expo Router (SDK 54) + React Native + expo-blur (liquid glass) + react-native-maps (native) + WebBrowser pour Stripe checkout
- Backend: FastAPI + Motor (MongoDB) + JWT bearer auth + bcrypt + emergentintegrations Stripe
- Theme: ThemeProvider avec mode clair/sombre/système, persisté via SecureStore/localStorage
- Design: liquid-glass (BlurView + glow blobs) violet/blanc, dark mode complet

## Fonctionnalités
- Auth email/mot de passe (JWT bearer) + utilisateur démo seedé
- Listings CRUD (titre, description, catégorie, prix/jour, photos base64, localisation)
- Booking avec calendrier + 10% frais de service (cohérent UI/backend)
- Paiement Stripe Checkout (ouvert via expo-web-browser) + polling /checkout/status avec fallback DB local
- 5 onglets: Explorer (recherche + carte), Locations, Publier, Mes biens, Profil
- Écrans complets: Settings (toggle thème), Paiements (cartes mockées + ajout/suppression), Aide & support (FAQ + formulaire de contact)
- 8 annonces démo seedées au démarrage

## Comptes de test
- Demo: demo@locashare.fr / demo1234 (voir /app/memory/test_credentials.md)

## Bugs corrigés (iter 2)
- Stripe checkout/status 500 → try/except + fallback DB local
- 10% service fee ajouté en backend (cohérent avec UI)
- react-native-maps web crash → Map.web.tsx (stub) + Map.native.tsx
- Liquid glass + dark mode + écrans paramètres/paiement/aide fonctionnels

## Idée d'amélioration business
Ajouter un système de **parrainage** (referral code) : 10€ offerts au filleul après sa 1ère réservation + 10€ de crédit au parrain — booste l'acquisition virale et la rétention des deux côtés du marketplace.
