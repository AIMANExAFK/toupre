# Feature Specification: Réparer les promesses non tenues du passage au vrai serveur

**Feature Branch**: `003-reparer-le-passage-au-vrai-backend`

**Created**: 2026-08-17

**Status**: Draft

**Input**: Trois fonctions présentes à l'écran ne fonctionnent pas : signaler un contenu, consulter ses sessions actives, gérer ses clés d'accès. Elles avaient été construites contre le serveur de développement et n'ont jamais été portées sur le serveur réel. Vérifié par appel : les requêtes correspondantes répondent « introuvable » (404).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Signaler un contenu abusif (Priority: P1)

Une personne tombe sur une annonce frauduleuse ou reçoit un message déplacé. Elle utilise le bouton
de signalement, choisit une catégorie, explique en quelques mots, et reçoit la confirmation que son
signalement est enregistré. Au-delà d'un certain nombre de signalements, le contenu visé est marqué
pour examen.

**Why this priority**: C'est le seul recours d'un utilisateur face à un abus. Aujourd'hui le bouton
existe, l'utilisateur croit avoir signalé, et **rien n'est enregistré** — une promesse de sécurité
non tenue est pire que son absence. C'est aussi une obligation des magasins d'applications pour
toute plateforme hébergeant du contenu d'utilisateurs.

**Independent Test**: Signaler une annonce depuis l'application, puis vérifier que le signalement
existe côté serveur et que le contenu est marqué après le troisième signalement distinct.

**Acceptance Scenarios**:

1. **Given** une annonce ou un message, **When** l'utilisateur le signale avec une catégorie, **Then** le signalement est enregistré et l'utilisateur reçoit une confirmation.
2. **Given** un signalement sans catégorie choisie, **When** l'utilisateur valide, **Then** la validation est refusée avec un message explicite.
3. **Given** un contenu ayant reçu trois signalements de personnes différentes, **When** le troisième est enregistré, **Then** le contenu est marqué comme à examiner.
4. **Given** un utilisateur ayant déjà signalé un contenu, **When** il le signale à nouveau, **Then** son signalement n'est pas compté deux fois.

---

### User Story 2 - Voir et fermer ses sessions actives (Priority: P2)

Une personne consulte la liste des appareils connectés à son compte, avec la date de dernière
activité, et peut fermer à distance une session qu'elle ne reconnaît pas. Une session fermée ne
donne plus accès au compte.

**Why this priority**: Sans cela, une personne qui se sait compromise n'a aucun moyen d'agir.
Aujourd'hui la page affiche une liste vide en permanence, ce qui laisse croire à tort qu'aucun
autre appareil n'est connecté.

**Independent Test**: Se connecter depuis deux contextes, vérifier que les deux apparaissent, en
fermer un, et constater qu'il ne peut plus accéder au compte.

**Acceptance Scenarios**:

1. **Given** un compte utilisé sur plusieurs appareils, **When** l'utilisateur ouvre la page sécurité, **Then** il voit une entrée par session, avec appareil et dernière activité.
2. **Given** une session listée, **When** l'utilisateur la ferme, **Then** cette session ne permet plus d'accéder au compte, immédiatement.
3. **Given** la session courante, **When** l'utilisateur consulte la liste, **Then** elle est identifiée comme telle et ne peut pas être fermée par erreur.

---

### User Story 3 - Ne pas afficher ce qui n'existe pas (Priority: P3)

Une personne ne voit, dans les réglages de sécurité, que les options réellement disponibles.
Aucune section ne reste vide ou inopérante.

**Why this priority**: Une section « clés d'accès » qui ne fonctionne pas donne l'illusion d'une
protection inexistante. Tant que la fonction n'est pas construite, ne pas la montrer est plus
honnête que la montrer cassée. Priorité basse car sans conséquence directe, mais nécessaire à la
cohérence.

**Independent Test**: Ouvrir la page sécurité : chaque section affichée correspond à une fonction
qui répond réellement.

**Acceptance Scenarios**:

1. **Given** une fonction non disponible côté serveur, **When** l'utilisateur ouvre la page sécurité, **Then** aucune section morte ne lui est présentée.
2. **Given** une fonction rétablie plus tard, **When** elle devient disponible, **Then** sa section réapparaît sans autre changement.

---

### Edge Cases

- Que se passe-t-il si l'utilisateur signale son propre contenu ? Le signalement doit être refusé ou ignoré silencieusement, sans créer de faux signal.
- Que se passe-t-il si le motif libre d'un signalement contient lui-même du contenu abusif ? Il doit être soumis au même filtrage que le reste de la plateforme.
- Que se passe-t-il si l'utilisateur ferme la session depuis laquelle il agit ? Il doit être déconnecté proprement, sans état incohérent.
- Que se passe-t-il pour les sessions ouvertes avant la mise en place du suivi ? Elles ne peuvent pas être listées ; l'utilisateur ne doit pas en conclure qu'elles n'existent pas.
- Que se passe-t-il si un contenu signalé est supprimé par son auteur ? Le signalement doit rester consultable pour la modération.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST enregistrer durablement chaque signalement avec sa cible, sa catégorie, son motif, son auteur et son horodatage.
- **FR-002**: Le système MUST refuser un signalement dont la catégorie ou la cible est absente ou invalide.
- **FR-003**: Le système MUST empêcher qu'un même utilisateur compte plusieurs fois pour une même cible.
- **FR-004**: Le système MUST marquer une cible pour examen à partir de trois signalements distincts.
- **FR-005**: Le système MUST appliquer au motif libre le même filtrage de contenu que le reste de la plateforme.
- **FR-006**: Le système MUST enregistrer une session à chaque connexion, avec appareil et date de dernière activité.
- **FR-007**: Un utilisateur MUST pouvoir consulter la liste de ses sessions et identifier celle en cours.
- **FR-008**: Un utilisateur MUST pouvoir fermer une session, qui perd alors immédiatement tout accès au compte.
- **FR-009**: Le système MUST refuser tout accès présenté par une session fermée.
- **FR-010**: L'application MUST NOT présenter de section dont la fonction n'est pas disponible côté serveur.

### Key Entities

- **Signalement** : déclaration d'un utilisateur à propos d'un contenu. Porte une cible (type et identifiant), une catégorie, un motif libre, un auteur, un horodatage et un état de traitement. Un auteur ne compte qu'une fois par cible.
- **Session** : trace d'une connexion. Porte un appareil, une date de création, une date de dernière activité et un état (active ou fermée). Rattachée à un compte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des signalements émis depuis l'application sont retrouvables côté serveur (aujourd'hui : 0 %).
- **SC-002**: Une cible atteignant trois signalements distincts est marquée pour examen sans intervention.
- **SC-003**: Une session fermée ne permet plus aucun accès au compte, vérifié par tentative réelle.
- **SC-004**: Aucune section de l'application n'appelle une fonction absente du serveur (vérifié par comparaison automatique des appels et des routes).
- **SC-005**: Aucun parcours existant n'est modifié.

## Assumptions

- Le filtrage de contenu déjà en place sur les autres champs libres est réutilisé tel quel pour les motifs de signalement.
- Le seuil de trois signalements distincts reprend celui qui avait été retenu lors de la conception initiale de la modération.
- Le traitement humain des signalements sort du périmètre : cette fonctionnalité produit et conserve le signal, elle ne l'arbitre pas.
- Les sessions ouvertes avant la mise en place du suivi ne peuvent pas être reconstituées ; la liste commence à la première connexion suivante.
- Les clés d'accès (WebAuthn) représentent un chantier à part entière : elles sont retirées de l'affichage plutôt que construites ici.

## Alignement constitutionnel

- **Principe I (confiance avant fonctionnalité)** : une fonction de sécurité qui ment est une trahison de la confiance. C'est précisément ce que cette spec répare.
- **Principe II (zéro commission)** : aucun impact.
- **Principe III (friction minimale)** : aucune étape ajoutée ; SC-005 le verrouille.
- **Principe IV (vérifié en réel)** : SC-001 et SC-003 exigent une vérification par appel réel, pas une lecture de code.
- **Principe V (local et simple)** : réutilisation du filtrage et du stockage existants, aucune dépendance nouvelle.
