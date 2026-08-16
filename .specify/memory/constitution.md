# Constitution Toupré

*« Tout se loue, tout près. » — Principes directeurs du produit et du code.*

## Core Principles

### I. La confiance avant la fonctionnalité (NON NÉGOCIABLE)

Toupré met en relation des inconnus qui se confient des objets de valeur, sans séquestre bancaire.
La confiance est donc le produit, pas une option.

- Toute fonctionnalité touchant à une transaction doit répondre à la question : « qu'est-ce qui protège les deux parties si ça se passe mal ? »
- Les signaux de confiance (contact vérifié, avis, état des lieux, signalement) ne sont jamais masqués pour gagner un écran ou une étape.
- Aucune fonctionnalité ne peut créer une asymétrie d'information entre propriétaire et locataire.

### II. Zéro commission, pour toujours

L'absence de commission est la promesse fondatrice, pas une offre de lancement.

- Aucune fonctionnalité ne peut prélever un pourcentage sur une transaction entre particuliers.
- La monétisation passe exclusivement par des services optionnels (visibilité, abonnement propriétaire, assurance) qui n'entravent jamais un parcours de location gratuit et complet.
- Le paiement en espèces à la remise reste le mode par défaut et doit rester utilisable sans aucun moyen de paiement enregistré.

### III. Friction minimale à l'entrée

Un voisin doit pouvoir louer sans créer de dossier.

- L'inscription reste une méthode unique (OTP email + téléphone), sans mot de passe imposé ni pièce d'identité pour un usage standard.
- Toute étape ajoutée à un parcours critique (inscription, publication, réservation) doit être justifiée par un gain de confiance mesurable, sinon elle est refusée.
- Le libellé prime sur l'icône : l'app parle français, simplement, sans jargon.

### IV. Vérifié en réel, jamais supposé (NON NÉGOCIABLE)

Une fonctionnalité n'est « faite » que lorsqu'elle a été observée en fonctionnement.

- Tout parcours critique modifié doit être exécuté réellement (app lancée, requêtes observées) avant d'être annoncé comme terminé.
- Les parcours critiques sont couverts par la suite E2E (`./run-e2e.sh`) ; un correctif de bug ajoute l'assertion qui aurait détecté ce bug.
- Aucune régression connue n'est laissée derrière : si un test casse, on répare ou on documente explicitement pourquoi.

### V. Local d'abord, simple d'abord

Le produit se gagne au quartier, le code se gagne en lisibilité.

- Les fonctionnalités privilégient l'usage hyper-local (proximité, retrait à pied) avant toute logique nationale.
- Pas de dépendance ajoutée si le besoin est couvert par l'existant ; pas d'abstraction avant le troisième usage réel.
- Le code suit les conventions en place (StyleSheet inline + thème `useColors`, pas de Tailwind), même si une autre approche serait « meilleure » dans l'absolu.

## Contraintes techniques

- **Stack imposée** : Expo Router / React Native (frontend), FastAPI + Motor/MongoDB (backend). Le mock-server Node reste réservé au développement rapide et ne doit jamais diverger du contrat d'API réel.
- **Identité visuelle** : palette Toupré (crème `#FFF8F3`, corail `#E2674A`, anthracite `#2B2420`), typo Fredoka/Nunito. Aucune couleur hors thème en dur dans un écran.
- **Interdits historiques** : jamais de curseur custom, jamais de velocity marquee, jamais d'`outline`/`box-shadow` de focus.
- **Données personnelles** : minimisation stricte. Aucune donnée collectée sans usage produit identifié ; les identifiants techniques (base, emails de démo) restent distincts de la marque.
- **Secrets** : jamais dans le dépôt. `.env` gitignoré, `.env.example` documenté.

## Workflow de développement

- **Spec avant code** pour toute fonctionnalité nouvelle non triviale : `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- **Commits atomiques** en français, décrivant l'intention et le constat de vérification.
- **Une seule source** : `~/Documents/WorkSpace Claude:Codex/Projets/LocaShare/`. Toute copie parallèle est considérée périmée.
- **Portes de qualité avant de considérer une fonctionnalité livrée** :
  1. Le parcours a été exécuté en réel et observé.
  2. `./run-e2e.sh` passe au vert.
  3. Aucune erreur console nouvelle.
  4. Les principes I à V ont été relus face au changement.

## Gouvernance

Cette constitution prime sur les préférences ponctuelles. Une décision qui contredit un principe
doit soit être refusée, soit s'accompagner d'un amendement explicite de ce document, justifié et daté.

Les principes marqués **NON NÉGOCIABLE** ne peuvent pas être contournés « temporairement » :
toute exception doit être documentée dans la spec de la fonctionnalité concernée.

**Version** : 1.0.0 | **Ratifiée le** : 2026-08-17 | **Dernier amendement** : 2026-08-17
