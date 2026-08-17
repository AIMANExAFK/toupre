# Implementation Plan: Laisser un avis et supprimer son compte

**Branch**: `004-avis-et-suppression-de-compte` | **Date**: 2026-08-17

## Summary

Deux chantiers indépendants. Les avis n'exigent quasiment aucun code serveur (tout existe déjà,
y compris `/reviews/pending` qui liste les locations en attente de notation) : le travail est un
écran. La suppression de compte est l'inverse : peu d'interface, une décision de conception
serveur — anonymiser plutôt qu'effacer.

## Technical Context

**Dépendances** : aucune ajoutée
**Serveur** : `POST /reviews` et `GET /reviews/pending` existent ; reste à ajouter `DELETE /auth/me`
**Client** : un écran de notation, une entrée dans les réglages
**Tests** : appels réels + extension E2E

### Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Suppression | Anonymisation : nom remplacé, contacts effacés, compte marqué supprimé | Effacer la ligne casserait les réservations et constats de l'autre partie, qui perdrait ses propres preuves (principe I) |
| Annonces | Retirées définitivement | Elles n'engagent que leur auteur, rien ne justifie de les conserver |
| Avis écrits | Conservés, sans identité | Les retirer modifierait la note d'annonces appartenant à des tiers |
| Sessions | Toutes révoquées | Réutilise le mécanisme de la spec 003 |
| Blocage | Suppression refusée si une location est en cours | On ne disparaît pas au milieu d'un engagement |
| Point d'entrée des avis | Depuis l'onglet Locations, sur les locations terminées | Là où l'utilisateur regarde déjà, aucun écran de plus dans la navigation |

## Constitution Check

| Principe | Verdict |
|---|---|
| I. Confiance avant fonctionnalité | ✅ Les avis rendent enfin réelle la réputation affichée ; l'anonymisation protège les preuves de l'autre partie |
| II. Zéro commission | ✅ Sans objet |
| III. Friction minimale | ✅ La notation est proposée, jamais imposée ; aucun écran ajouté à la navigation |
| IV. Vérifié en réel | ✅ SC-002 et SC-004 exigent une vérification par appel |
| V. Local et simple | ✅ Réutilise `/reviews/pending`, le filtrage et la révocation de session existants |

## Phasage

**Phase 1 — Avis (US1)** : écran de notation, accroche depuis les locations terminées, filtrage du commentaire.
**Phase 2 — Suppression (US2)** : route serveur d'anonymisation, écran de confirmation explicite.
**Phase 3 — Vérification** : appels réels, E2E, contrôle de non-régression.

## Risques

- **Anonymisation irréversible** : aucune récupération possible. Mitigation : confirmation explicite détaillant ce qui disparaît.
- **Note moyenne** : elle est recalculée à la lecture (déjà en place depuis la correction des annonces), donc aucune donnée dérivée à maintenir.
