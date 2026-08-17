# Implementation Plan: Réparer les promesses non tenues du passage au vrai serveur

**Branch**: `003-reparer-le-passage-au-vrai-backend` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

## Summary

Porter sur FastAPI trois capacités qui n'existaient que dans le serveur de développement, et
retirer de l'écran ce qui reste non implémenté. Le travail est concentré dans `backend/server.py` ;
le frontend n'est touché que pour masquer la section des clés d'accès.

## Technical Context

**Langages** : Python 3.9 (FastAPI + Motor), TypeScript (Expo Router)
**Dépendances** : aucune ajoutée
**Stockage** : deux collections MongoDB nouvelles — `reports`, `sessions`
**Tests** : appels d'API réels + extension E2E ; comparaison automatisée appels front / routes back
**Contraintes** : ne modifier aucun parcours existant (SC-005)

### Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Révocation de session | Enregistrer un identifiant de session dans le jeton, et vérifier son état à chaque requête | Le jeton actuel est autoporteur : sans vérification serveur, « fermer une session » serait un mensonge (principe I) |
| Compatibilité des jetons existants | Un jeton sans identifiant de session reste accepté | Ne pas déconnecter tout le monde à la mise à jour ; la liste se remplit aux connexions suivantes |
| Unicité des signalements | Index unique sur (auteur, type de cible, identifiant de cible) | Traduit FR-003 au niveau du stockage plutôt qu'en code applicatif |
| Filtrage du motif | Réutilisation de la fonction de modération déjà employée pour les annonces et messages | Principe V : pas de seconde implémentation |
| Clés d'accès | Section masquée côté client, aucun code serveur | Construire WebAuthn est un chantier à part ; afficher une section morte est pire que ne rien afficher |

## Constitution Check

| Principe | Verdict |
|---|---|
| I. Confiance avant fonctionnalité | ✅ C'est l'objet même de la spec : supprimer trois fausses promesses de sécurité |
| II. Zéro commission | ✅ Sans objet |
| III. Friction minimale | ✅ Aucune étape ajoutée ; une vérification serveur supplémentaire, invisible |
| IV. Vérifié en réel | ✅ SC-001/SC-003 exigent des appels réels ; SC-004 est une mesure automatisée |
| V. Local et simple | ✅ Zéro dépendance, réutilisation du filtrage existant |

## Phasage

**Phase 1 — Signalements (US1)** : modèle, route de création avec validations et anti-doublon,
marquage automatique au troisième signalement, route de lecture pour la modération.

**Phase 2 — Sessions (US2)** : collection, identifiant de session dans le jeton, vérification à
chaque requête authentifiée, routes de liste et de fermeture.

**Phase 3 — Cohérence (US3)** : masquer la section des clés d'accès.

**Phase 4 — Vérification** : appels réels, comparaison automatisée appels/routes, E2E.

## Risques

- **Vérification de session à chaque requête** : une lecture supplémentaire par requête authentifiée. Acceptable à cette échelle ; à surveiller si le trafic croît.
- **Jetons hérités** : acceptés sans identifiant de session, donc non révocables. Compromis assumé et documenté, plutôt que de déconnecter tout le monde.
