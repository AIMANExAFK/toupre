# Feature Specification: Accessibilité — conformité WCAG 2.2 niveau AA

**Feature Branch**: `002-accessibilite-aa`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Accessibilité WCAG 2.2 niveau AA. Constat mesuré : 95 éléments interactifs sur 24 fichiers n'exposent aucun rôle accessible ; 5 couleurs de la palette échouent au contraste AA, dont le texte blanc sur le bouton principal. Objectif : application utilisable au clavier et au lecteur d'écran, conforme AA sur le contraste, sans changer l'identité visuelle ni les parcours."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Une personne aveugle loue un objet au lecteur d'écran (Priority: P1)

Une personne qui n'utilise pas la vue parcourt l'application avec un lecteur d'écran. Chaque
élément sur lequel elle peut agir lui est annoncé comme actionnable, avec un intitulé qui décrit
ce qu'il fait. Elle peut ainsi explorer les annonces, en ouvrir une, demander une réservation et
valider un état des lieux sans jamais rester bloquée devant un élément muet.

**Why this priority**: Aujourd'hui, 29 des 34 éléments actionnables d'un écran typique sont
annoncés comme du contenu inerte. L'application est donc inutilisable au lecteur d'écran — ce n'est
pas une gêne, c'est une exclusion totale. C'est aussi la condition d'entrée sur les stores, qui
contrôlent l'accessibilité.

**Independent Test**: Parcourir un écran à la navigation clavier seule : chaque arrêt du focus doit
correspondre à un élément annoncé avec un rôle et un intitulé compréhensibles hors contexte visuel.

**Acceptance Scenarios**:

1. **Given** un écran comportant des actions, **When** l'utilisateur atteint un élément actionnable, **Then** cet élément est annoncé comme bouton (ou lien) et porte un intitulé décrivant son effet.
2. **Given** un bouton composé uniquement d'une icône, **When** il reçoit le focus, **Then** un intitulé textuel explicite est annoncé (jamais « bouton » seul ni le nom de l'icône).
3. **Given** un bouton indisponible, **When** il reçoit le focus, **Then** son état indisponible est annoncé, et la raison du blocage est perceptible autrement que par la couleur.

---

### User Story 2 - Une personne malvoyante lit tous les textes de l'application (Priority: P2)

Une personne ayant une vision réduite, ou lisant en plein soleil, distingue tous les textes de
l'application, y compris les libellés de boutons, les mentions secondaires, les compteurs et les
messages d'état.

**Why this priority**: Cinq couleurs échouent au seuil AA, dont le libellé blanc du bouton d'action
principal. C'est une gêne quotidienne pour beaucoup d'utilisateurs, mais l'application reste
utilisable — d'où la priorité 2 derrière l'exclusion totale de l'histoire 1.

**Independent Test**: Mesurer le rapport de contraste de chaque couple texte/fond de la charte :
tous doivent atteindre au moins 4.5:1 pour le texte courant, 3:1 pour les éléments d'interface.

**Acceptance Scenarios**:

1. **Given** n'importe quel texte de l'application, **When** on mesure son contraste avec son fond, **Then** le rapport atteint au minimum 4.5:1 (3:1 pour les grands textes).
2. **Given** un élément d'interface non textuel porteur de sens (bordure d'état, icône d'alerte), **When** on mesure son contraste, **Then** le rapport atteint au minimum 3:1.
3. **Given** la charte modifiée, **When** on compare à l'identité de marque, **Then** la teinte reste celle de la marque : seule la luminosité est ajustée.

---

### User Story 3 - Une personne navigue et comprend la structure sans souris (Priority: P3)

Une personne qui utilise exclusivement le clavier atteint toutes les fonctions dans un ordre
logique, voit en permanence où se trouve le focus, et peut atteindre directement le contenu
principal sans traverser toute la navigation.

**Why this priority**: Complète l'expérience clavier. Sans cela, l'application reste utilisable
mais pénible ; les histoires 1 et 2 traitent d'abord ce qui exclut ou empêche de lire.

**Independent Test**: Traverser un écran entier à la touche de tabulation : l'ordre suit la lecture
visuelle, l'indicateur de focus est visible à chaque étape, aucun piège au clavier.

**Acceptance Scenarios**:

1. **Given** un écran quelconque, **When** l'utilisateur parcourt les éléments au clavier, **Then** l'ordre de parcours suit l'ordre de lecture visuelle.
2. **Given** un élément qui reçoit le focus, **When** il est atteint au clavier, **Then** un indicateur de focus est visible et distinguable du fond.
3. **Given** un écran ouvert, **When** l'utilisateur demande à atteindre le contenu, **Then** il peut court-circuiter la navigation répétitive.

---

### Edge Cases

- Que se passe-t-il pour un bouton dont l'intitulé visible est une simple icône (retour, fermer, supprimer une photo) ? Il doit porter un intitulé textuel non visible mais annoncé.
- Que se passe-t-il pour un élément désactivé dont le libellé change pour expliquer le blocage ? L'annonce doit refléter à la fois l'état et la raison.
- Que se passe-t-il pour une image d'annonce ? Elle porte du sens (l'objet loué) et doit être décrite ; une image purement décorative doit au contraire être ignorée par le lecteur d'écran.
- Que se passe-t-il si un même intitulé apparaît plusieurs fois à l'écran (« Réserver » sur chaque carte) ? L'annonce doit permettre de savoir de quelle annonce il s'agit.
- Que se passe-t-il sur les écrans montés mais masqués (onglets conservés en mémoire) ? Leurs éléments ne doivent pas être atteignables au clavier.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tout élément actionnable MUST exposer un rôle qui le désigne comme actionnable (bouton, lien, onglet selon sa nature).
- **FR-002**: Tout élément actionnable MUST exposer un intitulé accessible décrivant son effet, compréhensible hors de son contexte visuel.
- **FR-003**: Un élément actionnable sans texte visible (icône seule) MUST porter un intitulé textuel dédié.
- **FR-004**: Un élément actionnable indisponible MUST exposer son état indisponible.
- **FR-005**: Tout texte MUST atteindre un rapport de contraste d'au moins 4.5:1 avec son fond (3:1 pour les grands textes).
- **FR-006**: Tout élément d'interface non textuel porteur de sens MUST atteindre un rapport d'au moins 3:1.
- **FR-007**: Les ajustements de couleur MUST conserver la teinte de la marque ; seule la luminosité peut varier.
- **FR-008**: Une information MUST rester perceptible sans recourir à la couleur seule (texte, icône ou libellé complémentaire).
- **FR-009**: Les images porteuses de sens MUST avoir une description textuelle ; les images décoratives MUST être ignorées par les technologies d'assistance.
- **FR-010**: L'ordre de parcours au clavier MUST suivre l'ordre de lecture visuelle.
- **FR-011**: L'élément qui détient le focus MUST être visuellement identifiable.
- **FR-012**: Les éléments des écrans masqués MUST être exclus du parcours clavier.

### Key Entities

- **Élément actionnable** : tout composant déclenchant une action au clic ou à la touche. Porte un rôle, un intitulé accessible, et éventuellement un état (indisponible, sélectionné).
- **Couple de couleurs** : association d'une couleur de premier plan et d'un fond, caractérisée par un rapport de contraste devant satisfaire un seuil selon la nature (texte courant, grand texte, élément d'interface).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des éléments actionnables exposent un rôle et un intitulé accessible (mesuré sur le rendu, pas sur le code source).
- **SC-002**: 100 % des couples texte/fond de la charte atteignent le seuil AA applicable.
- **SC-003**: Un parcours de location complet (explorer → réserver → constat) est réalisable au clavier seul, sans blocage.
- **SC-004**: Aucune information n'est transmise par la couleur seule.
- **SC-005**: L'identité visuelle reste reconnaissable : aucune teinte de la charte n'est remplacée par une autre.
- **SC-006**: Les parcours existants restent inchangés — aucun écran, étape ou libellé fonctionnel n'est supprimé ni réordonné.

## Assumptions

- La cible de conformité est WCAG 2.2 niveau AA, standard attendu par les magasins d'applications et la réglementation française pour les services numériques.
- L'audit et la vérification portent sur le rendu web de l'application, qui partage son code avec les futures versions mobiles : les correctifs bénéficient donc aux deux.
- Les correctifs sont mécaniques et n'introduisent aucun changement de comportement fonctionnel ; ils s'ajoutent aux éléments existants sans les remplacer.
- Les seuils retenus sont ceux du niveau AA : 4.5:1 pour le texte courant, 3:1 pour les grands textes et les éléments d'interface.
- Le mode sombre suit la même exigence que le mode clair et sera vérifié avec les mêmes mesures.
- L'audit ne couvre pas les contenus produits par les utilisateurs (photos d'annonces, notes) au-delà de leur description : la qualité de ce que les utilisateurs saisissent ne peut pas être garantie par l'application.

## Alignement constitutionnel

- **Principe I (confiance avant fonctionnalité)** : une application inutilisable par une partie des usagers ne peut pas prétendre être « de confiance ». La conformité élargit l'accès aux signaux de confiance déjà en place.
- **Principe II (zéro commission)** : aucun impact.
- **Principe III (friction minimale)** : aucune étape ajoutée ; SC-006 garantit que les parcours restent identiques.
- **Principe IV (vérifié en réel)** : SC-001 impose une mesure sur le rendu, pas une revue de code ; couverture E2E attendue.
- **Principe V (local et simple)** : correctifs par attributs sur les composants existants, sans dépendance ni refonte.
