# Tasks: Laisser un avis et supprimer son compte

## Phase 1 : Avis (US1) 🎯
- [x] T001 [US1] Appliquer le filtrage de contenu au commentaire dans `POST /reviews` (FR-005)
- [x] T002 [US1] Créer `frontend/app/booking/avis.tsx` : sélection 1-5 étoiles, commentaire libre, validation (FR-002)
- [x] T003 [US1] Proposer la notation depuis les locations terminées non notées, via `/reviews/pending` (FR-001, FR-003)
- [x] T004 [US1] Vérifier que la note moyenne de l'annonce évolue après dépôt (FR-004, SC-002)

## Phase 2 : Suppression de compte (US2)
- [x] T005 [US2] `DELETE /api/auth/me` : refus si location en cours, anonymisation, suppression des annonces, révocation des sessions (FR-006, FR-008..FR-011)
- [x] T006 [US2] Écran de confirmation dans les réglages, détaillant ce qui est effacé et conservé (FR-007)
- [x] T007 [US2] Vérifier qu'un ancien jeton est refusé et que l'identité n'apparaît plus (SC-003, SC-004)
- [x] T008 [US2] Vérifier que les locations de l'autre partie restent consultables (SC-005)

## Phase 3 : Vérification
- [x] T009 Étendre la suite E2E (dépôt d'avis)
- [x] T010 `./run-e2e.sh` vert
- [x] T011 Mémoire à jour et commit
