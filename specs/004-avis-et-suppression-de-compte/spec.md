# Feature Specification: Laisser un avis et supprimer son compte

**Feature Branch**: `004-avis-et-suppression-de-compte`
**Created**: 2026-08-17
**Status**: Draft

**Input**: Deux manques constatés. Les avis existent côté serveur et s'affichent, mais aucun écran ne permet d'en écrire un : les seuls avis visibles sont ceux des données de démonstration. Et il est impossible de supprimer son compte, ce qu'exigent à la fois la réglementation sur les données personnelles et les magasins d'applications.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Noter une location terminée (Priority: P1)

Après avoir rendu un objet, le locataire est invité à noter l'expérience : une note de une à
cinq étoiles et un commentaire libre. Son avis apparaît ensuite sur l'annonce, sous son nom, et
alimente la note moyenne visible par tous.

**Why this priority**: Les avis sont un pilier de la confiance annoncée par le produit. Aujourd'hui
la note affichée sur chaque annonce ne peut jamais évoluer, puisque personne ne peut en déposer :
la promesse « propriétaire vérifié, avis de la communauté » est décorative.

**Independent Test**: Terminer une location, déposer un avis, et le retrouver sur l'annonce avec
la note moyenne recalculée.

**Acceptance Scenarios**:

1. **Given** une location terminée non encore notée, **When** le locataire ouvre ses locations, **Then** une invitation à noter lui est proposée.
2. **Given** l'écran de notation, **When** le locataire choisit une note et valide, **Then** son avis est publié sur l'annonce et la note moyenne est mise à jour.
3. **Given** un avis déjà déposé pour cette location, **When** le locataire revient, **Then** aucune nouvelle invitation ne lui est proposée.
4. **Given** une location non terminée, **When** le locataire tente de noter, **Then** la notation est refusée.

---

### User Story 2 - Supprimer son compte (Priority: P1)

Une personne demande la suppression de son compte depuis les réglages. Elle est informée de ce qui
sera effacé et de ce qui sera conservé, doit confirmer explicitement, puis son compte devient
inutilisable : ses annonces disparaissent, son identité n'apparaît plus nulle part, et toutes ses
sessions sont fermées.

**Why this priority**: Obligation réglementaire sur les données personnelles, et condition posée
par les magasins d'applications à toute application permettant de créer un compte. Sans cela,
l'application ne peut pas être publiée. Même priorité que l'histoire 1, pour une raison différente :
l'une débloque la confiance, l'autre débloque la publication.

**Independent Test**: Supprimer un compte, puis vérifier qu'aucune de ses données identifiantes
n'est accessible et que ses jetons ne fonctionnent plus.

**Acceptance Scenarios**:

1. **Given** les réglages, **When** l'utilisateur demande la suppression, **Then** il voit clairement ce qui sera effacé et ce qui sera conservé, et doit confirmer.
2. **Given** la confirmation donnée, **When** la suppression s'exécute, **Then** ses annonces ne sont plus visibles et son nom n'apparaît plus dans l'application.
3. **Given** un compte supprimé, **When** on présente un de ses anciens jetons, **Then** l'accès est refusé.
4. **Given** un compte supprimé ayant participé à des locations, **When** l'autre partie consulte son historique, **Then** la location reste consultable, sans identité rattachée.
5. **Given** une location en cours, **When** l'utilisateur demande la suppression, **Then** elle est refusée tant que l'engagement n'est pas terminé.

---

### Edge Cases

- Que se passe-t-il pour les avis écrits par une personne supprimée ? Ils restent affichés mais sans identité, car les retirer fausserait la note des annonces d'autrui.
- Que se passe-t-il pour les états des lieux d'une personne supprimée ? Ils restent, car ils sont la preuve partagée d'une location à laquelle une autre personne était partie.
- Que se passe-t-il si l'utilisateur note avec zéro étoile ? La validation est refusée : une note doit être choisie.
- Que se passe-t-il si la même adresse se réinscrit après suppression ? Un nouveau compte est créé, sans lien avec l'ancien.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST proposer de noter chaque location terminée non encore notée.
- **FR-002**: Un avis MUST comporter une note de 1 à 5 et peut comporter un commentaire libre.
- **FR-003**: Le système MUST refuser un avis pour une location non terminée ou déjà notée.
- **FR-004**: La note moyenne d'une annonce MUST refléter immédiatement les avis déposés.
- **FR-005**: Le commentaire libre MUST être soumis au même filtrage que les autres textes libres.
- **FR-006**: Le système MUST permettre à une personne de demander la suppression de son compte depuis l'application.
- **FR-007**: Le système MUST exposer, avant confirmation, ce qui sera effacé et ce qui sera conservé.
- **FR-008**: La suppression MUST retirer les annonces de la personne et rendre son identité non consultable.
- **FR-009**: La suppression MUST fermer toutes ses sessions et invalider ses accès.
- **FR-010**: La suppression MUST préserver les traces nécessaires à l'autre partie d'une location (réservations, constats, avis), sans identité rattachée.
- **FR-011**: Le système MUST refuser la suppression tant qu'une location est en cours.

### Key Entities

- **Avis** : note de 1 à 5 et commentaire, rattachés à une annonce, un auteur et une location. Un auteur ne dépose qu'un avis par annonce.
- **Compte supprimé** : compte dont les données identifiantes ont été retirées, qui ne peut plus être utilisé, mais dont les engagements passés restent consultables par les autres parties.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un locataire peut déposer un avis en moins de 30 secondes après une location terminée.
- **SC-002**: La note affichée sur une annonce évolue après dépôt d'un avis (aujourd'hui : jamais).
- **SC-003**: Après suppression, aucune donnée identifiante du compte n'est accessible dans l'application.
- **SC-004**: Après suppression, 100 % des jetons de ce compte sont refusés.
- **SC-005**: Après suppression, les locations auxquelles la personne a participé restent consultables par l'autre partie.

## Assumptions

- La suppression procède par anonymisation plutôt que par effacement total : les réservations et constats engagent deux parties, et les effacer priverait l'autre de ses propres preuves. C'est l'approche admise lorsqu'un intérêt légitime justifie la conservation.
- Le filtrage de contenu déjà porté pour les signalements est réutilisé pour les commentaires d'avis.
- Les avis portent sur l'annonce, comme le prévoit le modèle existant, et non sur la personne.
- L'export des données personnelles n'est pas couvert ici : il fera l'objet d'un traitement distinct.
