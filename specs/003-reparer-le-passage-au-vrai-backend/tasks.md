# Tasks: Réparer les promesses non tenues du passage au vrai serveur

## Phase 1 : Signalements (US1) 🎯

- [x] T001 [US1] Modèle `ReportCreate` + collection `reports` avec index unique (auteur, type, cible) — `backend/server.py` (FR-001, FR-003)
- [x] T002 [US1] `POST /api/reports` : validation catégorie et cible, refus de l'auto-signalement, filtrage du motif (FR-002, FR-005)
- [x] T003 [US1] Marquage automatique de la cible à partir de 3 signalements distincts (FR-004)
- [x] T004 [US1] `GET /api/reports` réservé à la modération (lecture des signalements)
- [x] T005 [P] [US1] Aligner `mock-server.js` sur le contrat réel (auto-signalement, doublon)

## Phase 2 : Sessions (US2)

- [x] T006 [US2] Collection `sessions` + identifiant de session inséré dans le jeton à la connexion (FR-006)
- [x] T007 [US2] Vérification de l'état de session dans `get_current_user` ; jetons hérités acceptés (FR-009)
- [x] T008 [US2] `GET /api/auth/sessions` avec marquage de la session courante (FR-007)
- [x] T009 [US2] `DELETE /api/auth/sessions/{id}` : fermeture effective (FR-008)

## Phase 3 : Cohérence (US3)

- [x] T010 [US3] Masquer la section des clés d'accès dans `frontend/app/security.tsx` (FR-010)

## Phase 4 : Vérification

- [x] T011 Appels réels : signalement enregistré, 3e signalement marque la cible, session fermée refusée (SC-001/002/003)
- [x] T012 Comparaison automatisée appels front / routes back : 0 manquant (SC-004)
- [x] T013 `./run-e2e.sh` vert, aucune régression (SC-005)
- [x] T014 Mémoire projet à jour et commit avec constat de vérification
