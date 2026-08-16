# Tasks: État des lieux photo à la remise et au retour

**Input**: Design documents from `/specs/001-etat-des-lieux-photo/`

**Prerequisites**: plan.md, spec.md

**Tests**: Inclus — le principe constitutionnel IV (vérifié en réel, NON NÉGOCIABLE) impose une couverture E2E des parcours critiques.

**Organization**: Tâches groupées par user story, chacune livrable et testable indépendamment.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance)
- **[Story]** : US1 / US2 / US3 selon la user story de rattachement

---

## Phase 1 : Fondations (bloquant pour toutes les stories)

**Objectif** : garde-fous serveur — sans eux, l'interface pourrait envoyer des constats vides et la preuve serait sans valeur.

- [x] T001 [US1] Ajouter la validation « au moins une photo, au plus cinq » dans `create_booking_inspection` (`backend/server.py`) — refus HTTP 400 explicite (FR-001, FR-002)
- [x] T002 [US1] Ajouter la validation « note obligatoire si l'état n'est pas conforme » (`backend/server.py`) (FR-004)
- [x] T003 [US1] Ajouter le rejet d'un doublon : même auteur + même nature + même réservation (`backend/server.py`) (FR-007)
- [x] T004 [US1] Ajouter le plafond de charge utile cumulée des photos (`backend/server.py`) (FR-011)
- [x] T005 [P] [US1] Répliquer les mêmes règles dans `mock-server.js` pour que le mode développement ne diverge pas du contrat réel

**Checkpoint** : les règles sont vérifiables par appel d'API direct, sans interface.

---

## Phase 2 : User Story 1 — Constat de remise (P1) 🎯 MVP

**Objectif** : le locataire ne peut plus démarrer une location sans avoir photographié l'objet.

**Test indépendant** : réserver → accepter → confirmer la remise ; la validation est refusée sans photo, et le constat enregistré contient bien la photo et la note.

- [x] T006 [US1] Créer l'écran de constat `frontend/app/booking/constat.tsx` : paramètres `bookingId` et `kind`, ajout de 1 à 5 photos via `expo-image-picker` (qualité 0.4, base64), aperçu et suppression d'une photo, champ de note, avertissement « définitif et partagé » avant validation (FR-001, FR-010)
- [x] T007 [US1] Gérer le refus d'accès à l'appareil photo : repli sur la galerie avec message explicite, sans blocage du parcours (FR-009)
- [x] T008 [US1] Remplacer dans `frontend/app/(tabs)/bookings.tsx` l'appel stub `createInspection` par une navigation vers l'écran de constat (supprimer `photos: []` et `condition: "ok"` en dur)
- [x] T009 [US1] Conserver les photos saisies et permettre une nouvelle tentative si l'envoi échoue (réseau dégradé), sans doublon côté serveur
- [x] T010 [US1] Vérifier en réel : parcours complet remise, refus sans photo constaté à l'écran, constat présent en base

**Checkpoint** : US1 fonctionnelle seule — la promesse « objet photographié au départ » est tenue.

---

## Phase 3 : User Story 2 — Constat de retour et signalement (P2)

**Objectif** : fermer la boucle de preuve et permettre de déclarer un problème.

**Test indépendant** : sur une location en cours, confirmer le retour en déclarant un problème ; la note devient obligatoire et le constat reflète la qualification.

- [x] T011 [US2] Ajouter au constat le sélecteur d'état à trois niveaux (conforme / problème mineur / dégradé), affiché uniquement pour un retour (`frontend/app/booking/constat.tsx`) (FR-003)
- [x] T012 [US2] Rendre la note obligatoire côté interface dès que l'état déclaré n'est pas conforme, avec message d'erreur clair (FR-004)
- [x] T013 [US2] Refléter dans l'interface l'ordre imposé remise → retour (action de retour indisponible tant que la remise n'est pas faite) plutôt que de laisser échouer le serveur

**Checkpoint** : US1 + US2 fonctionnelles ; un litige déclaré est tracé avec preuve.

---

## Phase 4 : User Story 3 — Consultation partagée et contre-observation (P3)

**Objectif** : rétablir la symétrie entre les deux parties (principe constitutionnel I).

**Test indépendant** : en tant que propriétaire, ouvrir la réservation et voir les constats du locataire, puis ajouter sa propre observation.

- [ ] T014 [P] [US3] Créer `frontend/src/InspectionView.tsx` : affichage lecture seule d'un constat (auteur, horodatage, qualification, note, vignettes photo) (FR-005, FR-006)
- [ ] T015 [US3] Afficher les constats existants dans le détail d'une réservation, côté locataire (`frontend/app/(tabs)/bookings.tsx`)
- [ ] T016 [US3] Donner au propriétaire l'accès aux constats et à l'ajout d'une contre-observation depuis `frontend/app/(tabs)/myitems.tsx`
- [ ] T017 [US3] Vérifier qu'aucune modification ni suppression n'est possible après validation, des deux côtés (FR-006)

**Checkpoint** : les trois stories sont fonctionnelles et indépendantes.

---

## Phase 5 : Vérification et finition

- [x] T018 [P] Étendre `frontend/e2e/locashare.spec.ts` : validation refusée sans photo (US1)
- [x] T019 [P] Étendre la suite E2E : retour avec problème déclaré exigeant une note (US2)
- [ ] T020 [P] Étendre la suite E2E : constat déposé visible par l'autre partie (US3)
- [x] T021 Exécuter `./run-e2e.sh` — suite entièrement verte, aucune régression
- [x] T022 Vérifier l'absence de nouvelle erreur console sur le parcours complet
- [ ] T023 Mettre à jour la mémoire projet et committer avec le constat de vérification

---

## Dépendances et ordre d'exécution

- **Phase 1** bloque tout : sans garde-fous serveur, l'interface pourrait produire des constats sans valeur probante.
- **US1 (Phase 2)** dépend uniquement de la Phase 1.
- **US2 (Phase 3)** réutilise l'écran créé en US1 : séquentielle après US1 en pratique (même fichier).
- **US3 (Phase 4)** dépend de l'existence de constats à afficher, donc d'US1 ; T014 est parallélisable.
- **Phase 5** dépend des stories livrées.

### Opportunités de parallélisation

- T005 en parallèle des T001-T004 (fichier différent).
- T014 en parallèle des tâches d'US2 (fichier différent).
- T018, T019, T020 en parallèle entre eux (assertions indépendantes).

## Stratégie de livraison

1. **Phase 1 + US1** → arrêt et validation → c'est déjà le MVP : plus aucune location ne démarre sans preuve photo.
2. **US2** → la boucle de preuve est complète.
3. **US3** → symétrie totale entre les parties.
4. **Phase 5** à chaque incrément, pas seulement à la fin.

## Notes

- Commit après chaque groupe logique, message en français décrivant l'intention et le constat de vérification.
- Porte de qualité constitutionnelle avant toute annonce de livraison : parcours exécuté en réel, E2E vert, zéro nouvelle erreur console, principes I à V relus.
