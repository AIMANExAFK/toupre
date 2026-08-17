# Implementation Plan: Accessibilité — conformité WCAG 2.2 niveau AA

**Branch**: `002-accessibilite-aa` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-accessibilite-aa/spec.md`

## Summary

Deux chantiers indépendants, tous deux mécaniques : exposer un rôle et un intitulé sur les
95 éléments actionnables de l'application, et corriger les cinq couleurs de la charte qui
échouent au seuil AA. Aucun changement de parcours, aucune dépendance nouvelle.

Le point clé : React Native traduit déjà `accessibilityRole` / `accessibilityLabel` /
`accessibilityState` vers `role` / `aria-label` / `aria-disabled` sur le web, et vers les API
natives d'accessibilité sur iOS et Android. Un seul jeu de correctifs sert donc les trois cibles.

## Technical Context

**Langages / versions** : TypeScript (React Native via Expo Router SDK 54)
**Dépendances** : aucune ajoutée — les attributs d'accessibilité font partie du cœur de React Native
**Stockage** : sans objet
**Tests** : Playwright E2E (`./run-e2e.sh`) pour la vérification sur le rendu ; script de mesure de contraste du skill `a11y-audit`
**Plateforme cible** : rendu web aujourd'hui, iOS/Android via le même code
**Type de projet** : Mobile + API (seul le frontend est touché)
**Contraintes** : ne pas modifier les parcours (SC-006), ne pas changer les teintes (FR-007)
**Échelle** : 95 éléments actionnables, 24 fichiers, 5 couleurs, 10 images

### Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Rôle et intitulé | Attributs `accessibilityRole="button"` + `accessibilityLabel` posés sur les composants existants | Traduits nativement en `role`/`aria-label` sur le web et en API natives sur mobile : un seul correctif, trois plateformes |
| Intitulé implicite | Ne poser `accessibilityLabel` que sur les éléments sans texte visible | Un intitulé redondant avec le texte visible est annoncé deux fois — nuisible |
| État indisponible | `accessibilityState={{ disabled: … }}` en complément de `disabled` | `disabled` seul ne suffit pas à annoncer l'état sur toutes les plateformes |
| Couleurs | Assombrissement à teinte et saturation constantes jusqu'au seuil AA | Respecte FR-007 : la marque reste reconnaissable, seule la luminosité bouge |
| Corail unique | `#CE4221` pour le corail porteur de texte et de fond de bouton | Un seul jeton satisfait les deux usages (blanc dessus 4.75:1, corail en texte sur crème 4.51:1) — évite de multiplier les variantes |
| Corail décoratif | `#E2674A` conservé pour teintes, halos et bordures | Ces usages passent déjà le seuil 3:1 des éléments d'interface ; garder la teinte d'origine préserve la douceur de l'identité |
| Images | `alt` descriptif sur les photos d'annonces, `alt=""` sur le décoratif | Distinction imposée par FR-009 |

### Correspondance des couleurs

| Jeton | Avant | Rapport | Après | Rapport | Usage |
|---|---|---|---|---|---|
| `primary` | `#E2674A` | 3.35:1 (blanc dessus) | `#CE4221` | 4.75:1 | fonds de boutons, texte corail |
| `textTertiary` | `#9C8D83` | 3.05:1 | `#807066` | 4.51:1 | mentions, compteurs, indices |
| `success` | `#1D9E75` | 3.22:1 | `#188261` | 4.53:1 | états positifs |
| `warning` | `#C87913` | 3.04:1 | `#9F600F` | 4.53:1 | avertissements |
| `primaryLight` | `#F08A6C` | — | inchangé | — | décoratif uniquement |

Le mode sombre sera mesuré de la même façon et corrigé s'il échoue.

## Constitution Check

| Principe | Vérification | Verdict |
|---|---|---|
| I. Confiance avant fonctionnalité | Une application inutilisable par une partie des usagers ne peut pas revendiquer la confiance. Les signaux de confiance existants (contact vérifié, avis, constats) deviennent perceptibles par tous. | ✅ |
| II. Zéro commission | Aucun impact. | ✅ |
| III. Friction minimale | Aucune étape ajoutée ; SC-006 verrouille l'absence de changement de parcours. Les attributs sont invisibles pour qui n'utilise pas d'aide technique. | ✅ |
| IV. Vérifié en réel | SC-001 impose une mesure sur le rendu réel, pas une revue de code. Extension E2E prévue. | ✅ |
| V. Local et simple | Zéro dépendance. Attributs ajoutés sur les composants existants, aucune refonte, aucune abstraction nouvelle. | ✅ |

**Aucune violation.** Le seul effet visible pour les utilisateurs voyants est un corail
légèrement plus profond — conséquence assumée et nécessaire du principe I.

## Project Structure

### Documentation (this feature)

```
specs/002-accessibilite-aa/
├── spec.md
├── plan.md                      # Ce document
├── tasks.md                     # Généré à l'étape suivante
└── checklists/requirements.md   # Validation de la spec
```

### Source Code (repository root)

```
frontend/
├── src/
│   ├── theme.tsx                # Couleurs AA (les 5 jetons)
│   ├── Glass.tsx                # Déjà porteur de testID ; rien à changer
│   ├── RentalCard.tsx           # Cartes d'annonce : boutons + image d'objet
│   ├── InspectionView.tsx       # Vignettes de constat (images informatives)
│   └── Brand.tsx                # Logo : image décorative
├── app/
│   ├── (tabs)/*.tsx             # Explorer, Locations, Mes biens, Profil, Créer
│   ├── booking/*.tsx            # Réservation, constat, constats
│   ├── listing/[id].tsx         # Fiche annonce
│   ├── auth/otp.tsx             # Connexion
│   └── …                        # 24 fichiers au total
└── e2e/locashare.spec.ts        # Test de non-régression d'accessibilité
```

## Phasage

**Phase 1 — Couleurs (US2, indépendante)**
Corriger les cinq jetons dans le thème, vérifier par mesure que tous les couples passent le seuil,
contrôler visuellement que l'identité reste reconnaissable. Aucun autre fichier touché.

**Phase 2 — Rôles et intitulés (US1, le cœur)**
Parcourir les 24 fichiers, poser `accessibilityRole` sur chaque élément actionnable et
`accessibilityLabel` sur ceux qui n'ont pas de texte visible. Poser `accessibilityState` sur les
éléments désactivables. Décrire les images informatives, neutraliser les décoratives.

**Phase 3 — Parcours clavier (US3)**
Vérifier l'ordre de tabulation, la visibilité du focus et l'exclusion des écrans masqués.
Le projet interdit historiquement les contours de focus (`outline: none` global) : il faudra un
indicateur de remplacement, sinon FR-011 est irréalisable — c'est le seul point du plan qui touche
à une règle existante du projet.

**Phase 4 — Vérification**
Mesure sur le rendu (comptage rôles/intitulés), extension E2E, exécution réelle d'un parcours au
clavier seul.

## Complexity Tracking

| Point | Pourquoi c'est nécessaire | Alternative écartée |
|---|---|---|
| Toucher 24 fichiers | Les éléments actionnables sont disséminés ; il n'existe pas de composant bouton central | Créer un composant `Button` partagé et tout migrer : refonte massive, risque de régression visuelle, contraire au principe V (pas d'abstraction avant nécessité) |
| Corail assombri | Seul moyen d'atteindre AA sans changer de teinte | Garder `#E2674A` et grossir le texte des boutons pour bénéficier du seuil « grand texte » : dégrade le design et ne résout pas le corail en texte courant |

## Risques identifiés

- **Conflit avec l'interdit des contours de focus** : la règle projet « jamais d'outline » a été posée pour des raisons esthétiques ; FR-011 impose un indicateur visible. À trancher en Phase 3 (indicateur alternatif : fond ou bordure au focus clavier uniquement, via `:focus-visible`).
- **Intitulés redondants** : poser un `accessibilityLabel` sur un bouton qui a déjà un texte visible provoque une double annonce. Règle retenue : intitulé seulement si aucun texte visible.
- **Ampleur mécanique** : 95 modifications ponctuelles ; risque d'oubli plutôt que de casse. Mitigation : mesure automatisée sur le rendu en Phase 4, qui compte ce qui manque.
- ~~**Mode sombre** : les couleurs sombres n'ont pas encore été mesurées.~~ **Levé** : mesuré le 2026-08-17, les 8 couples du mode sombre passent AA (de 5.69:1 à 16.60:1). Seul le mode crème est à corriger.
