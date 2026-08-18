# Tâches

## Phase 1 — Recherche côté serveur (US1)

- [x] T001 [US1] Étendre `GET /listings` : `$or` titre/description/adresse, insensible aux accents (FR-001)
- [x] T002 [US1] Filtres `min_price`/`max_price` et tri `sort` (FR-002, FR-003)
- [x] T003 [US1] Brancher l'écran Explorer sur le serveur avec anti-rebond (FR-004)
- [x] T004 [US1] Barre de filtres : prix et tri, repliable

## Phase 2 — Calendrier (US2, US3)

- [x] T005 [US2] Composant `src/Calendrier.tsx` (grille mensuelle, jours indisponibles, passés exclus) (FR-005, FR-006)
- [x] T006 [US2] Intégrer au parcours de réservation à la place des deux sélecteurs de date
- [x] T007 [US3] Écran `app/listing/disponibilites.tsx` pour bloquer/débloquer (FR-007)
- [x] T008 [US3] Entrée depuis « Mes objets »

## Phase 3 — Modifier une annonce (US4)

- [x] T009 [US4] Écran `app/listing/edit.tsx` (FR-008)
- [x] T010 [US4] Entrée depuis « Mes objets », envoi partiel

## Phase 4 — Filtre de contenu (US5)

- [x] T011 [US5] Appliquer `check_content` aux annonces et aux messages (FR-010)
- [x] T012 [US5] Resserrer les motifs pour éviter les faux positifs, vérifier sur cas réels

## Phase 5 — Vérification

- [x] T013 Tests E2E : recherche par description, jour indisponible non sélectionnable, modification de prix
- [x] T014 `./run-e2e.sh` vert (SC-006)
- [x] T015 Mémoire projet mise à jour et commit

## Constat de vérification (2026-08-18)

- Recherche : 10 requêtes réelles (description seule, accents dans les deux sens,
  adresse, bornes de prix, tris, combinaison catégorie+mot, résultat vide) — toutes conformes.
- Filtre de contenu : 17 cas de motifs (dont 10 outils au nom ambigu) + 11 appels
  API réels sur annonces, modifications et messages — 0 faux positif, 0 faux négatif.
- Calendrier : vérifié dans le navigateur — jours passés et pris barrés et inertes,
  plage 23→26 août sélectionnée, plage enjambant un jour pris refusée et
  redémarrée, fermeture d'un jour par le propriétaire persistée puis rendue
  non réservable côté locataire.
- Modification : prix 45 € → 48 €, 2 avis et note 4.5 conservés.
- `./run-e2e.sh` : **13 tests, 13 passés** (4 nouveaux).
