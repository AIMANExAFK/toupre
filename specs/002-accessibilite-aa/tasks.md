# Tasks: Accessibilité — conformité WCAG 2.2 niveau AA

**Input**: Design documents from `/specs/002-accessibilite-aa/`

**Prerequisites**: plan.md, spec.md

**Tests**: Inclus — le principe constitutionnel IV impose une vérification sur le rendu réel.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1 : Couleurs conformes AA (US2 — indépendante)

**Objectif** : tous les couples texte/fond du mode crème atteignent le seuil AA, sans changer les teintes.
Le mode sombre est déjà conforme (mesuré : 5.69:1 à 16.60:1) — aucune modification.

- [x] T001 [US2] Corriger les 5 jetons du mode clair dans `frontend/src/theme.tsx` : `primary` `#E2674A`→`#CE4221`, `primaryDark` ajusté, `textTertiary`→`#807066`, `success`→`#188261`, `warning`→`#9F600F` (FR-005, FR-007)
- [x] T002 [US2] Conserver `#E2674A` pour les usages décoratifs (teintes, halos, bordures) qui passent déjà le seuil 3:1 — vérifier qu'aucun texte ne l'utilise
- [x] T003 [US2] Re-mesurer tous les couples et confirmer 0 échec (FR-005, FR-006)
- [x] T004 [US2] Contrôle visuel : l'identité reste reconnaissable, aucune teinte remplacée (SC-005)

**Checkpoint** : l'application est lisible par une personne malvoyante ou en plein soleil.

---

## Phase 2 : Rôles et intitulés accessibles (US1 — le cœur) 🎯

**Objectif** : chaque élément actionnable est annoncé comme tel, avec un intitulé qui décrit son effet.

**Test indépendant** : mesurer sur le rendu que 100 % des éléments focusables portent un rôle et un nom.

- [x] T005 [US1] Écrans principaux — `app/(tabs)/index.tsx`, `bookings.tsx`, `myitems.tsx`, `profile.tsx`, `create.tsx` : `accessibilityRole="button"` sur chaque élément actionnable (FR-001)
- [x] T006 [US1] Parcours de location — `app/listing/[id].tsx`, `app/booking/[id].tsx`, `constat.tsx`, `constats.tsx` (FR-001)
- [x] T007 [US1] Écrans secondaires — `auth/otp.tsx`, `(auth)/welcome.tsx`, `security.tsx`, `settings.tsx`, `referral.tsx`, `payments.tsx`, `help.tsx`, `notifications.tsx`, `messages/*` (FR-001)
- [x] T008 [P] [US1] Composants partagés — `src/RentalCard.tsx`, `src/ReportModal.tsx`, `src/InspectionView.tsx` (FR-001)
- [x] T009 [US1] Poser `accessibilityLabel` sur tous les boutons sans texte visible (retour, fermer, supprimer une photo, carte, notifications) — et uniquement sur ceux-là, pour éviter la double annonce (FR-002, FR-003)
- [x] T010 [US1] Poser `accessibilityState={{ disabled }}` sur les éléments désactivables (validation de constat, envoi de code) (FR-004)
- [x] T011 [US1] Distinguer les actions répétées : intitulé contextualisé sur les boutons de carte (« Réserver le VTT électrique Trek » plutôt que « Réserver ») (FR-002, cas limite « même intitulé »)
- [x] T012 [US1] Images : description sur les photos d'annonces et vignettes de constat, neutralisation des images décoratives (FR-009)

**Checkpoint** : l'application est utilisable au lecteur d'écran de bout en bout.

---

## Phase 3 : Parcours clavier (US3)

- [x] T013 [US3] Trancher le conflit entre l'interdit projet « jamais d'outline » et FR-011 : proposer un indicateur de focus alternatif (bordure ou fond au `:focus-visible` clavier uniquement, jamais au clic souris)
- [x] T014 [US3] Vérifier que les écrans masqués (onglets conservés montés) sont exclus du parcours clavier (FR-012)
- [x] T015 [US3] Vérifier que l'ordre de tabulation suit l'ordre de lecture visuelle sur les écrans principaux (FR-010)

---

## Phase 4 : Vérification

- [x] T016 Mesure sur le rendu : compter les éléments focusables sans rôle ni nom, viser 0 (SC-001)
- [x] T017 [P] Étendre `frontend/e2e/locashare.spec.ts` : test de non-régression d'accessibilité sur un écran représentatif
- [x] T018 Parcours complet au clavier seul (explorer → réserver → constat) sans blocage (SC-003)
- [x] T019 `./run-e2e.sh` vert, aucune régression fonctionnelle (SC-006)
- [ ] T020 Mémoire projet mise à jour et commit avec le constat de vérification

---

## Dépendances et ordre d'exécution

- **Phase 1 (couleurs)** est totalement indépendante des autres : livrable seule.
- **Phase 2 (rôles)** est le cœur ; T005-T008 sont parallélisables entre eux (fichiers distincts), T009-T012 les suivent.
- **Phase 3** dépend de la Phase 2 (il faut des éléments correctement exposés pour juger de l'ordre).
- **Phase 4** clôt.

## Stratégie de livraison

1. **Phase 1** → arrêt et validation : gain immédiat et visible pour tous les utilisateurs.
2. **Phase 2** → l'application devient utilisable au lecteur d'écran : c'est le vrai MVP de cette spec.
3. **Phase 3** → confort clavier.
4. **Phase 4** à chaque incrément.

## Notes

- Règle d'or des intitulés : **jamais de `accessibilityLabel` sur un élément qui a déjà un texte visible** (double annonce).
- Porte de qualité constitutionnelle : mesure sur le rendu, E2E vert, parcours exécuté en réel, principes I à V relus.
