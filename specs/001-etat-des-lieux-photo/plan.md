# Implementation Plan: État des lieux photo à la remise et au retour

**Branch**: `001-etat-des-lieux-photo` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-etat-des-lieux-photo/spec.md`

## Summary

Transformer le stub d'état des lieux en preuve partagée réelle. Le serveur gère déjà le cycle de vie
(transitions de statut, passage en litige, notification de l'autre partie) ; il lui manque les
garde-fous de validation. Le client, lui, envoie aujourd'hui une coquille vide et n'offre aucune
interface : c'est là que se concentre l'essentiel du travail.

Approche : un écran de constat unique et réutilisable (remise / retour), alimenté par le sélecteur
d'images déjà employé pour les annonces, plus une vue de consultation accessible aux deux parties.

## Technical Context

**Langages / versions** : TypeScript (React Native via Expo Router SDK 54), Python 3.9 (FastAPI)
**Dépendances principales** : `expo-image-picker ~17.0.11` (déjà installé, aucun ajout nécessaire), Motor/MongoDB
**Stockage** : photos encodées en base64 (data URI) dans le document d'état des lieux — strictement le même mécanisme que les photos d'annonces (`create.tsx`), conformément à l'hypothèse de la spec et au principe V
**Tests** : Playwright E2E (`./run-e2e.sh`), navigateur Chrome installé
**Plateforme cible** : web (export Expo) aujourd'hui, iOS/Android via le même code demain
**Type de projet** : Mobile + API
**Contraintes de performance** : constat complété en < 90 s sur le terrain (SC-002) ; charge utile bornée pour rester envoyable en réseau mobile dégradé (FR-011)
**Échelle** : 1 à 5 photos par constat, 2 constats par réservation, 2 auteurs possibles

### Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Capture photo | `expo-image-picker`, qualité 0.4, `base64: true` | Déjà utilisé et éprouvé dans le projet ; qualité abaissée (0.4 contre 0.5 pour les annonces) car jusqu'à 5 images cumulées |
| Limite de charge | 5 photos max, ~1,5 Mo cumulés après encodage | Reste très en deçà de la limite de document MongoDB (16 Mo) et envoyable en 4G médiocre |
| Emplacement de l'UI | Écran dédié `booking/[id]/constat` avec paramètre de nature (remise/retour) | Un seul écran pour les deux natures : moins de code, comportement identique garanti |
| Consultation | Section dans le détail de réservation, visible des deux côtés | Évite un écran de plus (principe III) |
| Contribution du propriétaire (P3) | Réutilise le même écran, l'auteur étant déduit du compte connecté | Le serveur accepte déjà n'importe quel participant de la réservation |

## Constitution Check

| Principe | Vérification | Verdict |
|---|---|---|
| I. Confiance avant fonctionnalité | La fonctionnalité *est* la réponse au « que se passe-t-il si ça se passe mal ? ». Symétrie assurée : les deux parties consultent tout, personne ne peut modifier après coup (FR-006). | ✅ |
| II. Zéro commission | Aucun flux monétaire introduit. Parcours réalisable sans moyen de paiement (SC-005). | ✅ |
| III. Friction minimale | Deux étapes obligatoires ajoutées sur un parcours critique. Exception assumée et justifiée par SC-001/SC-004, comme le permet le principe. Mitigation : écran unique, photo depuis la galerie ou l'appareil, moins de 90 s visées. | ⚠️ Exception documentée |
| IV. Vérifié en réel | Chaque histoire est indépendamment testable ; extension de la suite E2E prévue en phase finale, exécution réelle du parcours avant annonce. | ✅ |
| V. Local et simple | Zéro dépendance ajoutée. Réutilisation du sélecteur d'images et du thème existants. Pas d'abstraction prématurée : un seul écran paramétré plutôt que deux composants. | ✅ |

**Aucune violation bloquante.** L'exception au principe III est explicitement prévue par sa propre clause (« justifiée par un gain de confiance mesurable »).

## Project Structure

### Documentation (this feature)

```
specs/001-etat-des-lieux-photo/
├── spec.md      # Spécification fonctionnelle
├── plan.md      # Ce document
└── tasks.md     # Tâches (généré à l'étape suivante)
```

### Source Code (repository root)

```
backend/
└── server.py                      # Garde-fous de validation à ajouter (FR-001,002,004,007,011)

frontend/
├── app/
│   ├── booking/
│   │   └── constat.tsx            # NOUVEAU — écran de constat (photos + état + note)
│   ├── (tabs)/
│   │   ├── bookings.tsx           # Remplace l'appel stub par la navigation vers le constat
│   │   └── myitems.tsx            # Accès propriétaire aux constats (P3)
│   └── listing/[id].tsx           # (inchangé)
├── src/
│   └── InspectionView.tsx         # NOUVEAU — affichage lecture seule d'un constat
└── e2e/
    └── locashare.spec.ts          # Nouveaux tests : remise obligatoire, retour avec problème
```

## Phasage

**Phase 1 — Garde-fous serveur (P1 partiel)**
Ajouter les validations manquantes au point d'entrée existant : refus si aucune photo, note
obligatoire hors état conforme, plafond de 5 photos et de charge utile, rejet d'un doublon de même
nature par le même auteur. Ces règles doivent être testables directement par appel d'API.

**Phase 2 — Écran de constat (P1 puis P2)**
Créer l'écran unique paramétré par la nature du constat : ajout de photos (appareil ou galerie,
avec repli si l'accès à l'appareil est refusé), sélecteur d'état à trois niveaux (masqué à la
remise, où l'état est implicitement conforme), champ de note, et avertissement explicite sur le
caractère définitif avant validation. Brancher depuis l'écran des réservations à la place de
l'appel direct actuel.

**Phase 3 — Consultation partagée (P2 fin, P3)**
Afficher les constats existants dans le détail d'une réservation, des deux côtés, avec auteur,
horodatage, photos et qualification. Ouvrir l'accès propriétaire depuis « Mes biens ».

**Phase 4 — Vérification**
Étendre la suite E2E : validation refusée sans photo, note exigée quand un problème est déclaré,
constat consultable par l'autre partie. Exécution réelle du parcours complet avant de considérer
la fonctionnalité livrée (porte de qualité constitutionnelle).

## Complexity Tracking

| Point de complexité | Pourquoi c'est nécessaire | Alternative écartée |
|---|---|---|
| Photos en base64 dans le document | Cohérence avec l'existant, zéro infrastructure nouvelle | Stockage objet externe (S3/Cloudinary) : introduit une dépendance et un coût pour un volume encore nul |
| Écran paramétré plutôt que deux écrans | Garantit un comportement identique remise/retour | Deux composants distincts : duplication et risque de divergence |

## Risques identifiés

- **Poids des photos** : cinq images base64 peuvent alourdir la réponse de lecture d'une réservation. Mitigation : qualité 0.4 et plafond ; à surveiller si le nombre de constats par écran augmente.
- **Ordre des constats** : le serveur impose déjà remise avant retour via les statuts ; l'interface doit refléter cette contrainte plutôt que la laisser échouer côté serveur.
- **Réseau dégradé sur le terrain** : un envoi peut échouer après capture. L'écran doit conserver les photos saisies et permettre une nouvelle tentative sans tout recommencer.
